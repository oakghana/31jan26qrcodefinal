/**
 * Location data caching utility
 * Caches location validation results during the session
 */

import { CacheWithTTL } from './performance-utils';

interface CachedLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

interface LocationValidationResult {
  isValid: boolean;
  distance?: number;
  departmentCode?: string;
  locationName?: string;
}

// Cache locations and validation results for the session (30 minutes)
const locationCache = new CacheWithTTL<CachedLocation>(1800000);
const validationCache = new CacheWithTTL<LocationValidationResult>(300000); // 5 mins

export function getCachedLocation(): CachedLocation | null {
  return locationCache.get('current-location');
}

export function setCachedLocation(location: CachedLocation): void {
  locationCache.set('current-location', location);
}

export function getCachedValidation(
  latitude: number,
  longitude: number,
  departmentCode: string
): LocationValidationResult | null {
  const key = `validation-${latitude}-${longitude}-${departmentCode}`;
  return validationCache.get(key);
}

export function setCachedValidation(
  latitude: number,
  longitude: number,
  departmentCode: string,
  result: LocationValidationResult
): void {
  const key = `validation-${latitude}-${longitude}-${departmentCode}`;
  validationCache.set(key, result);
}

export function getLocation(): Promise<CachedLocation> {
  return new Promise((resolve, reject) => {
    // Check cache first
    const cached = getCachedLocation();
    if (cached && Date.now() - cached.timestamp < 60000) {
      // Use cached if less than 1 minute old
      return resolve(cached);
    }

    // Request fresh location
    if (!navigator.geolocation) {
      return reject(new Error('Geolocation not supported'));
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const location: CachedLocation = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        
        setCachedLocation(location);
        resolve(location);
      },
      (error) => {
        // Try to use cached location as fallback
        if (cached) {
          resolve(cached);
        } else {
          reject(error);
        }
      },
      {
        enableHighAccuracy: false, // Lower accuracy for faster response
        timeout: 5000,
        maximumAge: 60000, // Reuse position for up to 1 minute
      }
    );
  });
}

export function clearLocationCache(): void {
  locationCache.delete('current-location');
  validationCache.clear();
}

export function getLocationCacheStatus(): {
  location: boolean;
  validation: number;
} {
  return {
    location: getCachedLocation() !== null,
    validation: validationCache['cache']?.size ?? 0,
  };
}
