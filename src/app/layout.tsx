import type { Metadata } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { Header } from '@/components/ui/Header'
import '@/styles/tokens.css'
import '@/styles/base.css'

export const metadata: Metadata = {
  title: 'StepDish',
  description:
    'A structured recipe workspace — record, cook, and share step-by-step recipes with timers and reminders.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          {/* Fontshare — Cabinet Grotesk (display) + Satoshi (body) */}
          <link
            href="https://api.fontshare.com/v2/css?f[]=cabinet-grotesk@400,500,700,800&f[]=satoshi@300,400,500,700&display=swap"
            rel="stylesheet"
          />
        </head>
        <body>
          <Header />
          {children}
        </body>
      </html>
    </ClerkProvider>
  )
}
