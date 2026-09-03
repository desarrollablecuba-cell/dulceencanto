import type { Metadata } from "next";
// Fuentes AUTOHOSPEDADAS: no se descargan de Google Fonts durante el build
// (el build funciona incluso sin internet / redes inestables).
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "@fontsource/inter/300.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "@fontsource/inter/700.css";
import "@fontsource/inter/800.css";
import "@fontsource/inter/900.css";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { BrandThemeApplier } from "@/components/ecommerce/BrandTheme";
import { PWAInstallPrompt } from "@/components/ecommerce/PWAInstallPrompt";
import { ServiceWorkerCleaner } from "@/components/ServiceWorkerCleaner";

// Inter se sirve autohospedada vía @fontsource (familia CSS "Inter");
// la variable --font-inter se define en globals.css.

export const metadata: Metadata = {
  title: "Dulce Encanto — Repostería Artesanal para tus Momentos Especiales",
  description: "Pasteles personalizados, cupcakes, mini cakes y postres fríos elaborados a mano en Ciego de Ávila, Cuba. Horneado fresco el mismo día de tu evento.",
  keywords: ["Dulce Encanto", "Repostería", "Tartas", "Cupcakes", "Postres", "Ciego de Ávila", "Cuba", "Pasteles personalizados"],
  authors: [{ name: "Dulce Encanto" }],
  icons: {
    icon: "/favicon.webp",
    shortcut: "/favicon.webp",
    apple: "/apple-touch-icon.webp",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    title: "Dulce Encanto Admin",
    statusBarStyle: "black-translucent",
  },
};

export const viewport = {
  themeColor: "#A855F7",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        {/* Precargar todas las fuentes de Google Fonts disponibles en el
            Design System, para que el cambio de tema sea instantáneo sin
            parpadeo (FOUT). Pesan poco porque Google Fonts sirve solo los
            glifos usados con display=swap. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body
        className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}
        style={{ backgroundColor: '#ffffff', color: '#111827' }}
      >
        {/* Aplica todos los tokens del Design System (paleta, tipografía,
            radios, sombras, footer) desde la configuración del admin.
            Sin render visual. */}
        <BrandThemeApplier />
        {/* Force-unregister old service workers that cache stale admin pages.
            NOTA: la lógica vive en un componente cliente — React no ejecuta
            etiquetas <script> renderizadas dentro de componentes. */}
        <ServiceWorkerCleaner />
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
