import "./globals.css";
import { ThemeProvider } from "../contexts/ThemeContext";
import { ToastProvider } from "../contexts/ToastContext";
import { SocketProvider } from "../contexts/SocketContext";
import { NotificationProvider } from "../contexts/NotificationContext";
import { ToastContainer } from "../components/ui/toast";
import Navbar from "../components/layout/Navbar";
import Footer from "../components/layout/Footer";

export const metadata = {
  title: "HACKADEMIA - Digital Citizen Helpdesk",
  description:
    "Your digital citizen helpdesk for smart cities. Connecting citizens, service providers, and municipal authorities on one unified platform.",
  keywords:
    "smart cities, citizen services, municipal services, urban issues, city problems, service providers",
  authors: [{ name: "HACKADEMIA Team" }],
  creator: "HACKADEMIA",
  publisher: "HACKADEMIA",
  openGraph: {
    title: "HACKADEMIA - Digital Citizen Helpdesk",
    description: "Your digital citizen helpdesk for smart cities",
    url: "https://hackademia.com",
    siteName: "HACKADEMIA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "HACKADEMIA - Digital Citizen Helpdesk",
    description: "Your digital citizen helpdesk for smart cities",
    creator: "@hackademia",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme') || 
                  (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
                document.documentElement.classList.add(theme);
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors">
        <ThemeProvider>
          <ToastProvider>
            <SocketProvider>
              <NotificationProvider>
                <div className="min-h-screen flex flex-col">
                  <Navbar />
                  <main className="flex-1">{children}</main>
                  <Footer />
                </div>
                <ToastContainer />
              </NotificationProvider>
            </SocketProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
