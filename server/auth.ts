import { createMiddleware } from 'hono/factory'
import { createRemoteJWKSet, jwtVerify } from 'jose'

type AuthVariables = {
  userId: string
}

let jwks: ReturnType<typeof createRemoteJWKSet> | null = null

function getJwks() {
  if (!jwks) {
    const jwksUrl = process.env.NEON_AUTH_JWKS_URL
    if (!jwksUrl) {
      throw new Error('NEON_AUTH_JWKS_URL não definida')
    }
    jwks = createRemoteJWKSet(new URL(jwksUrl))
  }
  return jwks
}

async function resolveUserIdFromToken(token: string): Promise<string | null> {
  // 1) JWT via JWKS (Neon Auth JWT plugin)
  try {
    const { payload } = await jwtVerify(token, getJwks())
    const sub = payload.sub
    if (typeof sub === 'string' && sub.length > 0) {
      return sub
    }
  } catch {
    // tentar session token via get-session
  }

  // 2) Session token Better Auth
  const authBase = process.env.VITE_NEON_AUTH_URL || process.env.NEON_AUTH_URL
  if (!authBase) return null

  const origin =
    process.env.APP_ORIGIN || 'https://www.sistemascuesta.com.br'

  try {
    const response = await fetch(`${authBase}/get-session`, {
      headers: {
        Authorization: `Bearer ${token}`,
        Origin: origin,
        cookie: `__Secure-neon-auth.session_token=${token}; better-auth.session_token=${token}`,
      },
    })
    if (!response.ok) return null
    const data = (await response.json()) as {
      user?: { id?: string }
      session?: { userId?: string }
    }
    return data.user?.id || data.session?.userId || null
  } catch {
    return null
  }
}

export const requireAuth = createMiddleware<{ Variables: AuthVariables }>(async (c, next) => {
  const header = c.req.header('Authorization')
  if (!header?.startsWith('Bearer ')) {
    return c.json({ error: 'Não autenticado' }, 401)
  }

  const token = header.slice('Bearer '.length).trim()
  if (!token) {
    return c.json({ error: 'Não autenticado' }, 401)
  }

  const userId = await resolveUserIdFromToken(token)
  if (!userId) {
    return c.json({ error: 'Sessão inválida ou expirada' }, 401)
  }

  c.set('userId', userId)
  await next()
})

export type { AuthVariables }
