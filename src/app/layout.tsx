import type { Metadata, Viewport } from "next";
import { DM_Sans, Sora } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { ChatWidget } from "@/components/chat/ChatWidget";
import { siteConfig } from "@/lib/seo";
import "./globals.css";

const sora = Sora({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});

const dmSans = DM_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.title,
    template: `%s | ${siteConfig.name}`,
  },
  description: siteConfig.description,
  applicationName: siteConfig.name,
  keywords: [...siteConfig.keywords],
  authors: [{ name: siteConfig.name, url: siteConfig.url }],
  creator: siteConfig.name,
  publisher: siteConfig.name,
  category: "technology",
  icons: {
    icon: [{ url: "/brand/youtube-mark.png", type: "image/png" }],
    apple: [{ url: "/brand/youtube-mark.png", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: siteConfig.locale,
    url: "/",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export const viewport: Viewport = {
  themeColor: "#0b0d12",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${sora.variable} ${dmSans.variable} h-full overflow-x-hidden antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans atmosphere">
        <NextTopLoader
          color="#ff0000"
          height={3}
          showSpinner={false}
          crawl
          easing="ease"
          speed={200}
          shadow="0 0 10px #ff0000,0 0 5px #ff0000"
          zIndex={99999}
        />
        {children}
        <ChatWidget />
      </body>
    </html>
  );
}
