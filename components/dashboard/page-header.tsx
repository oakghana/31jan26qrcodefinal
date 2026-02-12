"use client"

import { Button } from "@/components/ui/button"
import { ArrowLeft, Home } from "lucide-react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"

interface PageHeaderProps {
  title: string
  description?: string
  icon?: LucideIcon
  backHref?: string
  backLabel?: string
  showBackButton?: boolean
  children?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  icon: Icon,
  backHref = "/dashboard",
  backLabel = "Back to Dashboard",
  showBackButton = true,
  children,
}: PageHeaderProps) {
  return (
    <div className="space-y-2">
      {/* Back Button - Always visible on mobile */}
      {showBackButton && (
        <div className="flex items-center gap-2 mb-2">
          <Button variant="outline" size="sm" asChild className="gap-2 hover:bg-primary/5 transition-colors">
            <Link href={backHref} prefetch={true}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{backLabel}</span>
              <Home className="h-4 w-4 sm:hidden" />
            </Link>
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          {Icon && (
            <div className="p-1.5 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold text-foreground tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-xs sm:text-sm text-muted-foreground font-medium mt-0.5">
                {description}
              </p>
            )}
          </div>
        </div>
        {children}
      </div>
    </div>
  )
}
