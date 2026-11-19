import React, { useState } from 'react';
import { Alert, ScrollView, Share, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { Ionicons } from '@expo/vector-icons';
import { portalApi } from '../services/api';
import { useTenantTheme } from '../theme/ThemeProvider';
import { Card, Field, PrimaryButton } from '../components/Ui';

type HubTab = 'REMIT' | 'FX' | 'CRYPTO' | 'FLIGHTS';

const FX_RATES_TO_NGN: Record<string, number> = {
  NGN: 1,
  USD: 1620,
  GBP: 2050,
  EUR: 1750,
};

export function ServicesScreen({ onSuccess }: { onSuccess: () => void }) {
  const theme = useTenantTheme();
  const isDark = theme.isDark;
  const [hubTab, setHubTab] = useState<HubTab>('REMIT');
  const [loading, setLoading] = useState(false);

  const [remCurr, setRemCurr] = useState<'USD' | 'GBP' | 'EUR'>('USD');
  const [remType, setRemType] = useState<'REMITTANCE' | 'TUITION'>('REMITTANCE');
  const [remName, setRemName] = useState('');
  const [remAcc, setRemAcc] = useState('');
  const [remRouting, setRemRouting] = useState('');
  const [remAmt, setRemAmt] = useState('');

  const [fxFrom, setFxFrom] = useState<'NGN' | 'USD' | 'GBP' | 'EUR'>('NGN');
  const [fxTo, setFxTo] = useState<'USD' | 'NGN' | 'GBP' | 'EUR'>('USD');
  const [fxAmt, setFxAmt] = useState('');

  const [fltFrom, setFltFrom] = useState('LOS');
  const [fltTo, setFltTo] = useState('ABV');
  const [fltDate, setFltDate] = useState('2026-12-01');
  const [flightOffers, setFlightOffers] = useState<any[]>([]);

  const [cryptoAsset, setCryptoAsset] = useState('USDT_TRC20');
  const [cryptoAddr, setCryptoAddr] = useState('');

  const titleColor = isDark ? '#F8FAFC' : '#0F172A';
  const mutedColor = isDark ? '#94A3B8' : '#64748B';
  const borderCol = isDark ? '#1E293B' : '#E2E8F0';

  const previewSwapOutput = () => {
    const amt = Number(fxAmt || 0);
    if (amt <= 0) return '0.00';
    const inNgn = amt * (FX_RATES_TO_NGN[fxFrom] || 1);
    const out = inNgn / (FX_RATES_TO_NGN[fxTo] || 1);
    return out.toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      {/* TOP SEGMENTED GLOBAL HUB BAR */}
      <View style={styles.hubTabsRow}>
        {[
          { key: 'REMIT' as const, label: 'Global Remit', icon: 'globe' },
          { key: 'FX' as const, label: 'FX Swap', icon: 'swap-horizontal' },
          { key: 'CRYPTO' as const, label: 'Crypto Vault', icon: 'logo-bitcoin' },
          { key: 'FLIGHTS' as const, label: 'Flights', icon: 'airplane' },
        ].map((t) => {
          const active = hubTab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              onPress={() => setHubTab(t.key)}
              style={[
                styles.hubTabBtn,
                {
                  backgroundColor: active ? theme.primaryColor : isDark ? '#141B2D' : '#FFFFFF',
                  borderColor: active ? theme.primaryColor : borderCol,
                },
              ]}
            >
              <Ionicons name={t.icon as any} size={18} color={active ? '#fff' : theme.accentColor} />
              <Text style={{ fontSize: 11, fontWeight: '900', color: active ? '#fff' : titleColor, marginTop: 4 }}>
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {hubTab === 'REMIT' && (
        <Card>
          <Text style={[styles.title, { color: titleColor }]}>Cross-Border Payouts & Tuition</Text>
          <Text style={{ fontSize: 12, color: mutedColor, marginBottom: 12 }}>
            Send international payouts via ACH, Fedwire, UK Faster Payments, SEPA IBAN, or direct university tuition.
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {(['REMITTANCE', 'TUITION'] as const).map((tp) => (
              <TouchableOpacity
                key={tp}
                onPress={() => setRemType(tp)}
                style={[styles.chip, remType === tp && { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }]}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: remType === tp ? '#fff' : titleColor }}>
                  {tp === 'REMITTANCE' ? 'Bank Wire / ACH / SEPA' : 'International Tuition'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 12, fontWeight: '800', color: titleColor, marginBottom: 6 }}>Destination Currency</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {(['USD', 'GBP', 'EUR'] as const).map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setRemCurr(c)}
                style={[styles.chip, remCurr === c && { backgroundColor: theme.accentColor, borderColor: theme.accentColor }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: remCurr === c ? '#fff' : titleColor }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field label={remType === 'TUITION' ? 'University / Institution Name' : 'Beneficiary Full Name'} value={remName} onChangeText={setRemName} placeholder="John Smith / University of Toronto" />
          <Field label="IBAN / Account Number" value={remAcc} onChangeText={setRemAcc} placeholder="GB29NWBK60161331926819" />
          <Field label="SWIFT / BIC / Routing / Sort Code" value={remRouting} onChangeText={setRemRouting} placeholder="026073150 / CHASUS33" />
          <Field label={`Amount (${remCurr})`} value={remAmt} onChangeText={setRemAmt} keyboardType="numeric" placeholder="500" />

          <PrimaryButton
            title={loading ? 'Submitting Global Payout...' : `Send ${remCurr} Global Payout →`}
            color={theme.accentColor}
            disabled={loading}
            onPress={async () => {
              if (!remName.trim() || !remAcc.trim() || !remAmt) {
                return Alert.alert('Missing Details', 'Complete beneficiary name, account/IBAN, and amount.');
              }
              setLoading(true);
              try {
                const r = await portalApi.sendRemittance({
                  type: remType,
                  currency: remCurr,
                  beneficiaryName: remName.trim(),
                  accountNumber: remAcc.trim(),
                  amount: Number(remAmt),
                });
                Alert.alert('Global Remittance ✓', r.success ? `Your ${remCurr} ${remAmt} payout has been dispatched!` : r.error?.message || 'Failed.');
                if (r.success) {
                  setRemAmt('');
                  onSuccess();
                }
              } finally {
                setLoading(false);
              }
            }}
          />
        </Card>
      )}

      {hubTab === 'FX' && (
        <Card>
          <Text style={[styles.title, { color: titleColor }]}>Instant Multi-Currency FX Swap</Text>
          <Text style={{ fontSize: 12, color: mutedColor, marginBottom: 12 }}>
            Convert instantly between NGN, USD, GBP, and EUR with zero hidden spread.
          </Text>

          <Text style={{ fontSize: 12, fontWeight: '800', color: titleColor, marginBottom: 6 }}>Convert From</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
            {(['NGN', 'USD', 'GBP', 'EUR'] as const).map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setFxFrom(c)}
                style={[styles.chip, fxFrom === c && { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: fxFrom === c ? '#fff' : titleColor }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={{ fontSize: 12, fontWeight: '800', color: titleColor, marginBottom: 6 }}>Convert To</Text>
          <View style={{ flexDirection: 'row', gap: 8, marginBottom: 14 }}>
            {(['USD', 'NGN', 'GBP', 'EUR'] as const).map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => setFxTo(c)}
                style={[styles.chip, fxTo === c && { backgroundColor: theme.accentColor, borderColor: theme.accentColor }]}
              >
                <Text style={{ fontSize: 12, fontWeight: '800', color: fxTo === c ? '#fff' : titleColor }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Field label={`Amount to Convert (${fxFrom})`} value={fxAmt} onChangeText={setFxAmt} keyboardType="numeric" placeholder="50000" />

          <View style={[styles.ratePreviewBox, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderColor: borderCol }]}>
            <Text style={{ fontSize: 11.5, color: mutedColor, fontWeight: '700' }}>Estimated Output ({fxTo})</Text>
            <Text style={{ fontSize: 22, fontWeight: '900', color: theme.accentColor, marginTop: 4 }}>
              {fxTo} {previewSwapOutput()}
            </Text>
            <Text style={{ fontSize: 11, color: mutedColor, marginTop: 2 }}>
              Indicative Rate: 1 USD ≈ ₦1,620 • 1 GBP ≈ ₦2,050 • 1 EUR ≈ ₦1,750
            </Text>
          </View>

          <PrimaryButton
            title={loading ? 'Converting...' : `Execute ${fxFrom} → ${fxTo} Swap Now →`}
            color={theme.primaryColor}
            disabled={loading}
            onPress={async () => {
              if (!fxAmt || Number(fxAmt) <= 0) return Alert.alert('Invalid Amount', 'Enter a valid amount to convert.');
              setLoading(true);
              try {
                const r = await portalApi.fxSwap({ sourceCurrency: fxFrom, targetCurrency: fxTo, amount: Number(fxAmt) });
                Alert.alert('FX Swap ✓', r.success ? `Converted ${fxAmt} ${fxFrom} to ${fxTo}!` : r.error?.message || 'Swap failed.');
                if (r.success) onSuccess();
              } finally {
                setLoading(false);
              }
            }}
          />
        </Card>
      )}

      {hubTab === 'CRYPTO' && (
        <Card>
          <Text style={[styles.title, { color: titleColor }]}>Crypto & Stablecoin Vault</Text>
          <Text style={{ fontSize: 12, color: mutedColor, marginBottom: 12 }}>
            Receive USDT or USDC directly into your {theme.brandName} multi-chain treasury address.
          </Text>

          <View style={{ flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
            {['USDT_TRC20', 'USDT_ERC20', 'USDC', 'BTC'].map((c) => (
              <TouchableOpacity
                key={c}
                onPress={() => {
                  setCryptoAsset(c);
                  setCryptoAddr('');
                }}
                style={[styles.chip, cryptoAsset === c && { backgroundColor: theme.primaryColor, borderColor: theme.primaryColor }]}
              >
                <Text style={{ fontSize: 11.5, fontWeight: '800', color: cryptoAsset === c ? '#fff' : titleColor }}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <PrimaryButton
            title={loading ? 'Generating Address...' : `Get Dedicated ${cryptoAsset} Deposit Address →`}
            color={theme.accentColor}
            disabled={loading}
            onPress={async () => {
              setLoading(true);
              try {
                const r = await portalApi.generateCryptoAddress({ currency: cryptoAsset });
                const addr = r.data?.address || r.data?.walletAddress;
                if (r.success && addr) setCryptoAddr(addr);
                else Alert.alert('Crypto Desk', r.error?.message || 'Could not generate address.');
              } finally {
                setLoading(false);
              }
            }}
          />

          {cryptoAddr ? (
            <View style={[styles.cryptoBox, { backgroundColor: '#065F46' }]}>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, fontWeight: '800' }}>
                {cryptoAsset} DEPOSIT ADDRESS
              </Text>
              <Text selectable style={{ color: '#fff', fontSize: 14.5, fontWeight: '900', marginVertical: 10 }}>
                {cryptoAddr}
              </Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <TouchableOpacity
                  onPress={async () => {
                    await Clipboard.setStringAsync(cryptoAddr);
                    Alert.alert('Copied ✓', `${cryptoAsset} address copied to clipboard.`);
                  }}
                  style={styles.cryptoActionBtn}
                >
                  <Ionicons name="copy" size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Copy Address</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => Share.share({ message: `${theme.brandName} ${cryptoAsset} Address:\n${cryptoAddr}` })}
                  style={styles.cryptoActionBtn}
                >
                  <Ionicons name="share-social" size={14} color="#fff" />
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '800' }}>Share</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </Card>
      )}

      {hubTab === 'FLIGHTS' && (
        <Card>
          <Text style={[styles.title, { color: titleColor }]}>Domestic & Global Flights (NDC)</Text>
          <Text style={{ fontSize: 12, color: mutedColor, marginBottom: 12 }}>
            Search live airline inventory and book instant e-tickets with PNR confirmation.
          </Text>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <View style={{ flex: 1 }}>
              <Field label="Origin IATA" value={fltFrom} onChangeText={setFltFrom} autoCapitalize="characters" placeholder="LOS" />
            </View>
            <View style={{ flex: 1 }}>
              <Field label="Destination IATA" value={fltTo} onChangeText={setFltTo} autoCapitalize="characters" placeholder="ABV" />
            </View>
          </View>
          <Field label="Departure Date (YYYY-MM-DD)" value={fltDate} onChangeText={setFltDate} placeholder="2026-12-01" />

          <PrimaryButton
            title={loading ? 'Searching Live Flights...' : 'Search Live Flights →'}
            color={theme.accentColor}
            disabled={loading}
            onPress={async () => {
              setLoading(true);
              try {
                const r = await portalApi.searchFlights({
                  origin: fltFrom.trim().toUpperCase(),
                  destination: fltTo.trim().toUpperCase(),
                  departureDate: fltDate.trim(),
                  cabinClass: 'economy',
                });
                const list = r.data?.offers || r.data?.flights || [];
                setFlightOffers(Array.isArray(list) ? list : []);
                if (!r.success) Alert.alert('Flight Search', r.error?.message || 'Unable to search flights.');
              } finally {
                setLoading(false);
              }
            }}
          />

          {flightOffers.length > 0 && (
            <View style={{ marginTop: 14, gap: 10 }}>
              <Text style={{ fontSize: 13, fontWeight: '900', color: titleColor }}>
                Available Flights ({flightOffers.length})
              </Text>
              {flightOffers.slice(0, 6).map((fl: any, idx: number) => {
                const price = Number(fl.amountNgn || fl.priceNgn || fl.price || 95000);
                const airline = fl.airline || fl.carrierName || 'Air Peace / NDC Carrier';
                return (
                  <View key={fl.id || idx} style={[styles.flightCard, { borderColor: borderCol, backgroundColor: isDark ? '#1E293B' : '#F8FAFC' }]}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <View>
                        <Text style={{ fontWeight: '900', fontSize: 14, color: titleColor }}>
                          {fltFrom.toUpperCase()} ✈ {fltTo.toUpperCase()}
                        </Text>
                        <Text style={{ fontSize: 12, color: mutedColor, marginTop: 2 }}>
                          {airline} • {fltDate}
                        </Text>
                      </View>
                      <Text style={{ fontWeight: '900', fontSize: 16, color: theme.accentColor }}>
                        ₦{price.toLocaleString()}
                      </Text>
                    </View>
                    <View style={{ marginTop: 10 }}>
                      <PrimaryButton
                        title="Book Flight Now →"
                        color={theme.primaryColor}
                        onPress={async () => {
                          const bk = await portalApi.bookFlight({
                            offerId: fl.id || fl.offerId,
                            origin: fltFrom.toUpperCase(),
                            destination: fltTo.toUpperCase(),
                            departureDate: fltDate,
                            airline,
                            amountNgn: price,
                          });
                          if (!bk.success) return Alert.alert('Booking Failed', bk.error?.message || 'Could not issue ticket.');
                          Alert.alert('Ticket Confirmed ✓', `PNR: ${bk.data?.pnr}\nRef: ${bk.data?.reference}`);
                          onSuccess();
                        }}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          )}
        </Card>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  hubTabsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  hubTabBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, borderRadius: 14, borderWidth: 1 },
  title: { fontSize: 16, fontWeight: '900', marginBottom: 6 },
  chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, borderWidth: 1, borderColor: '#cbd5e1', backgroundColor: 'transparent' },
  ratePreviewBox: { borderRadius: 14, padding: 14, borderWidth: 1, marginBottom: 14 },
  cryptoBox: { borderRadius: 16, padding: 16, marginTop: 14 },
  cryptoActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },
  flightCard: { borderRadius: 14, padding: 14, borderWidth: 1 },
});
