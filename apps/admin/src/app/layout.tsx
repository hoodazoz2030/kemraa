import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/query";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Kemraa — The Land of the Sun",
  icons: [{ url: "/logo-dark.png?v=2", sizes: "any" }],
  description: "Admin dashboard for Kemraa travel platform",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr">
      <body className={inter.className}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            {children}
          </AuthProvider>
        </QueryClientProvider>
      </body>
    </html>
  );
}