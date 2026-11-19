import Constants from 'expo-constants';
import * as SecureStore from 'expo-secure-store';

const extra = (Constants.expoConfig?.extra || {}) as Record<string, string>;
const BASE_URL = (extra.apiBaseUrl || 'https://fin.slikpay.online').replace(/\/$/, '');
const TENANT_SLUG = extra.tenantSlug || 'fin';
const TOKEN_KEY = `bankneza_portal_jwt_${TENANT_SLUG}`;

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function setToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function clearToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

export async function apiRequest<T = any>(
  path: string,
  options: { method?: string; body?: unknown; auth?: boolean } = {}
): Promise<{ success: boolean; data?: T; error?: { code?: string; message?: string; requires2fa?: boolean } }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-Slug': TENANT_SLUG,
  };
  if (options.auth !== false) {
    const t = await getToken();
    if (t) headers.Authorization = `Bearer ${t}`;
  }
  const sep = path.includes('?') ? '&' : '?';
  const url = `${BASE_URL}${path}${sep}tenant=${encodeURIComponent(TENANT_SLUG)}`;
  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });
  return res.json();
}

export const portalApi = {
  getTenantConfig: () => apiRequest('/api/public/tenant-config', { auth: false }),
  login: (body: { email: string; password: string; totpCode?: string }) =>
    apiRequest('/api/portal/login', { method: 'POST', body, auth: false }),
  register: (body: { fullName: string; email: string; phone: string; password: string; bvn?: string; referralCode?: string }) =>
    apiRequest('/api/portal/register', { method: 'POST', body, auth: false }),
  verifyEmail: (body: { email: string; code: string }) =>
    apiRequest('/api/portal/verify-email', { method: 'POST', body, auth: false }),
  resendOtp: (email: string) =>
    apiRequest('/api/portal/resend-otp', { method: 'POST', body: { email }, auth: false }),
  forgotPassword: (email: string) =>
    apiRequest('/api/portal/forgot-password', { method: 'POST', body: { email }, auth: false }),
  resetPassword: (body: { email: string; code: string; newPassword: string }) =>
    apiRequest('/api/portal/reset-password', { method: 'POST', body, auth: false }),
  getNotifications: () => apiRequest('/api/portal/notifications'),
  getMe: () => apiRequest('/api/portal/me'),
  getBanks: () => apiRequest('/api/portal/banks'),
  resolveAccount: (body: { bankCode: string; accountNumber: string }) =>
    apiRequest('/api/portal/resolve-account', { method: 'POST', body }),
  sendTransfer: (body: {
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    narration: string;
    totpCode?: string;
  }) => apiRequest('/api/portal/transfer', { method: 'POST', body }),
  resolveP2p: (identifier: string) =>
    apiRequest('/api/portal/p2p/resolve', { method: 'POST', body: { identifier } }),
  sendP2pTransfer: (body: { identifier: string; amount: number; narration?: string; totpCode?: string }) =>
    apiRequest('/api/portal/p2p/transfer', { method: 'POST', body }),
  getBeneficiaries: () => apiRequest('/api/portal/beneficiaries'),
  saveBeneficiary: (body: { bankCode: string; bankName: string; accountNumber: string; accountName: string }) =>
    apiRequest('/api/portal/beneficiaries', { method: 'POST', body }),
  getBillsData: () => apiRequest('/api/portal/bills/data'),
  getDataPlans: (operator: string) =>
    apiRequest(`/api/portal/bills/data-plans?operator=${encodeURIComponent(operator)}`),
  validateBill: (body: { category: string; disco?: string; provider?: string; meterNumber?: string; smartcardNumber?: string }) =>
    apiRequest('/api/portal/bills/validate', { method: 'POST', body }),
  purchaseBill: (body: { category: string; providerName: string; customerRef: string; amountNgn: number; planCode?: string }) =>
    apiRequest('/api/portal/bills/purchase', { method: 'POST', body }),
  issueVirtualCard: (body: { cardScheme: string; currency: string }) =>
    apiRequest('/api/portal/cards/virtual', { method: 'POST', body }),
  toggleVirtualCard: (id: string, status: 'ACTIVE' | 'FROZEN') =>
    apiRequest(`/api/portal/cards/virtual/${id}/status`, { method: 'PATCH', body: { status } }),
  fundVirtualCard: (id: string, amount: number) =>
    apiRequest(`/api/portal/cards/virtual/${id}/fund`, { method: 'POST', body: { amount } }),
  orderPhysicalCard: (body: { cardScheme: string; deliveryAddress: string; phone: string }) =>
    apiRequest('/api/portal/cards/physical-order', { method: 'POST', body }),
  upgradeKyc: (bvn: string) =>
    apiRequest('/api/portal/kyc/upgrade', { method: 'POST', body: { bvn } }),
  submitKyc: (body: { bvn?: string; nin?: string; rcNumber?: string }) =>
    apiRequest('/api/portal/kyc/upgrade', { method: 'POST', body }),
  setup2fa: () => apiRequest('/api/portal/security/2fa/setup', { method: 'POST' }),
  verify2fa: (code: string) => apiRequest('/api/portal/security/2fa/verify', { method: 'POST', body: { code } }),
  changePassword: (body: { currentPassword: string; newPassword: string }) =>
    apiRequest('/api/portal/security/change-password', { method: 'POST', body }),
  deleteAccount: () => apiRequest('/api/portal/account', { method: 'DELETE' }),
  getSupportTickets: () => apiRequest('/api/portal/support/tickets'),
  createSupportTicket: (body: { subject: string; category: string; message: string }) =>
    apiRequest('/api/portal/support/tickets', { method: 'POST', body }),
  searchFlights: (body: { origin: string; destination: string; departureDate: string; cabinClass: string }) =>
    apiRequest('/api/portal/flights/search', { method: 'POST', body }),
  bookFlight: (body: {
    offerId?: string;
    origin: string;
    destination: string;
    departureDate: string;
    airline: string;
    amountNgn: number;
    passengerName?: string;
    passengerEmail?: string;
  }) => apiRequest('/api/portal/flights/book', { method: 'POST', body }),
  fundBetting: (body: { operator: string; customerId: string; amount: number }) =>
    apiRequest('/api/portal/betting/fund', { method: 'POST', body }),
  getFxRates: () => apiRequest('/api/portal/fx/rates'),
  fxSwap: (body: { sourceCurrency: string; targetCurrency: string; amount: number }) =>
    apiRequest('/api/portal/fx/swap', { method: 'POST', body }),
  sendRemittance: (body: { type: string; currency: string; beneficiaryName: string; accountNumber: string; amount: number }) =>
    apiRequest('/api/portal/remittance/send', { method: 'POST', body }),
  getCryptoDesk: () => apiRequest('/api/portal/crypto/desk'),
  generateCryptoAddress: (body: { currency: string }) =>
    apiRequest('/api/portal/crypto/address', { method: 'POST', body }),
};
