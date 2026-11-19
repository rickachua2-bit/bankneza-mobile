import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View, ViewStyle, TextInputProps } from 'react-native';
import { useTenantTheme } from '../theme/ThemeProvider';

export function Card({ children, style }: { children: React.ReactNode; style?: ViewStyle }) {
  const theme = useTenantTheme();
  return (
    <View
      style={[
        styles.card,
        {
          backgroundColor: theme.isDark ? '#141B2D' : '#FFFFFF',
          borderColor: theme.isDark ? '#1E293B' : '#E2E8F0',
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function PrimaryButton({
  title,
  onPress,
  color = '#0066FF',
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  color?: string;
  disabled?: boolean;
  loading?: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled || loading}
      style={[styles.btn, { backgroundColor: color, opacity: disabled || loading ? 0.65 : 1 }]}
    >
      {loading ? <ActivityIndicator color="#ffffff" size="small" /> : <Text style={styles.btnText}>{title}</Text>}
    </TouchableOpacity>
  );
}

export function Field({ label, ...props }: { label: string } & TextInputProps) {
  const theme = useTenantTheme();
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={[styles.label, { color: theme.isDark ? '#CBD5E1' : '#475569' }]}>{label}</Text>
      <TextInput
        style={[
          styles.input,
          {
            backgroundColor: theme.isDark ? '#1E293B' : '#F8FAFC',
            borderColor: theme.isDark ? '#334155' : '#CBD5E1',
            color: theme.isDark ? '#F8FAFC' : '#0F172A',
          },
        ]}
        placeholderTextColor={theme.isDark ? '#64748B' : '#94A3B8'}
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    padding: 16,
    marginBottom: 14,
    borderWidth: 1,
  },
  btn: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  btnText: {
    color: '#ffffff',
    fontWeight: '800',
    fontSize: 14,
  },
  label: {
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 5,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 14,
  },
});
