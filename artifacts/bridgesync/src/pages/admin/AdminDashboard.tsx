import React, { useState } from "react";
import { useGetAnalyticsSummary, useGetDeptStats, useGetEventStream, useRunAnomalyScan } from "@workspace/api-client-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Server, Activity, AlertTriangle, ShieldAlert, BarChart3, Database, Workflow as WorkflowIcon, Terminal } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { useDemoStore } from "@/store/useDemoStore";
import { SchemaMapperTab } from "./tabs/SchemaMapperTab";
import { OnboardingTab } from "./tabs/OnboardingTab";
import { WorkflowTab } from "./tabs/WorkflowTab";

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("monitor");

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden bg-background">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r bg-muted/5 hidden md:flex flex-col">
        <div className="p-6 border-b">
          <h2 className="font-bold text-lg tracking-tight text-primary flex items-center gap-2">
            <Server className="h-5 w-5" /> Admin Console
          </h2>
          <p className="text-xs text-muted-foreground mt-1 font-mono">BridgeSync OS v2.4</p>
        </div>
        <div className="flex-1 p-4 space-y-2">
          <NavItem active={activeTab === "monitor"} onClick={() => setActiveTab("monitor")} icon={<Activity />} label="Live SLA Monitor" />
          <NavItem active={activeTab === "mapper"} onClick={() => setActiveTab("mapper")} icon={<Database />} label="AI Schema Mapper" />
          <NavItem active={activeTab === "onboard"} onClick={() => setActiveTab("onboard")} icon={<ShieldAlert />} label="Dept Onboarding" />
          <NavItem active={activeTab === "workflow"} onClick={() => setActiveTab("workflow")} icon={<WorkflowIcon />} label="State Translator" />
          <NavItem active={activeTab === "events"} onClick={() => setActiveTab("events")} icon={<Terminal />} label="Event Bus" />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto bg-background p-6">
        {activeTab === "monitor" && <MonitorTab />}
        {activeTab === "mapper" && <SchemaMapperTab />}
        {activeTab === "onboard" && <OnboardingTab />}
        {activeTab === "workflow" && <WorkflowTab />}
        {activeTab === "events" && <EventBusTab />}
      </div>
    </div>
  );
}

function NavItem({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-md transition-all text-sm font-medium ${
        active 
          ? "bg-primary text-primary-foreground shadow-md" 
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      }`}
    >
      {React.cloneElement(icon, { className: "h-4 w-4" })}
      {label}
    </button>
  );
}

function MonitorTab() {
  const { data: summary, isLoading: isSummaryLoading } = useGetAnalyticsSummary({
    query: { refetchInterval: 30000 }
  });
  
  const { data: deptStats, isLoading: isStatsLoading } = useGetDeptStats({
    query: { refetchInterval: 30000 }
  });

  const scanAnomaly = useRunAnomalyScan();

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">System Health & SLAs</h1>
          <p className="text-muted-foreground">Real-time performance across all connected departments.</p>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => window.print()} className="font-mono text-xs">Export PDF</Button>
          <Button onClick={() => scanAnomaly.mutate({})} disabled={scanAnomaly.isPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
            <AlertTriangle className="mr-2 h-4 w-4" /> Run AI Anomaly Scan
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard title="Total Apps" value={summary?.totalApplications || 0} loading={isSummaryLoading} />
        <KpiCard title="Pending" value={summary?.pendingApplications || 0} loading={isSummaryLoading} trend="-2% from last week" />
        <KpiCard title="SLA Breaches" value={summary?.slaBreaches || 0} loading={isSummaryLoading} alert={summary?.slaBreaches ? summary.slaBreaches > 0 : false} />
        <KpiCard title="Avg Processing" value={`${summary?.avgProcessingDays || 0}d`} loading={isSummaryLoading} />
      </div>

      {/* Charts & Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="h-4 w-4" /> Application Volume</CardTitle>
          </CardHeader>
          <CardContent className="h-[300px]">
            {isStatsLoading ? <div className="h-full flex items-center justify-center text-muted-foreground">Loading chart data...</div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptStats || []} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                  <XAxis dataKey="department" axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: 'hsl(var(--muted-foreground))', fontSize: 12}} />
                  <Tooltip 
                    cursor={{fill: 'hsl(var(--muted))', opacity: 0.4}}
                    contentStyle={{backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '8px'}}
                  />
                  <Bar dataKey="approved" name="Approved" stackId="a" fill="hsl(var(--chart-5))" radius={[0, 0, 4, 4]} />
                  <Bar dataKey="pending" name="Pending" stackId="a" fill="hsl(var(--chart-4))" />
                  <Bar dataKey="rejected" name="Rejected" stackId="a" fill="hsl(var(--chart-3))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Department Health</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border/50">
              {deptStats?.map(dept => (
                <div key={dept.department} className="p-4 flex items-center justify-between">
                  <div>
                    <div className="font-medium text-sm">{dept.department}</div>
                    <div className="text-xs text-muted-foreground">{dept.pending} pending • {dept.slaBreaches} breaches</div>
                  </div>
                  <div className={`text-lg font-bold font-mono ${dept.healthScore > 80 ? 'text-green-500' : dept.healthScore > 50 ? 'text-amber-500' : 'text-destructive'}`}>
                    {dept.healthScore}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Anomalies section would go here conditionally based on scan result */}
      {scanAnomaly.isSuccess && scanAnomaly.data && (
        <div className="mt-8 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <h3 className="font-bold text-lg flex items-center gap-2 text-destructive"><AlertTriangle className="h-5 w-5" /> Detected Anomalies</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scanAnomaly.data.map((anomaly: any, i: number) => (
              <Card key={i} className={`border-l-4 ${anomaly.severity === 'high' ? 'border-l-destructive bg-destructive/5' : 'border-l-amber-500 bg-amber-500/5'}`}>
                <CardHeader className="p-4 pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-base">{anomaly.title}</CardTitle>
                    <Badge variant={anomaly.severity === 'high' ? 'destructive' : 'secondary'} className="uppercase text-[10px] tracking-wider">{anomaly.severity}</Badge>
                  </div>
                  <CardDescription className="text-xs">{anomaly.department || 'System Wide'}</CardDescription>
                </CardHeader>
                <CardContent className="p-4 pt-0">
                  <p className="text-sm mb-3">{anomaly.description}</p>
                  <div className="bg-background/80 p-3 rounded text-xs border font-mono text-muted-foreground">
                    <span className="font-bold text-foreground">Action:</span> {anomaly.recommendation}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ title, value, loading, trend, alert }: any) {
  return (
    <Card className={`border-border/50 shadow-sm ${alert ? 'border-destructive bg-destructive/5 pulse-border' : ''}`}>
      <CardContent className="p-6">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {loading ? (
          <div className="h-8 w-16 bg-muted animate-pulse rounded mt-2" />
        ) : (
          <div className="flex items-baseline gap-2 mt-2">
            <h2 className="text-3xl font-bold tracking-tight font-mono">{value}</h2>
            {trend && <span className="text-xs text-muted-foreground">{trend}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function EventBusTab() {
  const { isDemoMode } = useDemoStore();
  const { data: events, isLoading } = useGetEventStream({
    query: { refetchInterval: isDemoMode ? 1000 : 5000 }
  });

  return (
    <Card className="h-full flex flex-col border-border/50 shadow-md bg-black text-green-500 font-mono">
      <CardHeader className="border-b border-green-900/50 bg-black/50 pb-4">
        <CardTitle className="text-green-500 flex items-center gap-2 text-base">
          <Terminal className="h-4 w-4" /> Live Event Bus Matrix
          {isDemoMode && <Badge variant="outline" className="ml-4 border-green-500 text-green-500 animate-pulse">1000ms POLLING</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden relative">
        {isLoading ? (
          <div className="p-8 text-green-500/50">Establishing secure connection to event matrix...</div>
        ) : (
          <ScrollArea className="h-full p-4 flex flex-col-reverse">
            <div className="space-y-1">
              {events?.map((ev) => (
                <div key={ev.id} className="text-xs leading-relaxed opacity-80 hover:opacity-100 transition-opacity flex gap-4">
                  <span className="text-green-700 w-36 shrink-0">[{new Date(ev.timestamp).toISOString()}]</span>
                  <span className="text-blue-400 w-32 shrink-0">{ev.eventType}</span>
                  <span className="text-yellow-400 w-24 shrink-0">{ev.appId || 'SYS_EVENT'}</span>
                  <span className="flex-1 text-green-500">{ev.message}</span>
                  <span className="w-16 text-right shrink-0">[{ev.status}]</span>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
        <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-black to-transparent pointer-events-none" />
      </CardContent>
    </Card>
  );
}
