import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Product Scanner PWA',
  description: 'Scan product labels and analyze ingredients',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}