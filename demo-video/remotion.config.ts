import { Config } from '@remotion/cli/config'

Config.setCodec('h264')
Config.setPixelFormat('yuv420p')
// Without an explicit colour space the JPEG frame pipeline is tagged yuvj420p.
Config.setColorSpace('bt709')
Config.setCrf(18)
Config.setVideoImageFormat('jpeg')
Config.setJpegQuality(92)
// The take carries the app's own sound effects. Config.setMuted(false) is not
// honoured by the CLI here, so scripts/render.ts passes --muted=false instead.
Config.setOverwriteOutput(true)
Config.setDelayRenderTimeoutInMilliseconds(60_000)
