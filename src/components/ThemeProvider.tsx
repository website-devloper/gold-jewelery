'use client';

import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useSettings();

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const theme = settings?.theme;
    const boldstarFont = 'var(--font-bader-goldstar), "Bader Goldstar", Arial, sans-serif';

    // Force a single font globally.
    root.style.setProperty('--theme-heading-font', boldstarFont);
    root.style.setProperty('--theme-body-font', boldstarFont);

    // Set colors if available
    if (theme?.colors) {
      root.style.setProperty('--theme-header-bg', theme.colors.headerBackground || '#ffffff');
      root.style.setProperty('--theme-header-text', theme.colors.headerText || '#000000');
      root.style.setProperty('--theme-footer-bg', theme.colors.footerBackground || '#1f2937');
      root.style.setProperty('--theme-footer-text', theme.colors.footerText || '#ffffff');
      root.style.setProperty('--theme-primary-button', theme.colors.primaryButton || '#000000');
      root.style.setProperty('--theme-primary-button-text', theme.colors.primaryButtonText || '#ffffff');
      root.style.setProperty('--theme-secondary-button', theme.colors.secondaryButton || '#f3f4f6');
      root.style.setProperty('--theme-secondary-button-text', theme.colors.secondaryButtonText || '#000000');
    }
  }, [settings]);

  return <>{children}</>;
}
