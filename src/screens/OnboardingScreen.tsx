import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTenantTheme } from '../theme/ThemeProvider';
import { PrimaryButton } from '../components/Ui';

const SLIDES = [
  {
    icon: 'wallet',
    title: 'Instant NGN Virtual Accounts',
    desc: 'Receive bank transfers in seconds and send money to 700+ Nigerian banks with zero stress.',
  },
  {
    icon: 'card',
    title: 'Global USD & NGN Cards',
    desc: 'Issue 3D-Secure virtual Visa & Mastercard cards for global SaaS, shopping, and subscriptions.',
  },
  {
    icon: 'shield-checkmark',
    title: 'Bills, Cashback & 2FA Security',
    desc: 'Pay airtime, data, power & cable bills, earn cashback rewards, and protect your wallet with 2FA & Biometrics.',
  },
] as const;

export function OnboardingScreen({ onDone }: { onDone: () => void }) {
  const theme = useTenantTheme();
  const [step, setStep] = useState(0);
  const slide = SLIDES[step];

  return (
    <View style={[styles.container, { backgroundColor: theme.primaryColor }]}>
      <TouchableOpacity onPress={onDone} style={styles.skipBtn}>
        <Text style={styles.skipTxt}>Skip</Text>
      </TouchableOpacity>

      <View style={styles.center}>
        <View style={[styles.iconCircle, { backgroundColor: theme.accentColor }]}>
          <Ionicons name={slide.icon as any} size={52} color="#ffffff" />
        </View>
        <Text style={styles.brand}>{theme.brandName}</Text>
        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.desc}>{slide.desc}</Text>

        <View style={styles.dots}>
          {SLIDES.map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.dot,
                { width: idx === step ? 24 : 8, backgroundColor: idx === step ? '#ffffff' : 'rgba(255,255,255,0.35)' },
              ]}
            />
          ))}
        </View>
      </View>

      <View style={{ width: '100%' }}>
        <PrimaryButton
          title={step < SLIDES.length - 1 ? 'Next →' : 'Get Started →'}
          onPress={() => (step < SLIDES.length - 1 ? setStep(step + 1) : onDone())}
          color={theme.accentColor}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, justifyContent: 'space-between', paddingTop: 48, paddingBottom: 36 },
  skipBtn: { alignSelf: 'flex-end', padding: 8 },
  skipTxt: { color: 'rgba(255,255,255,0.85)', fontWeight: '700', fontSize: 14 },
  center: { alignItems: 'center', paddingHorizontal: 12 },
  iconCircle: { width: 108, height: 108, borderRadius: 54, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  brand: { color: 'rgba(255,255,255,0.75)', fontSize: 13, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 8 },
  title: { color: '#ffffff', fontSize: 25, fontWeight: '900', textAlign: 'center', marginBottom: 12 },
  desc: { color: 'rgba(255,255,255,0.82)', fontSize: 15, textAlign: 'center', lineHeight: 22 },
  dots: { flexDirection: 'row', gap: 8, marginTop: 28 },
  dot: { height: 8, borderRadius: 4 },
});
