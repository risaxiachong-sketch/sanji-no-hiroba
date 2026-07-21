#!/usr/bin/env python3
"""Call one BlenderMCP tool over the MCP stdio transport."""

from __future__ import annotations

import argparse
import json
import os
import selectors
import subprocess
import sys
import time
from pathlib import Path


MCP_COMMAND = Path.home() / ".local" / "bin" / "blender-mcp"


def send(process: subprocess.Popen[str], payload: dict[str, object]) -> None:
    assert process.stdin is not None
    process.stdin.write(json.dumps(payload, ensure_ascii=False) + "\n")
    process.stdin.flush()


def wait_for_response(
    process: subprocess.Popen[str], request_id: int, timeout: float
) -> dict[str, object]:
    assert process.stdout is not None
    selector = selectors.DefaultSelector()
    selector.register(process.stdout, selectors.EVENT_READ)
    deadline = time.time() + timeout

    while time.time() < deadline:
        for key, _ in selector.select(timeout=0.25):
            line = key.fileobj.readline()
            if not line:
                continue
            message = json.loads(line)
            if message.get("id") == request_id:
                return message

    raise TimeoutError(f"MCP request {request_id} timed out after {timeout}s")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("tool")
    parser.add_argument("--arguments", default="{}")
    parser.add_argument("--code-file")
    parser.add_argument("--code")
    parser.add_argument("--compact", action="store_true")
    parser.add_argument("--timeout", type=float, default=300.0)
    args = parser.parse_args()

    tool_arguments = json.loads(args.arguments)
    if args.code_file:
        source_path = Path(args.code_file).resolve()
        tool_arguments["code"] = (
            "source_path = "
            + repr(str(source_path))
            + "\nexec(compile(open(source_path, encoding='utf-8').read(), source_path, 'exec'))"
        )
    if args.code:
        tool_arguments["code"] = args.code

    environment = os.environ.copy()
    environment["DISABLE_TELEMETRY"] = "true"
    process = subprocess.Popen(
        [str(MCP_COMMAND)],
        stdin=subprocess.PIPE,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        bufsize=1,
        env=environment,
    )

    try:
        send(
            process,
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-03-26",
                    "capabilities": {},
                    "clientInfo": {"name": "codex-blender", "version": "1.0"},
                },
            },
        )
        initialize_response = wait_for_response(process, 1, 15)
        if "error" in initialize_response:
            raise RuntimeError(initialize_response["error"])

        send(process, {"jsonrpc": "2.0", "method": "notifications/initialized", "params": {}})
        send(
            process,
            {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/call",
                "params": {"name": args.tool, "arguments": tool_arguments},
            },
        )
        response = wait_for_response(process, 2, args.timeout)
        if args.compact:
            result = response.get("result")
            if isinstance(result, dict):
                for content in result.get("content", []):
                    if isinstance(content, dict) and isinstance(content.get("text"), str):
                        content["text"] = content["text"][-1600:]
                structured = result.get("structuredContent")
                if isinstance(structured, dict) and isinstance(structured.get("result"), str):
                    structured["result"] = structured["result"][-1600:]
        print(json.dumps(response, ensure_ascii=False, indent=2))
        return 1 if "error" in response else 0
    finally:
        process.terminate()
        try:
            process.wait(timeout=2)
        except subprocess.TimeoutExpired:
            process.kill()


if __name__ == "__main__":
    sys.exit(main())
