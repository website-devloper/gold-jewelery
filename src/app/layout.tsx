import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getSettings } from '@/lib/firestore/settings_db';
import { getSEOSettings, getPageSEO } from '@/lib/firestore/seo_db';
import { generateSEOMetadata } from '@/lib/utils/seo';
import { CartProvider } from '../context/CartContext';
import { AuthProvider } from '../context/AuthContext';
import { SettingsProvider } from '../context/SettingsContext';
import { LanguageProvider } from '../context/LanguageContext';
import { CurrencyProvider } from '../context/CurrencyContext';
import { ThemeProvider } from '../components/ThemeProvider';
import LayoutWrapper from '../components/LayoutWrapper';
import { ToastProvider } from '../components/Toast';

// Arabic Heading Font - Bader Goldstar (elegant Arabic calligraphy for hero & headings)
const baderGoldstar = localFont({
  src: [
    {
      path: "../../public/fonts/ArbFONTS-bader_goldstar.ttf",
      weight: "400",
      style: "normal",
    }
  ],
  variable: "--font-bader-goldstar",
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  try {
    const [settings, seoSettings, homepageSEO] = await Promise.all([
      getSettings(),
      getSEOSettings(),
      getPageSEO('/'), // Check for homepage-specific SEO
    ]);

    // Use SEO settings from seo_settings collection if available, otherwise use settings.seo
    const globalSEO = seoSettings || settings?.seo;
    const companyName = settings?.company?.name || 'Pardah';

    // Priority: Homepage Page SEO > Global SEO > Fallback
    const metadata = generateSEOMetadata({
      globalSEO,
      pageSEO: homepageSEO, // Homepage-specific SEO
      fallbackTitle: globalSEO?.siteTitle || companyName || '',
      fallbackDescription: globalSEO?.siteDescription || '',
      fallbackImage: globalSEO?.defaultMetaImage || globalSEO?.ogDefaultImage,
      url: '/',
    });

    // Add favicon and PWA icons if available
    const pwaMetadata = {
      manifest: '/manifest.json',
      appleWebApp: {
        capable: true,
        statusBarStyle: 'default' as const,
        title: companyName,
      },
    };

    if (settings?.theme?.faviconUrl) {
      return {
        ...metadata,
        icons: {
          icon: settings.theme.faviconUrl,
          shortcut: settings.theme.faviconUrl,
          apple: settings.theme.faviconUrl,
        },
        ...pwaMetadata,
      };
    }

    return {
      ...metadata,
      ...pwaMetadata,
    };
  } catch {
    // Error generating metadata
    // Fallback metadata
    try {
      const settings = await getSettings();
      const companyName = settings?.company?.name || 'Pardah';
      const globalSEO = settings?.seo;
      return {
        title: globalSEO?.siteTitle || companyName || '',
        description: globalSEO?.siteDescription || '',
        keywords: globalSEO?.siteKeywords,
      };
    } catch {
      return {
        title: 'Pardah',
        description: '',
      };
    }
  }
}

export function generateViewport(): Viewport {
  return {
    themeColor: '#CFB257',
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" suppressHydrationWarning dir="rtl">
      <body
        className={`${baderGoldstar.variable} antialiased`}
      >
        <AuthProvider>
          <LanguageProvider>
            <CurrencyProvider>
              <CartProvider>
                <SettingsProvider>
                  <ThemeProvider>
                    <ToastProvider>
                      <LayoutWrapper>
                        {children}
                      </LayoutWrapper>
                    </ToastProvider>
                  </ThemeProvider>
                </SettingsProvider>
              </CartProvider>
            </CurrencyProvider>
          </LanguageProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
