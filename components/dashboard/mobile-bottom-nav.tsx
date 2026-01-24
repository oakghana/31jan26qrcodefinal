"use client"

import { memo, useMemo } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Clock, FileText, BarChart3, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface NavItem {
  href: string
  icon: typeof Home
  label: string
}

const navItems: NavItem[] = [
  { href: "/dashboard/overview", icon: Home, label: "Home" },
  { href: "/dashboard/attendance", icon: Clock, label: "Attendance" },
  { href: "/dashboard/excuse-duty", icon: FileText, label: "Excuse" },
  { href: "/dashboard/reports", icon: BarChart3, label: "Reports" },
  { href: "/dashboard/settings", icon: Settings, label: "Settings" },
]

export const MobileBottomNav = memo(function MobileBottomNav() {
  const pathname = usePathname()

  const items = useMemo(() => navItems, [])

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border/50 shadow-lg safe-area-bottom">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || 
            (item.href === "/dashboard/overview" && pathname === "/dashboard")

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full px-2 py-1 transition-all duration-200 touch-manipulation",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-5 h-5 mb-1 transition-transform duration-200",
                  isActive && "scale-110"
                )}
              />
              <span className={cn(
                "text-xs font-medium truncate",
                isActive && "font-semibold"
              )}>
                {item.label}
              </span>
              {isActive && (
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
})
