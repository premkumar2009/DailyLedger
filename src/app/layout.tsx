import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lasyanvita Sri",
  description: "A private daily money record by Lasyanvita Sri.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
