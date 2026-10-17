import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, Hanken_Grotesk, Instrument_Serif } from "next/font/google";
import { AuthProvider } from "@/lib/auth";
import { RealtimeProvider } from "@/lib/realtime";
import { SITE_URL } from "@/lib/config";
import { Footer, Header, TabBar } from "@/components/chrome";
import "./globals.css";

const hanken = Hanken_Grotesk({ subsets: ["latin"], variable: "--font-hanken", display: "swap" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-bricolage", display: "swap", weight: ["500", "600", "700", "800"] });
const instrument = Instrument_Serif({ subsets: ["latin"], variable: "--font-instrument", display: "swap", weight: "400", style: ["italic", "normal"] });

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: "Droba · Pre-loved everything, honestly graded", template: "%s · Droba" },
  description: "Buy and sell pre-loved fashion, phones, laptops, furniture, appliances, baby gear and cars near you in Nigeria. Condition-graded. Pay the seller on delivery.",
  openGraph: { siteName: "Droba", type: "website", locale: "en_NG" },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = { themeColor: "#ffffff", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NG" className={`${hanken.variable} ${bricolage.variable} ${instrument.variable}`}>
      <body className="min-h-dvh">
        <AuthProvider>
          <RealtimeProvider>
            <Header />
            <div className="min-h-[60vh]">{children}</div>
            <Footer />
            <TabBar />
          </RealtimeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
