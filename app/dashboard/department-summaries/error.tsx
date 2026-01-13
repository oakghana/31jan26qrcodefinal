"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AlertTriangle } from "lucide-react"
import Link from "next/link"

export default function DepartmentSummariesError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[v0] Department summaries error:", error)
  }, [error])

  return (
    <div className="container mx-auto p-6">
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            <CardTitle>Error Loading Department Summaries</CardTitle>
          </div>
          <CardDescription>Unable to load attendance summaries</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-md bg-muted p-4">
            <p className="text-sm font-mono text-muted-foreground">{error.message || "Unknown error"}</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={reset} className="flex-1">
              Try again
            </Button>
            <Button variant="outline" className="flex-1 bg-transparent" asChild>
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
