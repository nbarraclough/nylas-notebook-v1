import './globals.css'

export const metadata = {
  title: 'Meeting Bot',
  description: 'Send a notetaker bot to your meetings',
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

