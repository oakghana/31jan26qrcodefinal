/**
 * Device information caching utility
 * Caches device info for 1 hour to reduce repeated collection
 */

import { CacheWithTTL } from './performance-utils';

interface DeviceInfo {
  userAgent: string;
  platform: string;
  screenResolution: string;
  browserLanguage: string;
  timezone: string;
  deviceId: string;
  timestamp: number;
}

// Cache with 1 hour TTL
const deviceCache = new CacheWithTTL<DeviceInfo>(3600000);

export function getCachedDeviceInfo(): DeviceInfo | null {
  return deviceCache.get('device-info');
}

export async function getDeviceInfoOptimized(): Promise<DeviceInfo> {
  // Check cache first
  const cached = getCachedDeviceInfo();
  if (cached) {
    return cached;
  }

  // Collect device info
  const deviceInfo = collectDeviceInfo();
  
  // Cache it
  deviceCache.set('device-info', deviceInfo);
  
  return deviceInfo;
}

function collectDeviceInfo(): DeviceInfo {
  const navigator = typeof window !== 'undefined' ? window.navigator : null;
  
  return {
    userAgent: navigator?.userAgent || '',
    platform: navigator?.platform || '',
    screenResolution: typeof window !== 'undefined' 
      ? `${window.screen.width}x${window.screen.height}` 
      : '',
    browserLanguage: navigator?.language || 'en-US',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    deviceId: getOrCreateDeviceId(),
    timestamp: Date.now(),
  };
}

function getOrCreateDeviceId(): string {
  if (typeof localStorage === 'undefined') return 'unknown';
  
  let deviceId = localStorage.getItem('device-id');
  
  if (!deviceId) {
    // Create a new device ID based on various factors
    deviceId = `device-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem('device-id', deviceId);
  }
  
  return deviceId;
}

export function invalidateDeviceCache(): void {
  deviceCache.delete('device-info');
}

export function getDeviceCacheStatus(): { cached: boolean; age?: number } {
  const cached = getCachedDeviceInfo();
  
  if (!cached) {
    return { cached: false };
  }
  
  return {
    cached: true,
    age: Date.now() - cached.timestamp,
  };
}
