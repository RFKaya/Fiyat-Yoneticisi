import type { Metadata } from 'next';
import './globals.css';
import { ThemeProvider } from '@/components/theme-provider';
import { verifyAuthCookie } from '@/lib/auth';
import AuthWrapper from '@/components/AuthWrapper';
import GlobalErrorToast from '@/components/GlobalErrorToast';

export const metadata: Metadata = {
  title: 'FiyatVizyon',
  description: 'Ürün fiyatlandırma ve kar analizi aracı',
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const isAuthenticated = await verifyAuthCookie();

  return (
    <html lang="tr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="font-body antialiased relative min-h-screen overflow-x-hidden">
        <ThemeProvider>
          {/* Animated Background Blobs */}
          <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
            <div className="blob blob-indigo top-[-10%] left-[-10%] w-[500px] h-[500px] animate-[pulse_10s_infinite_alternate]" />
            <div className="blob blob-pink bottom-[-10%] right-[-10%] w-[600px] h-[600px] animate-[pulse_15s_infinite_alternate_reverse]" />
          </div>
          <div className="relative z-10 flex flex-col min-h-screen">
            <AuthWrapper isAuthenticated={isAuthenticated}>
              {children}
            </AuthWrapper>
            <GlobalErrorToast />
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
