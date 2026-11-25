import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["cyrillic", "latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  subsets: ["cyrillic", "latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SummaVideo — суть любого видео за секунды",
  description:
    "Вставьте ссылку на YouTube или загрузите видеофайл и получите краткую выжимку с тезисами и таймкодами.",
  applicationName: "SummaVideo",
  openGraph: {
    title: "SummaVideo — суть любого видео за секунды",
    description:
      "Вставьте ссылку на YouTube или загрузите видеофайл и получите краткую выжимку с тезисами и таймкодами.",
    locale: "ru_RU",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#09090b",
};

const themeBootScript = `(function(){try{var t=localStorage.getItem("summavideo.theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ru"
      data-theme="dark"
      className={`${inter.variable} ${jetbrains.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body className="min-h-full font-sans">{children}</body>
    </html>
  );
}
