import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ListingProvider } from "@/context/ListingContext";
import { PetProvider } from "@/context/PetContext";
import { MessageProvider } from "@/context/MessageContext";
import { Toaster } from 'react-hot-toast'
import { BusinessListingProvider } from '@/context/BusinessListingContext';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Evcil Hayvan Eşleştirme",
  description: "Evcil hayvanınız için en uygun eşleşmeyi bulun",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="tr">
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
