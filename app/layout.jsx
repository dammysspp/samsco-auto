import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "FIFA 2026 - Automated Content Creator Dashboard",
  description:
    "Automated football news ingestion, Llama-3 script production, and YouTube scheduling pipeline.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-zinc-950 text-zinc-100 min-h-screen antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
