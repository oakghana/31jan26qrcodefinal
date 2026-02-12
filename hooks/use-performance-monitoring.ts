/**
 * Performance monitoring hook for tracking app performance metrics
 */

'use client'

import { useEffect, useCallback } from 'react'

interface PerformanceMetrics {
  navigationTiming?: {
    domContentLoaded: number
    loadComplete: number
  }
  resourceTiming?: {
    totalResources: number
    totalSize: number
    totalTime: number
  }
  coreWebVitals?: {
    lcp?: number // Largest Contentful Paint
    fid?: number // First Input Delay
    cls?: number // Cumulative Layout Shift
  }
}

export function usePerformanceMonitoring(componentName?: string) {
  const logMetrics = useCallback(() => {
    if (typeof window === 'undefined' || !window.performance) {
      return
    }

    try {
      const metrics: PerformanceMetrics = {}

      // Navigation Timing
      const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
      if (navTiming) {
        metrics.navigationTiming = {
          domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.domContentLoadedEventStart,
          loadComplete: navTiming.loadEventEnd - navTiming.loadEventStart,
        }
      }

      // Resource Timing
      const resources = performance.getEntriesByType('resource') as PerformanceResourceTiming[]
      if (resources.length > 0) {
        metrics.resourceTiming = {
          totalResources: resources.length,
          totalSize: resources.reduce((acc, r) => acc + (r.transferSize || 0), 0),
          totalTime: resources.reduce((acc, r) => acc + r.duration, 0),
        }
      }

      // Log to console in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[v0] Performance Metrics${componentName ? ` - ${componentName}` : ''}:`, metrics)
      }

      // Send to monitoring service in production
      if (process.env.NODE_ENV === 'production') {
        navigator.sendBeacon('/api/logs', JSON.stringify({
          type: 'performance',
          component: componentName,
          metrics,
          timestamp: new Date().toISOString(),
        }))
      }
    } catch (error) {
      console.error('[v0] Performance monitoring error:', error)
    }
  }, [componentName])

  useEffect(() => {
    // Log metrics after page load
    if (document.readyState === 'complete') {
      logMetrics()
    } else {
      window.addEventListener('load', logMetrics)
      return () => window.removeEventListener('load', logMetrics)
    }
  }, [logMetrics])

  return { logMetrics }
}

export function usePageLoadMetrics() {
  useEffect(() => {
    // Measure First Contentful Paint, Largest Contentful Paint, etc.
    if ('PerformanceObserver' in window) {
      try {
        // LCP (Largest Contentful Paint)
        const lcpObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          const lastEntry = entries[entries.length - 1]
          if (process.env.NODE_ENV === 'development') {
            console.log('[v0] LCP:', lastEntry.startTime)
          }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // CLS (Cumulative Layout Shift)
        const clsObserver = new PerformanceObserver((entryList) => {
          const entries = entryList.getEntries()
          let clsValue = 0
          for (const entry of entries) {
            if ((entry as any).hadRecentInput) continue
            clsValue += (entry as any).value
          }
          if (process.env.NODE_ENV === 'development') {
            console.log('[v0] CLS:', clsValue)
          }
        })
        clsObserver.observe({ entryTypes: ['layout-shift'] })

        return () => {
          lcpObserver.disconnect()
          clsObserver.disconnect()
        }
      } catch (error) {
        console.error('[v0] Performance observer error:', error)
      }
    }
  }, [])
}
