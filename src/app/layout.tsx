import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ToastProvider } from "@/components/ui/toast";

export const metadata: Metadata = {
  title: {
    default: "A TO Z — Agent Management System",
    template: "%s · A TO Z",
  },
  description:
    "Internal management system for A TO Z travel agency: agents, tickets, payments, statements and reports.",
  robots: { index: false, follow: false },
  icons: {
    icon: [
      {
        url:
          "data:image/svg+xml," +
          encodeURIComponent(
            '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="7" fill="#2563eb"/><text x="16" y="21.5" font-family="system-ui,sans-serif" font-size="14" font-weight="700" fill="#fff" text-anchor="middle">AZ</text></svg>',
          ),
      },
    ],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f1f30",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
