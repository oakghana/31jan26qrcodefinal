/**
 * Login optimization hook with debouncing and request deduplication
 */

'use client';

import { useState, useCallback, useRef } from 'react';
import { debounce, AbortableRequest, retryWithBackoff } from '@/lib/performance-utils';

interface LoginAttempt {
  email: string;
  password: string;
  timestamp: number;
}

export function useLoginOptimization() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const lastAttemptRef = useRef<LoginAttempt | null>(null);
  const abortableRef = useRef(new AbortableRequest());

  // Client-side validation (no API calls)
  const validateForm = useCallback((email: string, password: string): boolean => {
    setValidationError(null);

    if (!email) {
      setValidationError('Email is required');
      return false;
    }

    if (!password) {
      setValidationError('Password is required');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setValidationError('Please enter a valid email address');
      return false;
    }

    if (password.length < 6) {
      setValidationError('Password must be at least 6 characters');
      return false;
    }

    return true;
  }, []);

  // Debounced login function to prevent rapid submissions
  const debouncedSubmit = useCallback(
    debounce(
      async (email: string, password: string, submitFn: (email: string, password: string, signal: AbortSignal) => Promise<any>) => {
        if (!validateForm(email, password)) {
          return;
        }

        // Prevent duplicate submissions
        const now = Date.now();
        if (
          lastAttemptRef.current &&
          lastAttemptRef.current.email === email &&
          now - lastAttemptRef.current.timestamp < 1000
        ) {
          return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
          const signal = abortableRef.current.start();

          await retryWithBackoff(
            () => submitFn(email, password, signal),
            2, // Retry once on failure
            500 // Initial delay 500ms
          );

          lastAttemptRef.current = { email, password, timestamp: now };
        } catch (err) {
          if (err instanceof Error) {
            if (err.name === 'AbortError') {
              setError('Login cancelled');
            } else {
              setError(err.message || 'Login failed. Please try again.');
            }
          } else {
            setError('An unexpected error occurred');
          }
        } finally {
          setIsSubmitting(false);
        }
      },
      300 // 300ms debounce delay
    ),
    [validateForm]
  );

  const cancelRequest = useCallback(() => {
    abortableRef.current.cancel();
    setIsSubmitting(false);
  }, []);

  const clearErrors = useCallback(() => {
    setError(null);
    setValidationError(null);
  }, []);

  return {
    isSubmitting,
    error,
    validationError,
    validateForm,
    submitLogin: debouncedSubmit,
    cancelRequest,
    clearErrors,
  };
}

// Hook for managing login session cache
export function useLoginSessionCache() {
  const getSessionData = useCallback(() => {
    if (typeof window === 'undefined') return null;
    
    const cached = sessionStorage.getItem('login-session');
    if (!cached) return null;

    try {
      const data = JSON.parse(cached);
      // Check if session is still valid (less than 24 hours old)
      if (Date.now() - data.timestamp > 86400000) {
        sessionStorage.removeItem('login-session');
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }, []);

  const setSessionData = useCallback((data: any) => {
    if (typeof window === 'undefined') return;
    
    sessionStorage.setItem(
      'login-session',
      JSON.stringify({
        ...data,
        timestamp: Date.now(),
      })
    );
  }, []);

  const clearSessionData = useCallback(() => {
    if (typeof window === 'undefined') return;
    sessionStorage.removeItem('login-session');
  }, []);

  return { getSessionData, setSessionData, clearSessionData };
}
