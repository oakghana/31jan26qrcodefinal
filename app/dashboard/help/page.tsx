import { createClient } from "@/lib/supabase/server"
import { redirect } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Separator } from "@/components/ui/separator"
import {
  HelpCircle,
  RefreshCw,
  Eye,
  Trash2,
  Chrome,
  CheckCircle2,
  AlertCircle,

  MapPin,
} from "lucide-react"

export default async function HelpPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/auth/login")
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <HelpCircle className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Help & User Guide</h1>
          <p className="text-muted-foreground">Learn how to use the QCC Attendance System effectively</p>
        </div>
      </div>

      <Alert className="bg-primary/5 border-primary/20">
        <AlertCircle className="h-4 w-4 text-primary" />
        <AlertDescription className="text-sm">
          <strong>Important:</strong> After system updates, you may need to clear your browser cache to see new
          features. Follow the instructions below.
        </AlertDescription>
      </Alert>

      {/* Detailed Instructions */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Clear Browser Cache */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trash2 className="h-5 w-5 text-destructive" />
              Clear Browser Cache
            </CardTitle>
            <CardDescription>Required after system updates to see new features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium">Open Browser Settings</p>
                  <p className="text-sm text-muted-foreground">Click the three dots (⋮) in the top-right corner</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium">Navigate to Privacy & Security</p>
                  <p className="text-sm text-muted-foreground">Settings → Privacy and security → Clear browsing data</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium">Select Time Range</p>
                  <p className="text-sm text-muted-foreground">Choose "All time" from the dropdown</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div className="flex-1">
                  <p className="font-medium">Check Required Items</p>
                  <p className="text-sm text-muted-foreground">
                    Select "Cached images and files" and "Cookies and other site data"
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  5
                </div>
                <div className="flex-1">
                  <p className="font-medium">Clear Data</p>
                  <p className="text-sm text-muted-foreground">Click "Clear data" and wait for completion</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-sm font-bold">
                  6
                </div>
                <div className="flex-1">
                  <p className="font-medium">Restart Browser</p>
                  <p className="text-sm text-muted-foreground">Close and reopen your browser, then log in again</p>
                </div>
              </div>
            </div>

            <Alert className="bg-blue-500/5 border-blue-500/20">
              <Chrome className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <strong>Quick Shortcut:</strong> Press <kbd className="px-2 py-1 bg-muted rounded text-xs">Ctrl</kbd> +{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Shift</kbd> +{" "}
                <kbd className="px-2 py-1 bg-muted rounded text-xs">Delete</kbd> to open Clear browsing data directly
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Refresh Attendance Status Button */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-green-600" />
              Refresh Attendance Status
            </CardTitle>
            <CardDescription>Manually update your attendance status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium mb-2">When to Use:</h4>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>After checking in, if the check-out button doesn't appear</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>If your attendance status shows outdated information</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <span>When the UI doesn't update after an action</span>
                  </li>
                </ul>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">How to Use:</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 text-green-700 flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Go to Attendance Page</p>
                      <p className="text-sm text-muted-foreground">Navigate to Dashboard → Attendance</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 text-green-700 flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Find the Actions Section</p>
                      <p className="text-sm text-muted-foreground">Look for the "Actions" card on the page</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 text-green-700 flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Click Refresh Button</p>
                      <p className="text-sm text-muted-foreground">
                        Click "Refresh Attendance Status" button to update
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-500/10 text-green-700 flex items-center justify-center text-sm font-bold">
                      4
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">Wait for Page Reload</p>
                      <p className="text-sm text-muted-foreground">The page will reload and show your updated status</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <Alert className="bg-green-500/5 border-green-500/20">
              <RefreshCw className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Tip:</strong> The page automatically refreshes after 70 seconds when you check in or check out,
                but you can use this button for immediate updates.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* Password Visibility Toggle */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-blue-600" />
              Password Visibility Toggle
            </CardTitle>
            <CardDescription>Show or hide your password while typing</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-700 flex items-center justify-center text-sm font-bold">
                  1
                </div>
                <div className="flex-1">
                  <p className="font-medium">Go to Login Page</p>
                  <p className="text-sm text-muted-foreground">Navigate to the login page</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-700 flex items-center justify-center text-sm font-bold">
                  2
                </div>
                <div className="flex-1">
                  <p className="font-medium">Enter Your Password</p>
                  <p className="text-sm text-muted-foreground">Type your password in the password field</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-700 flex items-center justify-center text-sm font-bold">
                  3
                </div>
                <div className="flex-1">
                  <p className="font-medium">Click the Eye Icon</p>
                  <p className="text-sm text-muted-foreground">
                    Click the eye icon on the right side of the password field
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-500/10 text-blue-700 flex items-center justify-center text-sm font-bold">
                  4
                </div>
                <div className="flex-1">
                  <p className="font-medium">Toggle Visibility</p>
                  <p className="text-sm text-muted-foreground">
                    Click again to hide the password. The icon changes to indicate the current state.
                  </p>
                </div>
              </div>
            </div>

            <Alert className="bg-amber-500/5 border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong>Security Tip:</strong> Make sure no one is watching your screen when you show your password.
                Always hide it before logging in on shared or public computers.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* GPS Location Accuracy Tips */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-purple-600" />
              GPS Location Accuracy Tips
            </CardTitle>
            <CardDescription>Improve GPS accuracy across different browsers and devices</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert className="bg-amber-500/5 border-amber-500/20">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong>Experiencing GPS issues?</strong> GPS accuracy varies significantly across browsers and devices.
                Follow these tips to improve your location accuracy for reliable check-in.
              </AlertDescription>
            </Alert>

            <div className="grid md:grid-cols-3 gap-6">
              <div className="space-y-3">
                <h4 className="font-medium text-primary">Browser Recommendations</h4>
                <div className="space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Best: Chrome or Edge</p>
                      <p className="text-muted-foreground">Most accurate GPS on Windows devices</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Good: Firefox</p>
                      <p className="text-muted-foreground">Reliable on most devices</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Avoid: Opera</p>
                      <p className="text-muted-foreground">
                        Known GPS issues, often uses IP location (very inaccurate)
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-primary">Windows Users</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                    <p>Go to Settings → Privacy & Security → Location</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                    <p>Turn ON "Location services"</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                    <p>Turn ON "Allow apps to access your location"</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                    <p>Ensure Wi-Fi is connected (improves accuracy significantly)</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                    <p>In browser, click location icon and select "Allow"</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="font-medium text-primary">Physical Location Tips</h4>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                    <p>Move near a window for better GPS signal</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                    <p>Avoid basement or heavily enclosed areas</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                    <p>Stay still while location is being acquired</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                    <p>Wait 10-15 seconds for GPS to get accurate fix</p>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground mt-2 flex-shrink-0" />
                    <p>Clear sky view improves satellite connection</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            <Alert className="bg-green-500/5 border-green-500/20">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Best Tip:</strong> Use Chrome or Edge on Windows for the most accurate GPS. Ensure Wi-Fi is 
                connected and location services are enabled in both your browser and device settings.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <h4 className="font-medium">Understanding GPS Accuracy:</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Good accuracy (0-30m):</strong> GPS check-in will work reliably
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Moderate accuracy (30-100m):</strong> May work, try moving closer to a window
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-orange-600 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Poor accuracy (100m+):</strong> Switch to Chrome/Edge and enable Wi-Fi
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                  <p>
                    <strong>Critical accuracy:</strong> Browser using IP location - switch browser and enable device location
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Additional Tips */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5 text-purple-600" />
              Additional Tips
            </CardTitle>
            <CardDescription>Helpful information for using the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Check-in Requirements</p>
                  <p className="text-muted-foreground">You must be within the device-specific radius of your assigned QCC location to check in</p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Check-out Deadline</p>
                  <p className="text-sm text-muted-foreground">
                    Check out before 11:59 PM. After midnight, the system switches to check-in mode for the new day.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Early Check-out</p>
                  <p className="text-sm text-muted-foreground">
                    If checking out before 5:00 PM, you'll be asked to provide a reason.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Missed Check-out</p>
                  <p className="text-sm text-muted-foreground">
                    If you forget to check out, the system automatically checks you out at 11:59 PM when you check in
                    the next day.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Location Services</p>
                  <p className="text-sm text-muted-foreground">
                    Enable location services in your browser for accurate check-in/check-out tracking.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Browser Recommendation</p>
                  <p className="text-sm text-muted-foreground">
                    Use Chrome or Edge for the best GPS accuracy. Avoid Opera as it may use IP-based location.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Contact Support */}
      <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
        <CardHeader>
          <CardTitle>Need More Help?</CardTitle>
          <CardDescription>Contact your system administrator or IT support team</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            If you're experiencing issues not covered in this guide, please contact your department head or the IT
            support team for assistance. Include details about the issue and any error messages you see.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
