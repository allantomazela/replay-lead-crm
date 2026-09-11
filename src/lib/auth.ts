import { createAuthClient } from '@neondatabase/auth'
import { BetterAuthReactAdapter } from '@neondatabase/auth/react/adapters'

const authUrl = import.meta.env.VITE_NEON_AUTH_URL

if (!authUrl) {
  console.warn('VITE_NEON_AUTH_URL não definida. Auth não funcionará até configurar .env-dev.')
}

export const authClient = createAuthClient(authUrl || 'http://localhost', {
  adapter: BetterAuthReactAdapter(),
})

export async function getAuthBearerToken(): Promise<string | null> {
  try {
    const client = authClient as typeof authClient & {
      token?: () => Promise<{ data?: { token?: string } | null }>
    }
    if (typeof client.token === 'function') {
      const tokenResult = await client.token()
      if (tokenResult?.data?.token) {
        return tokenResult.data.token
      }
    }
  } catch {
    // fallback abaixo
  }

  try {
    const sessionResult = await authClient.getSession()
    const sessionToken = sessionResult?.data?.session?.token
    if (typeof sessionToken === 'string' && sessionToken.length > 0) {
      return sessionToken
    }
  } catch {
    return null
  }

  return null
}
