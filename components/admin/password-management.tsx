"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription } from "@/components/ui/alert"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Key, Shield } from "lucide-react"

interface PasswordManagementProps {
  userId?: string
  userEmail?: string
  isAdmin?: boolean
}

export function PasswordManagement({ userId, userEmail, isAdmin = false }: PasswordManagementProps) {
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [adminNewPassword, setAdminNewPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleUserPasswordChange = async () => {
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (newPassword.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword,
          newPassword,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess("Password changed successfully")
        setCurrentPassword("")
        setNewPassword("")
        setConfirmPassword("")
        setIsChangePasswordOpen(false)
      } else {
        setError(result.error || "Failed to change password")
      }
    } catch (error) {
      setError("Failed to change password")
    } finally {
      setLoading(false)
    }
  }

  const handleAdminPasswordReset = async () => {
    if (!userId || !adminNewPassword) {
      setError("User ID and new password are required")
      return
    }

    if (adminNewPassword.length < 6) {
      setError("Password must be at least 6 characters long")
      return
    }

    setLoading(true)
    setError(null)

    try {
      const response = await fetch("/api/admin/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          newPassword: adminNewPassword,
        }),
      })

      const result = await response.json()

      if (result.success) {
        setSuccess("Password reset successfully")
        setAdminNewPassword("")
        setIsChangePasswordOpen(false)
      } else {
        setError(result.error || "Failed to reset password")
      }
    } catch (error) {
      setError("Failed to reset password")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          Password Management
        </CardTitle>
        <CardDescription>
          {isAdmin ? "Reset user passwords as administrator" : "Change your account password"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4">
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        <Dialog open={isChangePasswordOpen} onOpenChange={setIsChangePasswordOpen}>
          <DialogTrigger asChild>
            <Button className="w-full">
              {isAdmin ? <Shield className="mr-2 h-4 w-4" /> : <Key className="mr-2 h-4 w-4" />}
              {isAdmin ? "Reset User Password" : "Change Password"}
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{isAdmin ? "Reset User Password" : "Change Password"}</DialogTitle>
              <DialogDescription>
                {isAdmin
                  ? `Reset password for ${userEmail || "selected user"}`
                  : "Enter your current password and choose a new one"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {isAdmin ? (
                // Admin password reset form
                <div>
                  <Label htmlFor="adminNewPassword">New Password</Label>
                  <Input
                    id="adminNewPassword"
                    type="password"
                    value={adminNewPassword}
                    onChange={(e) => setAdminNewPassword(e.target.value)}
                    placeholder="Enter new password"
                  />
                </div>
              ) : (
                // User password change form
                <>
                  <div>
                    <Label htmlFor="currentPassword">Current Password</Label>
                    <Input
                      id="currentPassword"
                      type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      placeholder="Enter current password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="newPassword">New Password</Label>
                    <Input
                      id="newPassword"
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                    />
                  </div>
                  <div>
                    <Label htmlFor="confirmPassword">Confirm New Password</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                    />
                  </div>
                </>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setIsChangePasswordOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={isAdmin ? handleAdminPasswordReset : handleUserPasswordChange} disabled={loading}>
                {loading ? "Processing..." : isAdmin ? "Reset Password" : "Change Password"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}
