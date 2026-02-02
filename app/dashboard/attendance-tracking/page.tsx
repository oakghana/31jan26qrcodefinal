import { AttendanceAnalytics } from "@/components/attendance/attendance-analytics"
import { RealTimeTracker } from "@/components/attendance/real-time-tracker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarChart3, Activity, TrendingUp } from "lucide-react"

export default function AttendanceTrackingPage() {
  return (
    <div className="space-y-8">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <BarChart3 className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-4xl font-heading font-bold text-foreground tracking-tight">Attendance Tracking</h1>
              <p className="text-lg text-muted-foreground font-medium mt-1">
                Advanced analytics and real-time monitoring of your attendance patterns
              </p>
            </div>
          </div>
        </div>

        <Tabs defaultValue="analytics" className="space-y-8">
          <TabsList className="grid w-full grid-cols-2 h-12 p-1 bg-muted/50 rounded-xl">
            <TabsTrigger
              value="analytics"
              className="flex items-center gap-2 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <TrendingUp className="h-4 w-4" />
              Analytics & Insights
            </TabsTrigger>
            <TabsTrigger
              value="realtime"
              className="flex items-center gap-2 font-semibold data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg"
            >
              <Activity className="h-4 w-4" />
              Real-Time Tracking
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6 mt-8">
            <AttendanceAnalytics />
          </TabsContent>

          <TabsContent value="realtime" className="space-y-6 mt-8">
            <RealTimeTracker />
          </TabsContent>
        </Tabs>
      </div>
  )
}
