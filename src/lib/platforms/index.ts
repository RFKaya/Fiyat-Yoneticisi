// =============================================
// Merkezi Platform Registry
// Tüm platform meta verileri burada tanımlıdır.
// Yeni platform eklemek için sadece PLATFORMS dizisine ekleme yapın.
// =============================================

export type PlatformId = 'migros' | 'getir' | 'yemeksepeti' | 'trendyol';

export interface PlatformConfig {
  id: PlatformId;
  displayName: string;
  color: string;
  defaultCommission: number;
  hasOrderDetails: boolean;
}

export const PLATFORMS: PlatformConfig[] = [
  {
    id: 'migros',
    displayName: 'Migros Yemek',
    color: '#ff3c00',
    defaultCommission: 15,
    hasOrderDetails: false,
  },
  {
    id: 'getir',
    displayName: 'Getir Yemek',
    color: '#5d3ebc',
    defaultCommission: 15,
    hasOrderDetails: false,
  },
  {
    id: 'yemeksepeti',
    displayName: 'Yemeksepeti',
    color: '#fa0050',
    defaultCommission: 15,
    hasOrderDetails: true,
  },
  {
    id: 'trendyol',
    displayName: 'Trendyol',
    color: '#ff5a01',
    defaultCommission: 15,
    hasOrderDetails: true,
  },
];

// Hızlı erişim map'i: id → config
export const PLATFORM_MAP: Record<PlatformId, PlatformConfig> = Object.fromEntries(
  PLATFORMS.map(p => [p.id, p])
) as Record<PlatformId, PlatformConfig>;

// Tüm platform id'leri (iterasyon için)
export const PLATFORM_IDS: PlatformId[] = PLATFORMS.map(p => p.id);

// Helper fonksiyonlar
export function getPlatform(id: PlatformId): PlatformConfig {
  return PLATFORM_MAP[id];
}

export function getPlatformColor(id: PlatformId): string {
  return PLATFORM_MAP[id]?.color ?? '#888888';
}
