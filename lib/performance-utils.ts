/**
 * Performance utility functions for debouncing, throttling, batching, and caching
 */

// Debounce utility to prevent rapid repeated calls
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    lastArgs = args;
    
    if (timeout) clearTimeout(timeout);
    
    timeout = setTimeout(() => {
      if (lastArgs) {
        func(...lastArgs);
      }
      timeout = null;
    }, wait);
  };
}

// Request deduplication - prevent multiple identical requests in flight
const pendingRequests = new Map<string, Promise<any>>();

export async function dedupedFetch<T>(
  key: string,
  fetcher: () => Promise<T>
): Promise<T> {
  if (pendingRequests.has(key)) {
    return pendingRequests.get(key)!;
  }

  const promise = fetcher().finally(() => {
    pendingRequests.delete(key);
  });

  pendingRequests.set(key, promise);
  return promise;
}

// Simple cache with TTL
export class CacheWithTTL<T> {
  private cache = new Map<string, { value: T; expiry: number }>();

  constructor(private defaultTTL: number = 3600000) {} // 1 hour default

  set(key: string, value: T, ttl?: number): void {
    const expiry = Date.now() + (ttl ?? this.defaultTTL);
    this.cache.set(key, { value, expiry });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  clear(): void {
    this.cache.clear();
  }

  delete(key: string): void {
    this.cache.delete(key);
  }
}

// Request batching utility
export class RequestBatcher<T, R> {
  private batch: T[] = [];
  private timer: NodeJS.Timeout | null = null;
  private batchSize: number;
  private batchWait: number;

  constructor(
    private processBatch: (items: T[]) => Promise<R[]>,
    batchSize: number = 10,
    batchWait: number = 50
  ) {
    this.batchSize = batchSize;
    this.batchWait = batchWait;
  }

  add(item: T): Promise<R> {
    return new Promise((resolve, reject) => {
      this.batch.push(item as any);

      if (this.batch.length >= this.batchSize) {
        this.flush().catch(reject);
      } else if (!this.timer) {
        this.timer = setTimeout(() => this.flush(), this.batchWait);
      }
    });
  }

  private async flush(): Promise<void> {
    if (this.timer) clearTimeout(this.timer);
    this.timer = null;

    if (this.batch.length === 0) return;

    const itemsToProcess = [...this.batch];
    this.batch = [];

    await this.processBatch(itemsToProcess);
  }
}

// Abort controller wrapper for request cancellation
export class AbortableRequest {
  private controller: AbortController | null = null;

  start(): AbortSignal {
    this.controller = new AbortController();
    return this.controller.signal;
  }

  cancel(): void {
    this.controller?.abort();
  }

  isAborted(): boolean {
    return this.controller?.signal.aborted ?? false;
  }
}

// Stale-while-revalidate pattern
export async function staleWhileRevalidate<T>(
  cacheKey: string,
  fetcher: () => Promise<T>,
  cache: CacheWithTTL<T>,
  staleTime: number = 300000 // 5 minutes
): Promise<T> {
  const cached = cache.get(cacheKey);
  
  if (cached) {
    // Return stale data immediately
    // Revalidate in background
    fetcher()
      .then(fresh => cache.set(cacheKey, fresh, staleTime))
      .catch(() => {}); // Silently fail background refresh
    
    return cached;
  }

  // No cache, fetch fresh
  const fresh = await fetcher();
  cache.set(cacheKey, fresh, staleTime);
  return fresh;
}

// Batch parallel operations with concurrency limit
export async function batchParallel<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrency: number = 5
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    const promise = processor(item).then(result => {
      results[i] = result;
    });

    executing.push(promise);

    if (executing.length >= concurrency) {
      await Promise.race(executing);
      executing.splice(executing.indexOf(promise), 1);
    }
  }

  await Promise.all(executing);
  return results;
}

// Exponential backoff retry utility
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | null = null;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      
      if (i < maxRetries - 1) {
        const delay = initialDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError || new Error('Max retries exceeded');
}
