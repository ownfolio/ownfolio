import cookieParser from 'cookie-parser'
import express from 'express'

import { User } from '../../shared/models/User'
import { Database } from '../database'

const rpcCtxCookieOptsBase: express.CookieOptions = {
  path: '/',
  httpOnly: true,
  sameSite: 'strict',
}

export interface RpcCtx {
  user?: User
  sessionId?: string
  setSessionId: (sessionId: string, rememberMe: boolean) => Promise<void>
  unsetSessionId: () => Promise<void>
}

export function createRpcCtx(database: Database): (req: express.Request, res: express.Response) => Promise<RpcCtx> {
  return async (req, res) => {
    const [user, sessionId] = await new Promise<[User | undefined, string | undefined]>((resolve, reject) => {
      cookieParser()(req, res, async err => {
        try {
          if (err) {
            return reject(err)
          }
          const sessionId = req.cookies['myfolio-session']
          const user = sessionId ? await database.users.findBySessionId(sessionId) : undefined
          if (!user && sessionId) {
            res.cookie('myfolio-session', '', {
              ...rpcCtxCookieOptsBase,
              maxAge: 0,
            })
            return resolve([undefined, undefined])
          }
          resolve([user, sessionId])
        } catch (err) {
          reject(err)
        }
      })
    })
    return {
      user,
      sessionId,
      setSessionId: async (sessionId, rememberMe) => {
        res.cookie('myfolio-session', sessionId, {
          ...rpcCtxCookieOptsBase,
          maxAge: rememberMe ? 30 * 24 * 60 * 60 * 1000 : undefined,
        })
      },
      unsetSessionId: async () => {
        if (sessionId) {
          await database.users.clearSession(sessionId)
          res.cookie('myfolio-session', '', {
            ...rpcCtxCookieOptsBase,
            maxAge: 0,
          })
        }
      },
    }
  }
}
