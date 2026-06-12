import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "../globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

// تحسين الميتا الافتراضية وإضافة إعدادات Open Graph و Twitter Cards الأساسية
export const metadata: Metadata = {
  title: {
    default: "GGLIST - منصة الجيمرز العرب",
    template: "%s | GGLIST"
  },
  description: "تتبع، قيم، واكتشف ألعابك المفضلة في مجتمع ألعاب متكامل.",
  keywords: ["gaming", "gamers", "games", "ألعاب", "جيمرز", "تقييم ألعاب", "مكتبة ألعاب"],
  authors: [{ name: "GGLIST Team" }],
  openGraph: {
    title: "GGLIST - منصة الجيمرز العرب",
    description: "تتبع، قيم، واكتشف ألعابك المفضلة في مجتمع ألعاب متكامل.",
    siteName: "GGLIST",
    locale: "ar_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "GGLIST - منصة الجيمرز العرب",
    description: "تتبع، قيم، واكتشف ألعابك المفضلة.",
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}>) {
  const { lang } = await params;
  const isAr = lang === "ar";

  return (
    <html lang={lang} dir={isAr ? "rtl" : "ltr"} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-zinc-950 text-white`}
        suppressHydrationWarning 
      >
        <AuthProvider>
          <Navbar />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}