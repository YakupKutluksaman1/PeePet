import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ListingProvider } from "@/context/ListingContext";
import { PetProvider } from "@/context/PetContext";
import { MessageProvider } from "@/context/MessageContext";
import { Toaster } from 'react-hot-toast'
import { BusinessListingProvider } from '@/context/BusinessListingContext';
import Head from 'next/head';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "PeePet - Evcil Hayvan Eşleştirme Platformu",
  description: "Evcil hayvanınız için mükemmel eşi bulun. Güvenli, ücretsiz ve kolay kullanımlı platform ile sevimli dostlarınızı buluşturun.",
  keywords: ["evcil hayvan", "eşleştirme", "hayvan", "pet", "köpek", "kedi", "çiftleşme", "türkiye"],
  authors: [{ name: "PeePet" }],
  creator: "PeePet",
  publisher: "PeePet",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL("https://peepet.com.tr"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "PeePet - Evcil Hayvan Eşleştirme Platformu",
    description: "Evcil hayvanınız için mükemmel eşi bulun. Güvenli, ücretsiz ve kolay kullanımlı platform ile sevimli dostlarınızı buluşturun.",
    url: "https://peepet.com.tr",
    siteName: "PeePet",
    locale: "tr_TR",
    type: "website",
    images: [
      {
        url: "/peepet.png",
        width: 1200,
        height: 630,
        alt: "PeePet - Evcil Hayvan Eşleştirme Platformu",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "PeePet - Evcil Hayvan Eşleştirme Platformu",
    description: "Evcil hayvanınız için mükemmel eşi bulun. Güvenli, ücretsiz ve kolay kullanımlı platform ile sevimli dostlarınızı buluşturun.",
    images: ["/peepet.png"],
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

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6c5ce7" />
      </Head>
      <body className={inter.className}>
        <AuthProvider>
          <PetProvider>
            <ListingProvider>
              <BusinessListingProvider>
                <MessageProvider>
                  {children}
                  <Toaster position="top-right" />
                </MessageProvider>
              </BusinessListingProvider>
            </ListingProvider>
          </PetProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
