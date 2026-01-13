"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("[v0] Application error:", error)
  }, [error])

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Something went wrong</CardTitle>
          </div>
          <CardDescription>An error occurred while loading the page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <p className="text-sm font-mono text-muted-foreground">{error.message || "Unknown error"}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              Try again
            </Button>
            <Button
              variant="outline"
              className="flex-1 bg-transparent"
              onClick={() => (window.location.href = "/dashboard")}
            >
              Go to Dashboard
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
