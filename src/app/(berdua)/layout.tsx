import type { Metadata, Viewport } from "next";

export const metadata: Metadata = {
  title: "Berdua",
  description: "Ruang chat berdua, lengkap sama pengingat kalau ada pesan yang belum dibales.",
  manifest: "/berdua/manifest.webmanifest",
  applicationName: "Berdua",
  appleWebApp: {
    capable: true,
    title: "Berdua",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/berdua/icon-192.png",
    apple: "/berdua/apple-touch-icon.png",
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0f0b18",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function BerduaLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="berdua-shell min-h-[100dvh] bg-[#0f0b18] text-[#f4eefb] antialiased">
      {children}
    </div>
  );
}
