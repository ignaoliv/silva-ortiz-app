import { withAuth } from 'next-auth/middleware'

const ALLOWED_DOMAIN = '@silvaortiz.com.ar'

export default withAuth({
  pages: {
    signIn: '/auth/login',
  },
  callbacks: {
    authorized({ token }) {
      if (!token?.email) return false
      return token.email.toLowerCase().endsWith(ALLOWED_DOMAIN)
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
    '/api/casos/:path*',
    '/api/pjn/:path*',
    '/api/perfil/:path*',
  ],
}
