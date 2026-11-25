import React from 'react';
import Svg, { Circle, Path, Rect } from 'react-native-svg';

export interface AppIconProps {
  name: string;
  size?: number;
  color?: string;
  style?: any;
}

const ICON_PATHS: Record<string, (color: string) => React.ReactNode> = {
  'home': (c) => <Path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" fill={c} />,
  'home-outline': (c) => <Path d="M3 10.5L12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5z" stroke={c} strokeWidth={2} strokeLinejoin="round" fill="none" />,
  'paper-plane': (c) => <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill={c} fillOpacity={0.2} />,
  'paper-plane-outline': (c) => <Path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'flash': (c) => <Path d="M13 2L4 14h7l-1 8 10-12h-7l0-8z" fill={c} />,
  'flash-outline': (c) => <Path d="M13 2L4 14h7l-1 8 10-12h-7l0-8z" stroke={c} strokeWidth={2} strokeLinejoin="round" fill="none" />,
  'card': (c) => (
    <>
      <Rect x="2" y="5" width="20" height="14" rx="2.5" fill={c} />
      <Path d="M2 10h20" stroke="#fff" strokeWidth={2} />
    </>
  ),
  'card-outline': (c) => (
    <>
      <Rect x="2" y="5" width="20" height="14" rx="2.5" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M2 10h20" stroke={c} strokeWidth={2} />
    </>
  ),
  'person': (c) => (
    <>
      <Circle cx="12" cy="8" r="4" fill={c} />
      <Path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" fill={c} />
    </>
  ),
  'person-outline': (c) => (
    <>
      <Circle cx="12" cy="8" r="4" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M4 20c0-3.5 3.6-6 8-6s8 2.5 8 6" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </>
  ),
  'arrow-down-circle': (c) => (
    <>
      <Circle cx="12" cy="12" r="9.5" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M12 8v8m0 0l-3.5-3.5M12 16l3.5-3.5" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  'swap-horizontal': (c) => <Path d="M7 7h13m0 0l-3-3m3 3l-3 3M17 17H4m0 0l3-3m-3 3l3 3" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'wallet': (c) => (
    <>
      <Rect x="3" y="6" width="18" height="13" rx="2.5" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M16 12.5h5v2h-5a1 1 0 0 1 0-2z" fill={c} />
      <Path d="M6 6V4.5A1.5 1.5 0 0 1 7.5 3H17" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </>
  ),
  'receipt-outline': (c) => <Path d="M6 3h12v18l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V3zm3 5h6m-6 4h6m-6 4h4" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'globe': (c) => (
    <>
      <Circle cx="12" cy="12" r="9.5" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M2.5 12h19M12 2.5c2.8 3 2.8 16 0 19M12 2.5c-2.8 3-2.8 16 0 19" stroke={c} strokeWidth={1.8} fill="none" />
    </>
  ),
  'logo-bitcoin': (c) => (
    <>
      <Circle cx="12" cy="12" r="9.5" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M10 7v10m4-10v10M9 8.5h4.5a2 2 0 0 1 0 4H9m0 0h5a2 2 0 0 1 0 4H9" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </>
  ),
  'airplane': (c) => <Path d="M21 16v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill={c} />,
  'gift': (c) => (
    <>
      <Rect x="3" y="8" width="18" height="4" rx="1" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M5 12v8h14v-8M12 8v12M12 8c-2.5 0-4-1.2-4-2.5S9.5 3.5 12 8zm0 0c2.5 0 4-1.2 4-2.5S14.5 3.5 12 8z" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  'notifications': (c) => <Path d="M18 15v-4a6 6 0 1 0-12 0v4l-2 2v1h16v-1l-2-2zm-4.5 5a1.5 1.5 0 0 1-3 0" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'copy': (c) => (
    <>
      <Rect x="9" y="9" width="11" height="11" rx="2" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </>
  ),
  'refresh': (c) => <Path d="M20 11a8 8 0 0 0-14.5-4.5M4 4v4h4M4 13a8 8 0 0 0 14.5 4.5M20 20v-4h-4" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'eye': (c) => (
    <>
      <Path d="M2 12s3.8-6.5 10-6.5S22 12 22 12s-3.8 6.5-10 6.5S2 12 2 12z" stroke={c} strokeWidth={2} fill="none" />
      <Circle cx="12" cy="12" r="3" stroke={c} strokeWidth={2} fill="none" />
    </>
  ),
  'eye-off': (c) => <Path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 5.2A10.4 10.4 0 0 1 12 5c6.2 0 10 7 10 7a17 17 0 0 1-3.2 4.3M6.6 6.6C3.9 8.5 2 12 2 12s3.8 7 10 7c1.7 0 3.3-.4 4.7-1.1" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'shield-checkmark': (c) => (
    <>
      <Path d="M12 2l7 3.5v6c0 5-3.1 8.9-7 10.5-3.9-1.6-7-5.5-7-10.5v-6L12 2z" stroke={c} strokeWidth={2} strokeLinejoin="round" fill="none" />
      <Path d="M9 12l2 2 4-4" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  'checkmark-circle': (c) => (
    <>
      <Circle cx="12" cy="12" r="9.5" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M8.5 12.2l2.3 2.3 4.7-4.8" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  'alert-circle': (c) => (
    <>
      <Circle cx="12" cy="12" r="9.5" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M12 7.5v5.5M12 16.5h.01" stroke={c} strokeWidth={2.2} strokeLinecap="round" fill="none" />
    </>
  ),
  'chevron-forward': (c) => <Path d="M9 6l6 6-6 6" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'arrow-back': (c) => <Path d="M19 12H5m0 0l6-6m-6 6l6 6" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'arrow-back-circle': (c) => (
    <>
      <Circle cx="12" cy="12" r="9.5" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M15 12H9m0 0l3-3m-3 3l3 3" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  'close-circle': (c) => (
    <>
      <Circle cx="12" cy="12" r="9.5" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M9 9l6 6m0-6l-6 6" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </>
  ),
  'arrow-up': (c) => <Path d="M12 19V5m0 0l-5 5m5-5l5 5" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'arrow-down': (c) => <Path d="M12 5v14m0 0l-5-5m5 5l5-5" stroke={c} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'key': (c) => (
    <>
      <Circle cx="8" cy="15" r="4" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M11 12l8-8m0 0h-3.5M19 4v3.5" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  'lock-closed': (c) => (
    <>
      <Rect x="5" y="10" width="14" height="10" rx="2" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M8 10V7a4 4 0 0 1 8 0v3" stroke={c} strokeWidth={2} fill="none" />
    </>
  ),
  'headset': (c) => <Path d="M4 15v-3a8 8 0 0 1 16 0v3m-16 0a2 2 0 0 0 2 2h1v-5H6a2 2 0 0 0-2 2zm16 0a2 2 0 0 1-2 2h-1v-5h1a2 2 0 0 1 2 2z" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />,
  'document-text': (c) => <Path d="M7 3h7l5 5v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zm7 0v5h5M9 12h6m-6 4h6" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'trash': (c) => <Path d="M4 7h16M9 7V4h6v3m-8 0l1 13h8l1-13" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'log-out-outline': (c) => <Path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14l5-5-5-5m5 5H9" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'finger-print': (c) => <Path d="M12 11a2 2 0 0 1 2 2c0 2.5-.5 5-2 7m-4-7a6 6 0 0 1 12 0c0 3-.5 5-1.5 6.5M5 13a7 7 0 0 1 14 0" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />,
  'call': (c) => <Path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" stroke={c} strokeWidth={2} strokeLinejoin="round" fill="none" />,
  'wifi': (c) => <Path d="M5 12.5a10 10 0 0 1 14 0M8.5 16a5.5 5.5 0 0 1 7 0M12 19.5h.01" stroke={c} strokeWidth={2.2} strokeLinecap="round" fill="none" />,
  'tv': (c) => (
    <>
      <Rect x="3" y="6" width="18" height="12" rx="2" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M8 21h8M9 3l3 3 3-3" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </>
  ),
  'trophy': (c) => <Path d="M8 4h8v5a4 4 0 0 1-8 0V4zm0 2H4v2a3 3 0 0 0 4 2.8M16 6h4v2a3 3 0 0 1-4 2.8M12 13v5m-4 2h8" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'business': (c) => <Path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 10h4v11M2 21h20M8 7h2m-2 4h2m-2 4h2m2-8h2m-2 4h2" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
  'add-circle': (c) => (
    <>
      <Circle cx="12" cy="12" r="9.5" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M12 8v8m-4-4h8" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />
    </>
  ),
  'bookmark': (c) => <Path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" fill={c} />,
  'bookmark-outline': (c) => <Path d="M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1z" stroke={c} strokeWidth={2} strokeLinejoin="round" fill="none" />,
  'snow': (c) => <Path d="M12 3v18M4.5 7.5l15 9m0-9l-15 9" stroke={c} strokeWidth={2} strokeLinecap="round" fill="none" />,
  'flame': (c) => <Path d="M12 2c2 3.5 5 5.5 5 10a5 5 0 1 1-10 0c0-2.5 1-4.5 2-6 1 2 2 2.5 3 2.5-.5-2 0-4.5 0-6.5z" stroke={c} strokeWidth={2} strokeLinejoin="round" fill="none" />,
  'share-social': (c) => (
    <>
      <Circle cx="18" cy="5" r="2.5" stroke={c} strokeWidth={2} fill="none" />
      <Circle cx="6" cy="12" r="2.5" stroke={c} strokeWidth={2} fill="none" />
      <Circle cx="18" cy="19" r="2.5" stroke={c} strokeWidth={2} fill="none" />
      <Path d="M8.3 10.8l7.4-4.6m-7.4 7l7.4 4.6" stroke={c} strokeWidth={2} fill="none" />
    </>
  ),
  'mail-open': (c) => <Path d="M3 9l9-6 9 6v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9zm0 0l9 6 9-6" stroke={c} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" fill="none" />,
};

export const Ionicons: React.FC<AppIconProps> = ({ name, size = 22, color = '#0F172A', style }) => {
  const renderer = ICON_PATHS[name] || ICON_PATHS['shield-checkmark'];
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" style={style}>
      {renderer(color)}
    </Svg>
  );
};
(Ionicons as any).font = {};
