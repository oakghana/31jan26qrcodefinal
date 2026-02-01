"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Clock, Calendar, Zap, ArrowRight } from "lucide-react"
import Link from "next/link"

export function QuickActions() {
  const actions = [
    {
      title: "Check In/Out",
      description: "Record your daily attendance with location verification",
      href: "/dashboard/attendance",
      icon: Clock,
      gradient: "from-green-50 via-green-100 to-green-150",
      hoverGradient: "hover:from-green-100 hover:via-green-150 hover:to-green-200",
      border: "border-green-200 hover:border-green-300",
      iconBg: "bg-gradient-to-br from-green-100 to-green-200",
      iconColor: "text-green-600",
    },
    {
      title: "Leave Notification",
      description: "Submit a leave notification for approval by your manager",
      href: "/dashboard/leave-management",
      icon: Calendar,
      gradient: "from-orange-50 via-orange-100 to-orange-150",
      hoverGradient: "hover:from-orange-100 hover:via-orange-150 hover:to-orange-200",
      border: "border-orange-200 hover:border-orange-300",
      iconBg: "bg-gradient-to-br from-orange-100 to-orange-200",
      iconColor: "text-orange-600",
    },
    {
      title: "View Schedule",
      description: "Check upcoming events and important dates",
      href: "/dashboard/schedule",
      icon: Calendar,
      gradient: "from-emerald-50 via-emerald-100 to-emerald-150",
      hoverGradient: "hover:from-emerald-100 hover:via-emerald-150 hover:to-emerald-200",
      border: "border-emerald-200 hover:border-emerald-300",
      iconBg: "bg-gradient-to-br from-emerald-100 to-emerald-200",
      iconColor: "text-emerald-600",
    },
  ]

  return (
    <Card className="bg-slate-900 text-white backdrop-blur-xl border-slate-800/40 shadow-2xl">
      <CardHeader className="pb-6">
        <CardTitle className="text-xl font-bold flex items-center gap-3">
          <div className="p-2 rounded-xl bg-slate-800/60 border border-slate-700/50">
            <Zap className="h-5 w-5 text-white" />
          </div>
          Quick Actions
        </CardTitle>
        <CardDescription className="text-lg">Access your most frequently used features</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Button
              key={action.href}
              asChild
              className={`h-auto w-full flex items-center gap-6 p-6 bg-slate-800/60 border border-slate-700/40 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 hover:scale-[1.02] touch-manipulation group relative overflow-hidden`}
              variant="outline"
            >
              <Link href={action.href}>
                <div className={`flex-shrink-0 p-4 rounded-2xl shadow-sm transition-all duration-300 group-hover:shadow-md group-hover:scale-110 bg-slate-700/60`}>
                  <Icon
                    className={`h-6 w-6 text-white transition-transform duration-300 group-hover:rotate-3`}
                  />
                </div>

                <div className="flex-1 text-left space-y-1">
                  <div className="font-bold text-white text-lg flex items-center gap-2">
                    {action.title}
                    <ArrowRight className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1 text-white" />
                  </div>
                  <div className="text-sm text-white/80 font-medium leading-relaxed">{action.description}</div>
                </div>

                <div className="absolute inset-0 bg-gradient-to-r from-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              </Link>
            </Button>
          )
        })}
      </CardContent>
    </Card>
  )
}
