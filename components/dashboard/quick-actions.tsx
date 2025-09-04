"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, MapPin, QrCode, Calendar } from "lucide-react"
import Link from "next/link"

export function QuickActions() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Quick Actions</CardTitle>
        <CardDescription>Common tasks and shortcuts</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Button asChild className="h-auto flex-col gap-2 p-4 bg-transparent" variant="outline">
          <Link href="/dashboard/attendance">
            <Clock className="h-6 w-6 text-primary" />
            <div className="text-center">
              <div className="font-medium">Check In/Out</div>
              <div className="text-xs text-muted-foreground">Record attendance</div>
            </div>
          </Link>
        </Button>

        <Button asChild className="h-auto flex-col gap-2 p-4 bg-transparent" variant="outline">
          <Link href="/dashboard/locations">
            <MapPin className="h-6 w-6 text-primary" />
            <div className="text-center">
              <div className="font-medium">View Locations</div>
              <div className="text-xs text-muted-foreground">QCC campuses</div>
            </div>
          </Link>
        </Button>

        <Button asChild className="h-auto flex-col gap-2 p-4 bg-transparent" variant="outline">
          <Link href="/dashboard/qr-events">
            <QrCode className="h-6 w-6 text-primary" />
            <div className="text-center">
              <div className="font-medium">Scan QR</div>
              <div className="text-xs text-muted-foreground">Event attendance</div>
            </div>
          </Link>
        </Button>

        <Button asChild className="h-auto flex-col gap-2 p-4 bg-transparent" variant="outline">
          <Link href="/dashboard/schedule">
            <Calendar className="h-6 w-6 text-primary" />
            <div className="text-center">
              <div className="font-medium">View Schedule</div>
              <div className="text-xs text-muted-foreground">Upcoming events</div>
            </div>
          </Link>
        </Button>
      </CardContent>
    </Card>
  )
}
