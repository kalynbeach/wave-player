import type { Metadata } from "next";
import { cn } from "@/lib/utils";
import { GeistSans } from "geist/font/sans";
import "@/styles/globals.css";

export const metadata: Metadata = {
  title: "wave-player",
  description: "A web audio player.",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn(
        "min-h-screen bg-background font-sans antialiased",
        GeistSans.variable
      )}>
        {children}
      </body>
    </html>
  )
}
