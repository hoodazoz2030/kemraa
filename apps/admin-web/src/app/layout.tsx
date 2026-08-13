import type { ReactNode } from "react";
export const metadata = { title: "KEMRAA Admin" };
export default function RootLayout({ children }: { children: ReactNode }) {
  return (<html lang="ar-EG" dir="rtl"><body>{children}</body></html>);
}