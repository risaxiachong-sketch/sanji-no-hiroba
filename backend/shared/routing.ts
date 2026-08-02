import type { APIGatewayProxyEventV2 } from 'aws-lambda';

type CompatibleEvent = APIGatewayProxyEventV2 & {
  httpMethod?: string;
  resource?: string;
};

export function routeKey(event: APIGatewayProxyEventV2): string {
  const compatible = event as CompatibleEvent;
  if (event.routeKey) return event.routeKey;
  const method = event.requestContext?.http?.method ?? compatible.httpMethod ?? '';
  const path = compatible.resource ?? event.requestContext?.http?.path ?? event.rawPath ?? '';
  return `${method} ${path}`;
}

export function header(event: APIGatewayProxyEventV2, name: string): string | undefined {
  const target = name.toLowerCase();
  const entry = Object.entries(event.headers ?? {}).find(([key]) => key.toLowerCase() === target);
  return entry?.[1];
}
