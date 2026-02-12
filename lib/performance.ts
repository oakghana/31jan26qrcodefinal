/**
 * Performance monitoring utilities for tracking page speed and component render times
 */

interface PerformanceMetric {
  name: string
  value: number
  unit: string
}

class PerformanceMonitor {
  private metrics: Map<string, number> = new Map()
  private isProduction = typeof window !== "undefined" && process.env.NODE_ENV === "production"

  /**
   * Mark the start of a performance measurement
   */
  start(label: string) {
    if (typeof window !== "undefined" && window.performance) {
      window.performance.mark(`${label}-start`)
    }
    this.metrics.set(`${label}-start`, Date.now())
  }

  /**
   * Mark the end of a performance measurement and log the duration
   */
  end(label: string): number {
    if (typeof window !== "undefined" && window.performance) {
      window.performance.mark(`${label}-end`)
      try {
        window.performance.measure(label, `${label}-start`, `${label}-end`)
      } catch {
        // Ignore if marks don't exist
      }
    }

    const startTime = this.metrics.get(`${label}-start`) || 0
    const duration = Date.now() - startTime

    if (!this.isProduction) {
      console.log(`[Performance] ${label}: ${duration}ms`)
    }

    return duration
  }

  /**
   * Get all collected metrics
   */
  getMetrics(): PerformanceMetric[] {
    if (typeof window !== "undefined" && window.performance) {
      return window.performance
        .getEntriesByType("measure")
        .map((entry) => ({
          name: entry.name,
          value: Math.round(entry.duration * 100) / 100,
          unit: "ms",
        }))
    }
    return []
  }

  /**
   * Get web vitals (LCP, FID, CLS)
   */
  getWebVitals(): PerformanceMetric[] {
    const metrics: PerformanceMetric[] = []

    // Largest Contentful Paint (LCP)
    const paintEntries = typeof window !== "undefined" ? window.performance?.getEntriesByType("paint") : []
    if (paintEntries?.length) {
      const lcp = paintEntries.find((e) => e.name === "largest-contentful-paint")
      if (lcp) {
        metrics.push({
          name: "LCP",
          value: Math.round(lcp.startTime),
          unit: "ms",
        })
      }
    }

    return metrics
  }
}

export const performanceMonitor = new PerformanceMonitor()
