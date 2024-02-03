import type { WebConfig } from '../server/config'

declare const window: Window & {
  __CONFIG__?: WebConfig
}

export const config = window.__CONFIG__
