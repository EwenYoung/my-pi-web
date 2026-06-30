import type { Metadata } from "next";
import { Noto_Sans_Mono } from "next/font/google";
import Script from "next/script";
import "katex/dist/katex.min.css";
import "./globals.css";

const notoSansMono = Noto_Sans_Mono({
  subsets: ["latin", "cyrillic"],
  variable: "--font-noto-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pi Agent Web",
  description: "Pi Coding Agent Web Interface",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={notoSansMono.variable} suppressHydrationWarning>
      <body style={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
        <Script
          id="pi-theme"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("pi-theme");if(t&&t!=="light")document.documentElement.classList.add(t)}catch(e){}})();`,
          }}
        />
        {children}
      </body>
    </html>
  );
}
