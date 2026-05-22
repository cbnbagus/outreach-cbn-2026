import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'CBN Outreach — Reach Every Soul, Disciple Every Nation',
    template: '%s | CBN Outreach',
  },
  description: 'Outreach management platform for CBN Southeast Asia. Manage outreach conversations, prayer & counseling, and follow-up across every digital channel.',
  authors: [{ name: 'CBN Indonesia' }],
  creator: 'CBN Indonesia',
  robots: {
    index: false,
    follow: false,
  },
  icons: {
    icon: '/cbn-logo.png',
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
