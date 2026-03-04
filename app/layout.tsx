import type { Metadata, Viewport } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { I18nProvider } from '@/lib/i18n-provider'
import './globals.css'

const _inter = Inter({ subsets: ['latin', 'cyrillic'], variable: '--font-inter' })
const _jetbrains = JetBrains_Mono({ subsets: ['latin', 'cyrillic'], variable: '--font-jetbrains' })

export const metadata: Metadata = {
  title: 'NewsFlow -- AI News Aggregator',
  description: 'AI-powered news aggregator with correlation analysis across politics, stocks, and technology',
}

export const viewport: Viewport = {
  themeColor: '#1a1a2e',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ru" className="dark" suppressHydrationWarning>
      <body className={`${_inter.variable} ${_jetbrains.variable} font-sans antialiased`}>
        <I18nProvider defaultLang="ru">
          {children}
        </I18nProvider>
        <Analytics />
      </body>
    </html>
  )
}
