import type { Metadata, Viewport } from "next";
import { FondoDojo } from "@/components/fondo-dojo";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClassPulse · RoninX Academy",
  description: "Tu opinión sobre cada clase en vivo de RoninX Academy.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#040914",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full antialiased">
      <head>
        {/* Fuentes desde el navegador (next/font falla en builds sin red).
            La regla de abajo es de pages/; el layout raíz aplica a toda la app. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Shippori+Mincho:wght@500;700;800&display=swap"
        />
      </head>
      <body className="relative isolate flex min-h-full flex-col">
        <FondoDojo />
        {children}
      </body>
    </html>
  );
}
