import type { Metadata } from 'next'
import './globals.css'
import SessionProvider from '@/components/auth/SessionProvider'
import { ThemeProvider } from '@/components/ThemeProvider'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const metadata: Metadata = {
  title: 'Silva Ortiz Abogados',
  description: 'Sistema de gestión de expedientes legales',
  icons: {
    icon: '/favicon.ico',
    apple: '/apple-touch-icon.png',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  return (
    <html lang="es">
      <body>
        <ThemeProvider>
          <SessionProvider session={session}>
            {children}
          </SessionProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
