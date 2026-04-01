import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Варнтал — Платформа приключений',
  description: 'Платформа для D&D сессий в реальном времени',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Alegreya SC — заголовки глав, Alegreya Sans SC — UI/кнопки, Open Sans — таблицы */}
        <link href="https://fonts.googleapis.com/css2?family=Alegreya+SC:ital,wght@0,400;0,700;0,900;1,400;1,700&family=Alegreya+Sans+SC:wght@400;700&family=Alegreya+Sans:ital,wght@0,400;0,700;1,400&family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
