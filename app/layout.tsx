import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'CBN Outreach — Cahaya Bagi Negeri',
    template: '%s | CBN Outreach',
  },
  description: 'Outreach management platform for CBN Southeast Asia. Track respondents, manage conversations, and measure Kingdom impact.',
  authors: [{ name: 'CBN Indonesia' }],
  creator: 'CBN Indonesia',
  robots: {
    index: false,
    follow: false,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  )
}
