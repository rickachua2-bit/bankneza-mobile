import React, { createContext, useContext, useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { portalApi } from '../services/api';

export interface TenantTheme {
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
  supportEmail?: string;
  enabledModules: string[];
}

const extra = (Constants.expoConfig?.extra || {}) as Record<string, string>;

const defaultTheme: TenantTheme = {
  brandName: Constants.expoConfig?.name || 'Digital Bank',
  primaryColor: extra.primaryColor || '#001C71',
  secondaryColor: '#000F3D',
  accentColor: extra.accentColor || '#0066FF',
  enabledModules: [],
};

export function isFeatureEnabled(theme: TenantTheme, code: string): boolean {
  if (!theme.enabledModules || theme.enabledModules.length === 0) return true;
  return theme.enabledModules.includes(code);
}

const ThemeCtx = createContext<TenantTheme>(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<TenantTheme>(defaultTheme);

  useEffect(() => {
    portalApi.getTenantConfig().then((res) => {
      if (res.success && res.data) {
        const d = res.data;
        setTheme({
          brandName: d.brandName || defaultTheme.brandName,
          primaryColor: d.theme?.primaryColor || d.primaryColor || defaultTheme.primaryColor,
          secondaryColor: d.theme?.secondaryColor || d.secondaryColor || defaultTheme.secondaryColor,
          accentColor: d.theme?.accentColor || d.accentColor || defaultTheme.accentColor,
          logoUrl: d.logoUrl || undefined,
          supportEmail: d.supportEmail || undefined,
          enabledModules: Array.isArray(d.enabledModules) ? d.enabledModules : [],
        });
      }
    }).catch(() => {});
  }, []);

  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}

export function useTenantTheme(): TenantTheme {
  return useContext(ThemeCtx);
}
