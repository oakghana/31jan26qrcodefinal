import { toast } from "sonner"

interface FetchOptions extends RequestInit {
  showErrorToast?: boolean
  showSuccessToast?: boolean
  successMessage?: string
}

interface ApiResponse<T> {
  data?: T
  error?: string
  status: number
}

/**
 * Centralized API client to reduce code duplication and standardize error handling
 * Used across 119+ fetch patterns in the codebase
 */
export async function apiCall<T>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const {
    showErrorToast = true,
    showSuccessToast = false,
    successMessage = "",
    ...fetchOptions
  } = options

  try {
    const response = await fetch(endpoint, {
      headers: {
        "Content-Type": "application/json",
        ...fetchOptions.headers,
      },
      ...fetchOptions,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      const errorMessage =
        errorData.error || `API Error: ${response.status} ${response.statusText}`

      if (showErrorToast) {
        toast.error(errorMessage)
      }

      return { error: errorMessage, status: response.status }
    }

    const data = await response.json()

    if (showSuccessToast && successMessage) {
      toast.success(successMessage)
    }

    return { data, status: response.status }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred"

    if (showErrorToast) {
      toast.error(errorMessage)
    }

    return { error: errorMessage, status: 500 }
  }
}

/**
 * Batch multiple API calls with error handling
 */
export async function apiBatchCall<T>(
  endpoints: string[],
  options: FetchOptions = {}
): Promise<ApiResponse<T[]>> {
  try {
    const results = await Promise.all(
      endpoints.map((endpoint) => apiCall<T>(endpoint, { ...options, showErrorToast: false }))
    )

    const hasErrors = results.some((r) => r.error)
    if (hasErrors && options.showErrorToast) {
      toast.error("Some requests failed. Check the results.")
    }

    return {
      data: results.map((r) => r.data).filter(Boolean) as T[],
      status: results.some((r) => r.status >= 400) ? 400 : 200,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Batch request failed"

    if (options.showErrorToast) {
      toast.error(errorMessage)
    }

    return { error: errorMessage, status: 500 }
  }
}
