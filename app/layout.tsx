import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { msg } from "@lingui/core/macro";
import "./globals.css";
import Header from "@/components/Header";
import SessionProviderClient from "./auth_provider";
import QueryProviderClient from "./query_provider";
import { initLingui } from "@/libs/i18n/server";
import { LinguiClientProvider } from "@/libs/i18n/LinguiClientProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const i18n = await initLingui();

  return {
    title: "Surveyor",
    description: i18n._(msg`Write surveys, share them, and read the answers.`),
  };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const i18n = await initLingui();

  return (
    <html lang={i18n.locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* The I18n instance itself cannot cross to the browser, so the client
            provider rebuilds one from the active locale and its messages. */}
        <LinguiClientProvider locale={i18n.locale} messages={i18n.messages}>
          <SessionProviderClient>
            <Header />
            <QueryProviderClient>
            {children}
            </QueryProviderClient>
          </SessionProviderClient>
        </LinguiClientProvider>
      </body>
    </html>
  );
}
