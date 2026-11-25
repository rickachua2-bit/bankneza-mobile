import fs from 'fs';
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => {
  const tenantSlug = process.env.TENANT_SLUG || 'fin';
  const appName = process.env.APP_NAME || 'Bankneza Mobile';
  const androidPackage = process.env.ANDROID_PACKAGE || `com.${tenantSlug.replace(/[^a-z0-9]/gi, '')}.app`;
  const iosBundleId = process.env.IOS_BUNDLE_ID || androidPackage;
  const primaryColor = process.env.PRIMARY_COLOR || '#001C71';
  const accentColor = process.env.ACCENT_COLOR || '#0066FF';
  const apiBaseUrl = process.env.API_BASE_URL || `https://${tenantSlug}.slikpay.online`;
  const versionName = process.env.VERSION_NAME || '1.0.0';
  const buildNumber = String(process.env.BUILD_NUMBER || '1');
  const hasIcon = fs.existsSync('./assets/icon.png');
  const hasSplash = fs.existsSync('./assets/splash.png');

  return {
    ...config,
    name: appName,
    owner: process.env.EXPO_OWNER || 'pickpadi-global-ltd',
    slug: process.env.EXPO_PROJECT_SLUG || 'rickwealth',
    version: versionName,
    orientation: 'portrait',
    userInterfaceStyle: 'light',
    icon: hasIcon ? './assets/icon.png' : undefined,
    splash: {
      image: hasSplash ? './assets/splash.png' : undefined,
      backgroundColor: primaryColor,
      resizeMode: 'contain',
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: iosBundleId,
      buildNumber,
      infoPlist: {
        NSFaceIDUsageDescription: `Use Face ID to authorize ${appName} logins and transfers.`,
      },
    },
    android: {
      package: androidPackage,
      versionCode: Number(buildNumber) || 1,
      adaptiveIcon: {
        foregroundImage: hasIcon ? './assets/icon.png' : undefined,
        backgroundColor: primaryColor,
      },
      permissions: ['USE_BIOMETRIC', 'USE_FINGERPRINT'],
    },
    plugins: ['expo-secure-store', 'expo-local-authentication', 'expo-notifications', 'expo-font'],
    extra: {
      tenantSlug,
      apiBaseUrl,
      primaryColor,
      accentColor,
      eas: process.env.EXPO_PROJECT_ID ? { projectId: process.env.EXPO_PROJECT_ID } : undefined,
    },
  };
};
