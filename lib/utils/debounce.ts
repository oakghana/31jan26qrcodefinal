"use client"

import { useEffect } from "react"

import { useState } from "react"

export function debounce<T extends (...args: any[]) => any>(func: T, delay: number): (...args: Parameters<T>) => void {
  let timeoutId: NodeJS.Timeout

  return function debounced(...args: Parameters<T>) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => func(...args), delay)
  }
}

export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    return () => {
      clearTimeout(handler)
    }
  }, [value, delay])

  return debouncedValue
}
