export { default } from 'next-auth/middleware'

export const config = {
  matcher: [
    '/expedientes/:path*',
    '/audiencias/:path*',
    '/clientes/:path*',
  ],
}
