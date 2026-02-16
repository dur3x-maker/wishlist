import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Wishlist — Share your wishes",
  description: "Create and share wishlists with friends and family",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
