import { withAuth } from 'next-auth/middleware'

export default withAuth({
  pages: {
    signIn: '/auth/login',
  },
})

export const config = {
  matcher: [
    '/expedientes/:path*',
    '/audiencias/:path*',
    '/clientes/:path*',
  ],
}
