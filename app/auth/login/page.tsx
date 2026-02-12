"use client"

import type React from "react"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { clearAttendanceCache } from "@/lib/utils/attendance-cache"
import { getDeviceInfo } from "@/lib/device-info"
import { useLoginOptimization, useLoginSessionCache } from "@/hooks/use-login-optimization"
import { dedupedFetch } from "@/lib/performance-utils"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRouter } from "next/navigation"
import { useState, useCallback, useRef } from "react"
import Image from "next/image"
import { useNotifications } from "@/components/ui/notification-system"
import { Eye, EyeOff } from "lucide-react"

export default function LoginPage() {
  const [identifier, setIdentifier] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [otpEmail, setOtpEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [otpSent, setOtpSent] = useState(false)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const router = useRouter()
  const abortControllerRef = useRef<AbortController | null>(null)

  const { showFieldError, showSuccess, showError, showWarning } = useNotifications()
  const { submitLogin: debouncedSubmitLogin, validateForm } = useLoginOptimization()
  const { setSessionData } = useLoginSessionCache()

  const logLoginActivity = useCallback(async (userId: string, action: string, success: boolean, method: string) => {
    try {
      // Fire and forget - don't wait for response
      fetch("/api/auth/login-log", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          action,
          success,
          method,
          ip_address: null,
          user_agent: navigator.userAgent,
        }),
        // Use keepalive to ensure request completes even if page unloads
        keepalive: true,
      }).catch(() => {}) // Silently fail
    } catch (error) {
      // Don't throw error - login should continue even if logging fails
    }
  }, [])

  const checkUserApproval = useCallback(async (userId: string) => {
    try {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("user_profiles")
        .select("is_active, first_name, last_name")
        .eq("id", userId)
        .single()

      if (error) {
        console.error("Error checking user approval:", error)
        return { approved: false, error: "Failed to verify account status" }
      }

      if (!data) {
        return { approved: false, error: "User profile not found. Please contact administrator." }
      }

      return {
        approved: data.is_active,
        name: `${data.first_name} ${data.last_name}`,
        error: data.is_active ? null : "Your account is pending admin approval. Please wait for activation.",
      }
    } catch (error) {
      console.error("Exception checking user approval:", error)
      return { approved: false, error: "Failed to verify account status" }
    }
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Cancel any previous requests
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

    setIsLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      let email = identifier

      // If identifier doesn't contain @, look up email from staff number
      if (!identifier.includes("@")) {
        const response = await fetch("/api/auth/lookup-staff", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ identifier }),
          signal: abortControllerRef.current?.signal,
        })

        if (!response.ok) {
          const result = await response.json()
          showFieldError("Staff Number", result.error || "Staff number not found")
          return
        }

        const result = await response.json()
        email = result.email
      }

      // Single authentication call
      const result = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      const { data, error } = result

      if (error) {
        // Log failed attempt
        if (data?.user?.id) {
          logLoginActivity(data.user.id, "login_failed", false, "password")
        }

        // Handle specific error types
        if (error.message.includes("Invalid login credentials")) {
          showFieldError("Credentials", "Invalid credentials. Please check your staff number/email and password.")
        } else if (error.message.includes("Email not confirmed")) {
          showWarning(
            "Please check your email and click the confirmation link before logging in.",
            "Email Confirmation Required",
          )
        } else {
          showError(error.message, "Login Failed")
        }
        return
      }

      // Parallelize approval and device checks
      if (data?.user?.id) {
        const [approvalCheck, deviceCheckResponse] = await Promise.all([
          checkUserApproval(data.user.id),
          fetch("/api/auth/check-device-binding", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              device_id: getDeviceInfo().device_id,
              device_info: getDeviceInfo(),
            }),
            signal: abortControllerRef.current?.signal,
          }).then(r => r.json()).catch(() => ({ allowed: true })),
        ])

        if (!approvalCheck.approved) {
          await logLoginActivity(data.user.id, "login_blocked_unapproved", false, "password")
          await supabase.auth.signOut()
          showWarning(approvalCheck.error || "Account not approved", "Account Approval Required")
          if (approvalCheck.error?.includes("pending admin approval")) {
            router.push("/auth/pending-approval")
          }
          return
        }

        if (!deviceCheckResponse.allowed) {
          await logLoginActivity(data.user.id, "login_blocked_device_violation", false, "password")
          await supabase.auth.signOut()
          showError(
            deviceCheckResponse.message || "This device is registered to another user. Your supervisor has been notified.",
            "Device Security Violation",
          )
          return
        }

        // Log successful login (fire and forget)
        logLoginActivity(data.user.id, "login_success", true, "password")
      }

      // Clear attendance cache
      clearAttendanceCache()

      // Cache session data for faster redirects
      setSessionData({ loginTime: Date.now(), email })

      showSuccess("Login successful! Redirecting...", "Welcome Back")

      // Immediate redirect without delay
      window.location.href = "/dashboard/attendance"
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        // Request was cancelled, don't show error
        return
      }
      showError(error instanceof Error ? error.message : "An error occurred during login", "Login Error")
    } finally {
      setIsLoading(false)
    }
  }

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    
    if (!validateForm(otpEmail, "dummy")) {
      showFieldError("Email", "Please enter a valid email address")
      return
    }

    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      // Use deduped fetch to prevent duplicate OTP requests
      await dedupedFetch(`otp-send-${otpEmail}`, async () => {
        // Validate email with timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 8000) // 8 second timeout

        try {
          const validateResponse = await fetch("/api/auth/validate-email", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Accept: "application/json",
            },
            body: JSON.stringify({ email: otpEmail }),
            signal: controller.signal,
          })

          clearTimeout(timeoutId)

          if (validateResponse.ok) {
            const validateResult = await validateResponse.json()

            if (!validateResult.exists) {
              throw new Error("This email is not registered in the QCC system. Please contact your administrator.")
            } else if (!validateResult.approved) {
              throw new Error("Your account is pending admin approval. Please wait for activation.")
            }
          }
        } catch (error) {
          clearTimeout(timeoutId)
          if (error instanceof Error && error.name === "AbortError") {
            // Continue anyway - let Supabase handle validation
          } else {
            throw error
          }
        }

        // Send OTP
        const otpResult = await supabase.auth.signInWithOtp({
          email: otpEmail,
          options: {
            emailRedirectTo: process.env.NEXT_PUBLIC_DEV_SUPABASE_REDIRECT_URL || `${window.location.origin}/dashboard`,
            shouldCreateUser: false,
          },
        })

        if (otpResult.error) {
          if (otpResult.error.message.includes("Email rate limit exceeded")) {
            throw new Error("Too many OTP requests. Please wait 5 minutes before trying again.")
          } else if (
            otpResult.error.message.includes("User not found") ||
            otpResult.error.message.includes("Signups not allowed")
          ) {
            throw new Error("This email is not registered in the system. Please use password login or contact your administrator.")
          } else if (otpResult.error.message.includes("Invalid email")) {
            throw new Error("Invalid email format. Please check your email address.")
          } else {
            throw new Error(`Failed to send OTP: ${otpResult.error.message}`)
          }
        }

        setOtpSent(true)
        showSuccess("OTP sent to your email. Please check your inbox and enter the code below.", "OTP Sent")
      })
    } catch (error: unknown) {
      if (error instanceof Error && error.name !== "AbortError") {
        showFieldError("Email", error.message || "Failed to send OTP. Please try again.")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    
    if (otp.length !== 6 || !/^\d{6}$/.test(otp)) {
      showFieldError("OTP Code", "OTP code must be 6 digits")
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await supabase.auth.verifyOtp({
        email: otpEmail,
        token: otp,
        type: "email",
      })

      const { data, error } = result

      if (error) {
        if (data?.user?.id) {
          logLoginActivity(data.user.id, "otp_login_failed", false, "otp")
        }

        if (error.message.includes("expired")) {
          showFieldError("OTP Code", "OTP code has expired. Please request a new one.")
        } else if (error.message.includes("invalid")) {
          showFieldError("OTP Code", "Invalid OTP code. Please check and try again.")
        } else {
          showFieldError("OTP Code", "Invalid or expired OTP code. Please try again.")
        }
        return
      }

      // Approval check only (device check already done for OTP path)
      if (data?.user?.id) {
        const approvalCheck = await checkUserApproval(data.user.id)

        if (!approvalCheck.approved) {
          await logLoginActivity(data.user.id, "otp_login_blocked_unapproved", false, "otp")
          await supabase.auth.signOut()
          showWarning(approvalCheck.error || "Account not approved", "Account Approval Required")
          if (approvalCheck.error?.includes("pending admin approval")) {
            router.push("/auth/pending-approval")
          }
          return
        }

        // Log successful login
        await logLoginActivity(data.user.id, "otp_login_success", true, "otp")
      }

      // Cache session data
      setSessionData({ loginTime: Date.now(), email: otpEmail })
      clearAttendanceCache()

      showSuccess("OTP verified successfully! Redirecting to dashboard...", "Login Successful")

      // Immediate redirect
      window.location.href = "/dashboard/attendance"
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        return
      }
      showFieldError("OTP Code", error instanceof Error ? error.message : "Invalid OTP code")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-3 sm:p-4 md:p-6">
      <div className="w-full max-w-md">
        <Card className="glass-effect shadow-2xl border-border/50">
          <CardHeader className="text-center space-y-4 sm:space-y-6 pb-6 sm:pb-8">
            <div className="flex justify-center">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-card border-2 border-primary/20 flex items-center justify-center shadow-lg">
                <Image
                  src="/images/qcc-logo.png"
                  alt="QCC Logo - Quality Control Company Limited"
                  width={80}
                  height={80}
                  className="rounded-full object-contain w-16 h-16 sm:w-20 sm:h-20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <CardTitle className="text-xl sm:text-2xl font-bold text-primary tracking-wide">QCC ELECTRONIC ATTENDANCE</CardTitle>
              <CardDescription className="text-xs sm:text-sm text-muted-foreground">
                Sign in with your Staff Number, Email or use OTP
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent className="px-4 sm:px-6 md:px-8 pb-6 sm:pb-8">
            <Tabs defaultValue="password" className="w-full">
              <TabsList className="grid w-full grid-cols-2 bg-muted/50 p-1 rounded-lg">
                <TabsTrigger
                  value="password"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  Staff Login
                </TabsTrigger>
                <TabsTrigger
                  value="otp"
                  className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-sm"
                >
                  OTP Login
                </TabsTrigger>
              </TabsList>

              <TabsContent value="password" className="space-y-6 mt-6">
                <form onSubmit={handleLogin} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-xs sm:text-sm font-medium text-foreground">
                      Staff Number or Email Address
                    </Label>
                    <Input
                      id="identifier"
                      type="text"
                      placeholder="Enter your corporate email"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      required
                      className="h-11 sm:h-12 border-border focus:border-primary focus:ring-primary bg-input focus-enhanced text-base"
                    />
                    <p className="text-xs text-muted-foreground">
                      Enter your 7-digit staff number (e.g., 1234567) or corporate email address
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-xs sm:text-sm font-medium text-foreground">
                      Password
                    </Label>
                    <div className="relative">
                      <Input
                        id="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        className="h-11 sm:h-12 border-border focus:border-primary focus:ring-primary bg-input focus-enhanced pr-12 text-base"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-foreground/70 hover:text-foreground transition-colors focus:outline-none focus:ring-2 focus:ring-primary rounded p-1"
                        aria-label={showPassword ? "Hide password" : "Show password"}
                        tabIndex={0}
                      >
                        {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 sm:h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 cursor-pointer text-base"
                    disabled={isLoading}
                  >
                    {isLoading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="otp" className="space-y-6 mt-6">
                {!otpSent ? (
                  <form onSubmit={handleSendOtp} className="space-y-6">
                    <div className="space-y-2">
                      <Label htmlFor="otpEmail" className="text-xs sm:text-sm font-medium text-foreground">
                        Corporate Email Address
                      </Label>
                      <Input
                        id="otpEmail"
                        type="email"
                        placeholder="your.email@qccgh.com"
                        value={otpEmail}
                        onChange={(e) => setOtpEmail(e.target.value)}
                        required
                        className="h-11 sm:h-12 border-border focus:border-primary focus:ring-primary bg-input focus-enhanced text-base"
                      />
                      <p className="text-xs text-muted-foreground">OTP will be sent to your registered email address</p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 sm:h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-base"
                      disabled={isLoading}
                    >
                      {isLoading ? "Sending OTP..." : "Send OTP Code"}
                    </Button>
                  </form>
                ) : (
                  <form onSubmit={handleVerifyOtp} className="space-y-6">
                    <div className="space-y-4">
                      <Label htmlFor="otp" className="text-sm font-medium text-foreground">
                        Enter OTP Code
                      </Label>
                      <div className="flex justify-center">
                        <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)} className="gap-2">
                          <InputOTPGroup>
                            <InputOTPSlot
                              index={0}
                              className="w-12 h-12 text-lg border-border focus:border-primary focus:ring-primary bg-input"
                            />
                            <InputOTPSlot
                              index={1}
                              className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg border-border focus:border-primary focus:ring-primary bg-input"
                            />
                            <InputOTPSlot
                              index={2}
                              className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg border-border focus:border-primary focus:ring-primary bg-input"
                            />
                            <InputOTPSlot
                              index={3}
                              className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg border-border focus:border-primary focus:ring-primary bg-input"
                            />
                            <InputOTPSlot
                              index={4}
                              className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg border-border focus:border-primary focus:ring-primary bg-input"
                            />
                            <InputOTPSlot
                              index={5}
                              className="w-10 h-10 sm:w-12 sm:h-12 text-base sm:text-lg border-border focus:border-primary focus:ring-primary bg-input"
                            />
                          </InputOTPGroup>
                        </InputOTP>
                      </div>
                      <p className="text-xs text-muted-foreground text-center">
                        Enter the 6-digit code sent to {otpEmail}
                      </p>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 sm:h-14 bg-primary hover:bg-primary/90 text-primary-foreground font-medium rounded-lg shadow-lg hover:shadow-xl transition-all duration-200 text-base"
                      disabled={isLoading || otp.length !== 6}
                    >
                      {isLoading ? "Verifying..." : "Verify OTP"}
                    </Button>
                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-11 sm:h-12 border-border text-foreground hover:bg-muted bg-transparent text-sm sm:text-base"
                        onClick={() => {
                          setOtpSent(false)
                          setOtp("")
                          setSuccessMessage(null)
                        }}
                      >
                        Back to Email
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1 h-11 sm:h-12 border-primary text-primary hover:bg-primary hover:text-primary-foreground bg-transparent text-sm sm:text-base"
                        onClick={handleSendOtp}
                        disabled={isLoading}
                      >
                        {isLoading ? "Sending..." : "Resend OTP"}
                      </Button>
                    </div>
                  </form>
                )}
              </TabsContent>
            </Tabs>

            <div className="mt-8 text-center">
              <p className="text-sm text-muted-foreground">Don't have an account?</p>
            </div>

          <div className="mt-6 text-center border-t border-border pt-6">
            <p className="text-sm font-medium text-foreground">Quality Control Company Limited</p>
            <p className="text-xs text-muted-foreground mt-1">Intranet Portal - Powered by IT Department</p>
            <p className="text-xs text-muted-foreground mt-2 font-mono text-center">V.2.1.23.26</p>
          </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
