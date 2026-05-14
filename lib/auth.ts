import type { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'

const ALLOWED_DOMAIN = '@silvaortiz.com.ar'
const ALLOWED_EMAILS = ['dji.olivieri@gmail.com']

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID!,
      authorization: {
        params: {
          scope: 'openid profile email offline_access',
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
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string | undefined
      return session
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: 8 * 60 * 60, // 8 horas
  },
}
