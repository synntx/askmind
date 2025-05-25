import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit, Onest } from "next/font/google";
import "./globals.css";
// import { ThemeProvider } from "@/components/common/theme-provider";
import { Providers } from "./providers";
import { ThemeProvider } from "@/components/common/theme-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "AskMind",
  description: "Get it Done. Any Task, Any Time",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* <script src="https://unpkg.com/react-scan/dist/auto.global.js" /> */}
      </head>
      <body
        className={`${inter.variable} ${jetbrainsMono.variable} ${outfit.variable} ${onest.variable} antialiased font-sans`}
      >
        <Providers>
          <ThemeProvider
            defaultTheme="dark"
            attribute="class"
            enableSystem
            disableTransitionOnChange
          >
            {children}
          </ThemeProvider>
        </Providers>
      </body>
    </html>
  );
}
