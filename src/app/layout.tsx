import type { Metadata, Viewport } from "next";
import "./globals.css";
import OfflineBanner from "@/components/OfflineBanner";
import AuthGate from "@/components/AuthGate";

export const metadata: Metadata = {
  title: "Entrenar",
  description: "Tu app de gym personal",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Entrenar",
  },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>
        <OfflineBanner />
        <AuthGate>{children}</AuthGate>
      </body>
    </html>
  );
}
