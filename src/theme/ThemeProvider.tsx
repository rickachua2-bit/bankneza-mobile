import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import Constants from 'expo-constants';
import { portalApi } from '../services/api';

export type AppTemplateKey = 'OPAY' | 'KUDA' | 'REVOLUT' | 'MONIEPOINT' | 'GREY' | 'CARDTONIC';

export interface OnboardingSlide {
  title: string;
  desc: string;
  imageUrl?: string;
  icon?: string;
}

export interface TenantTheme {
  brandName: string;
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  logoUrl?: string;
  supportEmail?: string;
  enabledModules: string[];
  onboardingSlides: OnboardingSlide[];
  appTemplate: AppTemplateKey;
  isDark: boolean;
  refreshTheme: () => Promise<void>;
}

const extra = (Constants.expoConfig?.extra || {}) as Record<string, string>;

const defaultTheme: TenantTheme = {
  brandName: Constants.expoConfig?.name || 'Digital Bank',
  primaryColor: extra.primaryColor || '#001C71',
  secondaryColor: '#000F3D',
  accentColor: extra.accentColor || '#0066FF',
  enabledModules: [],
  onboardingSlides: [],
  appTemplate: 'OPAY',
  isDark: false,
  refreshTheme: async () => {},
};

export function isFeatureEnabled(theme: TenantTheme, code: string): boolean {
  if (!theme.enabledModules || theme.enabledModules.length === 0) return true;
  return theme.enabledModules.includes(code);
}

const ThemeCtx = createContext<TenantTheme>(defaultTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<TenantTheme>(defaultTheme);

  const refreshTheme = useCallback(async () => {
    try {
      const res = await portalApi.getTenantConfig();
      if (res.success && res.data) {
        const d = res.data;
        const rawTpl = String(d.mobileBranding?.appTemplate || 'OPAY').toUpperCase();
        const appTemplate: AppTemplateKey = (['OPAY', 'KUDA', 'REVOLUT', 'MONIEPOINT', 'GREY', 'CARDTONIC'].includes(rawTpl)
          ? rawTpl
          : 'OPAY') as AppTemplateKey;
        setTheme({
          brandName: d.brandName || defaultTheme.brandName,
          primaryColor: d.theme?.primaryColor || d.primaryColor || defaultTheme.primaryColor,
          secondaryColor: d.theme?.secondaryColor || d.secondaryColor || defaultTheme.secondaryColor,
          accentColor: d.theme?.accentColor || d.accentColor || defaultTheme.accentColor,
          logoUrl: d.logoUrl || d.mobileBranding?.appIconUrl || undefined,
          supportEmail: d.support?.email || d.supportEmail || undefined,
          enabledModules: Array.isArray(d.enabledModules) ? d.enabledModules : [],
          onboardingSlides: Array.isArray(d.mobileBranding?.onboardingSlides) ? d.mobileBranding.onboardingSlides : [],
          appTemplate,
          isDark: appTemplate === 'REVOLUT',
          refreshTheme,
        });
      }
    } catch {}
  }, []);

  useEffect(() => {
    refreshTheme();
  }, [refreshTheme]);

  return <ThemeCtx.Provider value={{ ...theme, refreshTheme }}>{children}</ThemeCtx.Provider>;
}

export function useTenantTheme(): TenantTheme {
  return useContext(ThemeCtx);
}
