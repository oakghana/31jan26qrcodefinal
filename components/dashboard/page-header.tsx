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
    <div className="space-y-3">
      {/* Back Button - Always visible on mobile */}
      {showBackButton && (
        <div className="flex items-center gap-2 mb-4">
          <Button variant="outline" size="sm" asChild className="gap-2 hover:bg-primary/5 transition-colors">
            <Link href={backHref} prefetch={true}>
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{backLabel}</span>
              <Home className="h-4 w-4 sm:hidden" />
            </Link>
          </Button>
        </div>
      )}

      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-6 w-6 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-heading font-bold text-foreground tracking-tight">
              {title}
            </h1>
            {description && (
              <p className="text-sm sm:text-base lg:text-lg text-muted-foreground font-medium mt-1">
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
