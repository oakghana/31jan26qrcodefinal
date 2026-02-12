import { useState, useCallback, useEffect } from "react"
import { apiCall } from "@/lib/api-client"

interface UseApiState<T> {
  data: T | null
  error: string | null
  loading: boolean
}

interface UseApiOptions {
  immediate?: boolean
  showErrorToast?: boolean
  showSuccessToast?: boolean
  successMessage?: string
}

/**
 * Reusable hook for data fetching with standardized error/loading states
 * Replaces 119+ similar fetch patterns across components
 */
export function useApi<T>(
  endpoint: string | null,
  options: UseApiOptions = {}
): UseApiState<T> & {
  refetch: () => Promise<void>
  mutate: (data: T) => void
} {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const {
    immediate = true,
    showErrorToast = true,
    showSuccessToast = false,
    successMessage = "",
  } = options

  const refetch = useCallback(async () => {
    if (!endpoint) return

    setLoading(true)
    setError(null)

    const result = await apiCall<T>(endpoint, {
      showErrorToast,
      showSuccessToast,
      successMessage,
    })

    if (result.error) {
      setError(result.error)
    } else if (result.data) {
      setData(result.data)
    }

    setLoading(false)
  }, [endpoint, showErrorToast, showSuccessToast, successMessage])

  const mutate = useCallback((newData: T) => {
    setData(newData)
  }, [])

  useEffect(() => {
    if (immediate && endpoint) {
      refetch()
    }
  }, [endpoint, immediate, refetch])

  return {
    data,
    error,
    loading,
    refetch,
    mutate,
  }
}

/**
 * Hook for POST/PUT/DELETE mutations
 */
export function useMutation<T>(
  endpoint: string,
  method: "POST" | "PUT" | "DELETE" = "POST",
  options: UseApiOptions = {}
) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const mutate = useCallback(
    async (payload?: unknown) => {
      setLoading(true)
      setError(null)

      const result = await apiCall<T>(endpoint, {
        method,
        body: payload ? JSON.stringify(payload) : undefined,
        ...options,
      })

      if (result.error) {
        setError(result.error)
      } else if (result.data) {
        setData(result.data)
      }

      setLoading(false)
      return result
    },
    [endpoint, method, options]
  )

  return {
    data,
    error,
    loading,
    mutate,
  }
}
