import type { Metadata } from "next";
import React from "react";
import { IBM_Plex_Sans } from "next/font/google";
import "./globals.css";
import GlobalNav from "./components/GlobalNav";
import { Providers } from "./providers";

const ibmPlexSans = IBM_Plex_Sans({
  weight: ["400", "500", "600", "700"],
  subsets: ["latin"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "UFO Dataset Explorer",
  description: "Explore UFO sightings dataset from Hugging Face",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={ibmPlexSans.variable}>
      <body>
        <Providers>
          <GlobalNav />
          <div className="pt-14">{children}</div>
        </Providers>
      </body>
    </html>
  );
}
