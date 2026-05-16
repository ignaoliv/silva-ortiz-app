import { withAuth } from 'next-auth/middleware'

const ALLOWED_DOMAIN = '@silvaortiz.com.ar'
const ALLOWED_EMAILS: string[] = []

export default withAuth({
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    authorized({ token }) {
      if (!token?.email) return false
      const email = token.email.toLowerCase()
      return email.endsWith(ALLOWED_DOMAIN) || ALLOWED_EMAILS.includes(email)
    },
  },
})

export const config = {
  matcher: [
    '/expedientes/:path*',
    '/audiencias/:path*',
    '/clientes/:path*',
    '/pjn/:path*',
    '/perfil/:path*',
    '/admin/:path*',
    '/api/casos/:path*',
    '/api/pjn/:path*',
    '/api/pjn/sync/:path*',
    '/api/pjn/sync-status/:path*',
    '/api/perfil/:path*',
    '/api/feedback/:path*',
  ],
}
