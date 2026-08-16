import type { Metadata } from "next";
import { Geist, Geist_Mono, Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { BrandThemeApplier } from "@/components/ecommerce/BrandTheme";
import { PWAInstallPrompt } from "@/components/ecommerce/PWAInstallPrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Precargamos Inter como fuente por defecto del Design System. Es la
// fuente del tema "Clásico Naranja" (default). Si el admin cambia a un
// tema con otra fuente (Poppins, Montserrat, etc.), BrandThemeApplier la
// carga dinámicamente desde Google Fonts en runtime.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Dulce Encanto — Repostería Artesanal para tus Momentos Especiales",
  description: "Pasteles personalizados, cupcakes, mini cakes y postres fríos elaborados a mano en Ciego de Ávila, Cuba. Horneado fresco el mismo día de tu evento.",
  keywords: ["Dulce Encanto", "Repostería", "Tartas", "Cupcakes", "Postres", "Ciego de Ávila", "Cuba", "Pasteles personalizados"],
  authors: [{ name: "Dulce Encanto" }],
  icons: {
    icon: "/favicon.webp",
    apple: "/favicon.webp",
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
        className={`${geistSans.variable} ${geistMono.variable} ${inter.variable} antialiased`}
        style={{ backgroundColor: '#ffffff', color: '#111827' }}
      >
        {/* Aplica todos los tokens del Design System (paleta, tipografía,
            radios, sombras, footer) desde la configuración del admin.
            Sin render visual. */}
        <BrandThemeApplier />
        {/* Force-unregister old service workers that cache stale admin pages */}
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            navigator.serviceWorker.getRegistrations().then(function(regs) {
              regs.forEach(function(reg) {
                if (reg.active && reg.active.scriptURL.indexOf('sw.js') !== -1) {
                  var swVersion = reg.active.scriptURL;
                  // Unregister any SW that isn't v2 (the current version)
                  reg.unregister();
                }
              });
              // Also clear all caches
              if (window.caches) {
                caches.keys().then(function(names) { names.forEach(function(n) { caches.delete(n); }); });
              }
            });
          }
        `}} />
        {children}
        <Toaster />
        <SonnerToaster position="top-right" richColors closeButton />
        <PWAInstallPrompt />
      </body>
    </html>
  );
}
