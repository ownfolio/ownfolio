import 'normalize.css'

import { css } from '@linaria/core'
import React from 'react'
import ReactDOM from 'react-dom/client'

import { rpcClient } from './api'
import { App } from './App'

declare const window: Window & {
  __RPC_CLIENT__?: typeof rpcClient
}

window.__RPC_CLIENT__ = rpcClient

const root = ReactDOM.createRoot(document.getElementById('root')!)
root.render(<App />)

css`
  :global() {
    html {
      margin: 0;
      padding: 0;
      overflow: hidden;
      overscroll-behavior: none;
    }

    body {
      position: absolute;
      left: 0;
      top: 0;
      width: 100vw;
      height: 100vh;
      overflow: hidden;
      --safe-area-inset-top: 0px;
      --safe-area-inset-top: env(safe-area-inset-top);
      --safe-area-inset-bottom: 0px;
      --safe-area-inset-bottom: env(safe-area-inset-bottom);
      --safe-area-inset-left: 0px;
      --safe-area-inset-left: env(safe-area-inset-left);
      --safe-area-inset-right: 0px;
      --safe-area-inset-right: env(safe-area-inset-right);
    }

    html {
      --color-primary: #c2185b;
      --color-primary-lite: #fa5788;
      --color-primary-dark: #8c0032;

      --color-secondary: #5c6bc0;
      --color-secondary-lite: #8e99f3;
      --color-secondary-dark: #26418f;

      --color-neutral: #f5f5f6;
      --color-neutral-lite: #ffffff;
      --color-neutral-dark: #e1e2e1;
      --color-neutral-darker: #bfbfbf;

      --color-text: #1f2421;
      --color-text-on-primary: #ffffff;
      --color-text-on-secondary: #ffffff;
      --color-text-on-neutral: #1f2421;
      --color-text-lite: #bfbfbf;

      --color-info: #0097ff;
      --color-info-lite: #b3e0ff;

      --color-warning: #e09512;
      --color-warning-lite: #f9ebc3;

      --color-error: #ec5a31;
      --color-error-lite: #fbd3c7;

      --color-positive: #26a69a;
      --color-negative: #ef524f;

      --spacing-small: 8px;
      --spacing-medium: 16px;
      --spacing-large: 24px;

      --border-radius-small: 3px;
      --border-radius-medium: 6px;
      --border-radius-large: 12px;

      color: var(--color-text);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen-Sans, Ubuntu, Cantarell,
        'Helvetica Neue', sans-serif;
    }

    @media (max-width: 700px) {
      html {
        --spacing-small: 4px;
        --spacing-medium: 8px;
        --spacing-large: 12px;
      }
    }

    body {
      background-color: var(--color-neutral);
      font-size: 16px;
    }

    a {
      text-decoration: none;
      color: var(--color-primary);
    }

    #root {
      display: grid;
      position: absolute;
      inset: 0;
    }

    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    p {
      margin: 0;
    }
  }
`
