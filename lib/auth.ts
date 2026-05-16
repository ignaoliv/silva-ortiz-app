import type { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'

async function refreshMsToken(refreshToken: string) {
  const res = await fetch(
    `https://login.microsoftonline.com/common/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id:     process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        grant_type:    'refresh_token',
        refresh_token: refreshToken,
        scope:         'openid profile email offline_access Calendars.ReadWrite',
      }),
    }
  )
  if (!res.ok) throw new Error(`Token refresh HTTP ${res.status}`)
  return res.json() as Promise<{ access_token: string; refresh_token?: string; expires_in: number }>
}

const ALLOWED_DOMAIN = '@silvaortiz.com.ar'
const ALLOWED_EMAILS: string[] = []

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId:     process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId:     'common', // multi-tenant: acepta cualquier org de Microsoft
      authorization: {
        params: {
          scope: 'openid profile email offline_access Calendars.ReadWrite',
        },
      },
    }),
  ],
  pages: {
    signIn: '/auth/login',
    error: '/auth/login',
  },
  callbacks: {
    async signIn({ user }) {
      const email = (user.email ?? '').toLowerCase()
      if (email.endsWith(ALLOWED_DOMAIN) || ALLOWED_EMAILS.includes(email)) {
        return true
      }
      return '/auth/login?error=AccessDenied'
    },
    async jwt({ token, account }) {
      if (account) {
        token.accessToken  = account.access_token
        token.refreshToken = account.refresh_token
        token.expiresAt    = account.expires_at   // segundos epoch
      }

      // Refrescar si el token expiró
      if (token.expiresAt && Date.now() / 1000 > (token.expiresAt as number) - 60) {
        try {
          const refreshed = await refreshMsToken(token.refreshToken as string)
          token.accessToken  = refreshed.access_token
          token.refreshToken = refreshed.refresh_token ?? token.refreshToken
          token.expiresAt    = Math.floor(Date.now() / 1000) + refreshed.expires_in
        } catch {
          console.error('[auth] Token refresh falló')
        }
      }

      return token
    },
    async session({ session, token }) {
      session.accessToken  = token.accessToken  as string | undefined
      session.refreshToken = token.refreshToken as string | undefined
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },
}
