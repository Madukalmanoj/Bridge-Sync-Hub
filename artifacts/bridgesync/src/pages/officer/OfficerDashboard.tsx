import React, { useState, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useGetOfficers, useGetDeptApplications, useUpdateDeptApplicationStatus, useRequestDocument, getGetDeptApplicationsQueryKey, getGetOfficersQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Lock, FileText, CheckCircle2, XCircle, ShieldCheck, FileSearch, Building2, Send, Search, Filter, Clock, SortAsc, RefreshCw, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

const STATUS_OPTIONS = ["All", "Received", "Under Review", "Documents Requested", "Approved", "Rejected"] as const;
const SLA_WARNING_DAYS = 7;
const SLA_ALERT_DAYS = 3;

export default function OfficerDashboard() {
  const [department, setDepartment] = useState<string>("Food Safety Department");
  const [officerId, setOfficerId] = useState<string>("");
  const [officerName, setOfficerName] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <OfficerLogin
      department={department}
      setDepartment={setDepartment}
      officerId={officerId}
      setOfficerId={setOfficerId}
      setOfficerName={setOfficerName}
      onLogin={() => setIsLoggedIn(true)}
    />;
  }

  return <OfficerQueue department={department} officerId={parseInt(officerId)} officerName={officerName} onLogout={() => setIsLoggedIn(false)} />;
}

function OfficerLogin({ department, setDepartment, officerId, setOfficerId, setOfficerName, onLogin }: any) {
  const { data: officers, isLoading } = useGetOfficers(department, {
    query: { queryKey: getGetOfficersQueryKey(department), enabled: !!department }
  });

  const handleOfficerChange = (val: string) => {
    setOfficerId(val);
    const found = officers?.find(o => o.id.toString() === val);
    if (found) setOfficerName(found.name);
  };

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-muted/20">
      <Card className="w-full max-w-md border-primary/20 shadow-xl overflow-hidden">
        <div className="bg-primary/5 h-2 w-full" />
        <CardHeader className="space-y-1 pb-6 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Officer Access</CardTitle>
          <p className="text-sm text-muted-foreground">BridgeSync Secure Gateway</p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Select Department</Label>
            <Select value={department} onValueChange={setDepartment}>
              <SelectTrigger className="h-12 bg-background border-border/60">
                <SelectValue placeholder="Department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Food Safety Department">Food Safety Department</SelectItem>
                <SelectItem value="Labour Department">Labour Department</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Select Officer Profile</Label>
            <Select value={officerId} onValueChange={handleOfficerChange} disabled={isLoading || !officers?.length}>
              <SelectTrigger className="h-12 bg-background border-border/60">
                <SelectValue placeholder={isLoading ? "Loading officers..." : "Select Profile"} />
              </SelectTrigger>
              <SelectContent>
                {officers?.map(off => (
                  <SelectItem key={off.id} value={off.id.toString()}>{off.name} ({off.role})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 pt-6">
          <Button
            className="w-full h-12 text-md font-semibold"
            onClick={onLogin}
            disabled={!officerId}
          >
            <Lock className="mr-2 h-4 w-4" /> Authenticate
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}

function OfficerQueue({ department, officerId, officerName, onLogout }: any) {
  const queryClient = useQueryClient();
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBySLA, setSortBySLA] = useState(true);

  const queryKey = getGetDeptApplicationsQueryKey(department, { officerId });

  const { data: applications, isLoading, refetch } = useGetDeptApplications(department, { officerId }, {
    query: {
      enabled: !!department,
      queryKey,
      refetchInterval: 8000,
    }
  });

  const invalidateQueue = () => {
    queryClient.invalidateQueries({ queryKey });
  };

  const filteredAndSorted = useMemo(() => {
    if (!applications) return [];
    let list = [...applications];

    if (statusFilter !== "All") {
      list = list.filter(a => a.status === statusFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(a =>
        a.appId.toLowerCase().includes(q) ||
        (a.citizenName ?? "").toLowerCase().includes(q) ||
        (a.businessType ?? "").toLowerCase().includes(q) ||
        (a.district ?? "").toLowerCase().includes(q)
      );
    }

    if (sortBySLA) {
      list.sort((a, b) => {
        const terminalA = ["Approved", "Rejected"].includes(a.status);
        const terminalB = ["Approved", "Rejected"].includes(b.status);
        if (terminalA && !terminalB) return 1;
        if (!terminalA && terminalB) return -1;
        return (b.daysPending ?? 0) - (a.daysPending ?? 0);
      });
    }

    return list;
  }, [applications, statusFilter, searchQuery, sortBySLA]);

  const selectedApp = applications?.find(a => a.appId === selectedAppId);

  const counts = useMemo(() => {
    if (!applications) return {};
    return applications.reduce((acc: Record<string, number>, a) => {
      acc[a.status] = (acc[a.status] ?? 0) + 1;
      return acc;
    }, {});
  }, [applications]);

  const pendingCount = applications?.filter(a => !["Approved", "Rejected"].includes(a.status)).length ?? 0;
  const slaBreached = applications?.filter(a => !["Approved", "Rejected"].includes(a.status) && (a.daysPending ?? 0) > SLA_WARNING_DAYS).length ?? 0;

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Queue Sidebar */}
      <div className={`${selectedAppId ? 'w-80 hidden lg:flex border-r' : 'w-full'} flex-col bg-background transition-all duration-300`}>
        {/* Header */}
        <div className="p-4 border-b bg-muted/10 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-base flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                {department}
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">Officer: {officerName}</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { refetch(); invalidateQueue(); }}>
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={onLogout}>Exit</Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="bg-muted/30 rounded-md p-2">
              <p className="text-lg font-bold text-primary">{pendingCount}</p>
              <p className="text-[10px] text-muted-foreground">Pending</p>
            </div>
            <div className="bg-muted/30 rounded-md p-2">
              <p className={`text-lg font-bold ${slaBreached > 0 ? 'text-destructive' : 'text-green-500'}`}>{slaBreached}</p>
              <p className="text-[10px] text-muted-foreground">SLA Breach</p>
            </div>
            <div className="bg-muted/30 rounded-md p-2">
              <p className="text-lg font-bold">{applications?.length ?? 0}</p>
              <p className="text-[10px] text-muted-foreground">Total</p>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search ID, name, type..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 h-8 text-xs"
            />
          </div>

          {/* Filters */}
          <div className="flex gap-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-8 text-xs flex-1">
                <Filter className="h-3 w-3 mr-1.5" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map(s => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s} {s !== "All" && counts[s] ? `(${counts[s]})` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant={sortBySLA ? "default" : "outline"}
              size="sm"
              className="h-8 text-xs px-3 gap-1"
              onClick={() => setSortBySLA(v => !v)}
            >
              <SortAsc className="h-3 w-3" />
              SLA
            </Button>
          </div>
        </div>

        {/* Queue List */}
        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            {isLoading ? (
              [1, 2, 3].map(i => (
                <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-md border" />
              ))
            ) : filteredAndSorted.length === 0 ? (
              <div className="h-48 flex flex-col items-center justify-center text-muted-foreground">
                <CheckCircle2 className="h-10 w-10 mb-3 opacity-20" />
                <p className="text-sm">No applications match filters</p>
              </div>
            ) : (
              filteredAndSorted.map(app => {
                const days = app.daysPending ?? 0;
                const isTerminal = ["Approved", "Rejected"].includes(app.status);
                const isBreached = !isTerminal && days > SLA_WARNING_DAYS;
                const isWarning = !isTerminal && days > SLA_ALERT_DAYS && !isBreached;

                let borderColor = "border-l-4 border-l-green-500";
                let badgeClass = "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";

                if (isBreached) { borderColor = "border-l-4 border-l-destructive"; badgeClass = "bg-destructive/20 text-destructive"; }
                else if (isWarning) { borderColor = "border-l-4 border-l-amber-500"; badgeClass = "bg-amber-500/10 text-amber-600 dark:text-amber-400"; }
                if (isTerminal) { borderColor = "border-l-4 border-l-muted"; badgeClass = "bg-muted/50 text-muted-foreground"; }

                return (
                  <div
                    key={app.id}
                    onClick={() => setSelectedAppId(app.appId)}
                    className={`p-3 rounded-md border cursor-pointer transition-all hover:shadow-md ${borderColor} ${selectedAppId === app.appId ? 'ring-2 ring-primary shadow-md bg-primary/5' : 'bg-card'} ${isTerminal ? 'opacity-60' : ''}`}
                  >
                    <div className="flex justify-between items-start mb-1.5">
                      <span className="font-mono text-xs font-bold text-primary">{app.appId}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badgeClass}`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="font-medium text-sm truncate">{app.citizenName}</div>
                    <div className="text-xs text-muted-foreground truncate">{app.businessType} • {app.district}</div>
                    {!isTerminal && (
                      <div className="flex items-center gap-1 mt-1.5">
                        <Clock className="h-3 w-3 text-muted-foreground" />
                        <span className={`text-[10px] font-medium ${isBreached ? 'text-destructive' : isWarning ? 'text-amber-500' : 'text-muted-foreground'}`}>
                          {days}d {isBreached ? '⚠ SLA BREACH' : isWarning ? '⚡ Urgent' : 'pending'}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Detail View */}
      {selectedAppId ? (
        <div className="flex-1 flex flex-col bg-muted/5 relative overflow-hidden">
          <div className="p-4 border-b bg-background flex items-center gap-4">
            <Button variant="ghost" size="sm" className="gap-1 text-xs" onClick={() => setSelectedAppId(null)}>
              ← Back
            </Button>
            <div className="flex-1">
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-lg font-mono">{selectedApp?.appId}</h2>
                <Badge
                  variant={selectedApp?.status === 'Approved' ? 'default' : selectedApp?.status === 'Rejected' ? 'destructive' : 'secondary'}
                  className="uppercase text-xs"
                >
                  {selectedApp?.status}
                </Badge>
                {(selectedApp?.daysPending ?? 0) > SLA_WARNING_DAYS && !["Approved", "Rejected"].includes(selectedApp?.status ?? "") && (
                  <Badge variant="destructive" className="text-xs gap-1">
                    <AlertTriangle className="h-3 w-3" /> SLA Breach
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedApp?.citizenName} • {selectedApp?.businessType} • {selectedApp?.district} • {selectedApp?.daysPending}d pending
              </p>
            </div>
          </div>

          <ScrollArea className="flex-1">
            <div className="p-6 space-y-6">
              <Card className="border-border/50 shadow-sm">
                <CardHeader className="bg-muted/20 border-b pb-4">
                  <CardTitle className="text-base flex items-center gap-2">
                    <FileText className="h-4 w-4 text-primary" />
                    Translated Application Data
                  </CardTitle>
                  <p className="text-xs text-muted-foreground">Mapped securely from Single Window via BridgeSync adapters</p>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground w-1/3 text-sm">Applicant</TableCell>
                        <TableCell className="text-sm">{selectedApp?.citizenName}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground text-sm">Business Type</TableCell>
                        <TableCell className="text-sm">{selectedApp?.businessType}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground text-sm">District</TableCell>
                        <TableCell className="text-sm">{selectedApp?.district}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium text-muted-foreground text-sm">Days Pending</TableCell>
                        <TableCell className={`text-sm font-bold ${(selectedApp?.daysPending ?? 0) > SLA_WARNING_DAYS ? 'text-destructive' : ''}`}>
                          {selectedApp?.daysPending}d
                        </TableCell>
                      </TableRow>
                      {selectedApp?.nativeFieldsJson && Object.entries(JSON.parse(selectedApp.nativeFieldsJson)).map(([k, v]) => (
                        <TableRow key={k}>
                          <TableCell className="font-medium text-muted-foreground capitalize text-xs">{k.replace(/_/g, ' ')}</TableCell>
                          <TableCell className="text-xs font-mono">{v as string}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {!['Approved', 'Rejected'].includes(selectedApp?.status ?? '') && (
                <ActionPanel
                  department={department}
                  appId={selectedAppId}
                  officerName={officerName}
                  onAction={() => {
                    invalidateQueue();
                    setTimeout(() => setSelectedAppId(null), 1500);
                  }}
                />
              )}

              {['Approved', 'Rejected'].includes(selectedApp?.status ?? '') && (
                <Card className="border-border/50 bg-muted/20 p-6 text-center">
                  {selectedApp?.status === 'Approved'
                    ? <CheckCircle2 className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    : <XCircle className="h-8 w-8 text-destructive mx-auto mb-2" />}
                  <p className="font-semibold">Application {selectedApp?.status}</p>
                  <p className="text-sm text-muted-foreground mt-1">No further action required for this application.</p>
                </Card>
              )}
            </div>
          </ScrollArea>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/5 flex-col text-muted-foreground">
          <FileSearch className="h-16 w-16 mb-4 opacity-20" />
          <h3 className="text-lg font-medium">No Application Selected</h3>
          <p className="text-sm">Click an application from the queue to review it</p>
        </div>
      )}
    </div>
  );
}

function ActionPanel({ department, appId, officerName, onAction }: { department: string, appId: string, officerName: string, onAction: () => void }) {
  const { toast } = useToast();
  const updateStatus = useUpdateDeptApplicationStatus();
  const requestDoc = useRequestDocument();
  const [docName, setDocName] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  const [waPopup, setWaPopup] = useState<{ show: boolean, title: string, msg: string }>({ show: false, title: "", msg: "" });

  const showWa = (title: string, msg: string) => {
    setWaPopup({ show: true, title, msg });
    setTimeout(() => setWaPopup(prev => ({ ...prev, show: false })), 8000);
  };

  const handleApprove = () => {
    updateStatus.mutate({ deptName: department, appId, data: { status: 'Approved', actor: officerName } }, {
      onSuccess: () => {
        toast({ title: "Application Approved", description: `${appId} approved by ${officerName}.` });
        showWa("Application Approved ✅", `Dear Citizen, your application ${appId} for ${department} has been approved by ${officerName}.`);
        onAction();
      },
      onError: () => toast({ title: "Error", description: "Failed to update status.", variant: "destructive" })
    });
  };

  const handleReject = () => {
    if (!rejectReason.trim()) { toast({ title: "Reason Required", description: "Please provide a rejection reason.", variant: "destructive" }); return; }
    updateStatus.mutate({ deptName: department, appId, data: { status: 'Rejected', actor: officerName, notes: rejectReason } }, {
      onSuccess: () => {
        toast({ title: "Application Rejected", description: `${appId} rejected.` });
        showWa("Application Rejected ❌", `Dear Citizen, your application ${appId} for ${department} was rejected by ${officerName}. Reason: ${rejectReason}`);
        onAction();
      },
      onError: () => toast({ title: "Error", description: "Failed to update status.", variant: "destructive" })
    });
  };

  const handleRequestDoc = () => {
    if (!docName.trim()) return;
    requestDoc.mutate({ deptName: department, appId, data: { documentName: docName, officerName } }, {
      onSuccess: () => {
        toast({ title: "Document Requested", description: `Citizen notified to upload: ${docName}` });
        showWa("Document Required 📄", `Dear Citizen, ${department} has requested: "${docName}" for application ${appId}. Please upload it at the Citizen Portal.`);
        setDocName("");
        onAction();
      },
      onError: () => toast({ title: "Error", description: "Failed to request document.", variant: "destructive" })
    });
  };

  return (
    <>
      <Card className="border-primary/20 shadow-md bg-card/50 overflow-hidden">
        <div className="bg-primary/10 px-4 py-3 border-b flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" />
          <h3 className="font-semibold text-sm">Decision Panel</h3>
          <span className="text-xs text-muted-foreground ml-auto">Officer: {officerName}</span>
        </div>
        <div className="p-4 grid grid-cols-3 gap-3">
          <Button
            className="w-full bg-green-600 hover:bg-green-700 text-white border-none shadow-sm"
            onClick={handleApprove}
            disabled={updateStatus.isPending}
          >
            <CheckCircle2 className="mr-2 h-4 w-4" />
            {updateStatus.isPending ? "Processing..." : "Approve"}
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-dashed border-2">
                <Send className="mr-2 h-4 w-4" /> Request Doc
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request Document</DialogTitle>
                <DialogDescription>Citizen will be notified to upload this document in their portal.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label>Document Name / Description</Label>
                <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. FSSAI License Draft, NOC Certificate..." className="mt-2" />
              </div>
              <DialogFooter>
                <Button onClick={handleRequestDoc} disabled={requestDoc.isPending || !docName.trim()}>Send Request</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-full shadow-sm">
                <XCircle className="mr-2 h-4 w-4" /> Reject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject Application</DialogTitle>
                <DialogDescription>This action will be logged and the citizen will be notified via the portal.</DialogDescription>
              </DialogHeader>
              <div className="py-4">
                <Label>Reason for Rejection</Label>
                <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Provide a clear, specific reason for rejection..." className="mt-2 h-24" />
              </div>
              <DialogFooter>
                <Button variant="destructive" onClick={handleReject} disabled={updateStatus.isPending || !rejectReason.trim()}>
                  Confirm Rejection
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </Card>

      <WhatsAppSimulator
        show={waPopup.show}
        onClose={() => setWaPopup(prev => ({ ...prev, show: false }))}
        title={waPopup.title}
        message={waPopup.msg}
      />
    </>
  );
}

function WhatsAppSimulator({ show, onClose, title, message }: { show: boolean, onClose: () => void, title: string, message: string }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-4 right-4 w-80 bg-[#128C7E] rounded-lg shadow-2xl overflow-hidden z-50 animate-in slide-in-from-bottom-10 fade-in duration-300">
      <div className="bg-[#075E54] p-3 flex justify-between items-center text-white">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
            <Building2 className="w-4 h-4" />
          </div>
          <div>
            <div className="font-medium text-sm">Karnataka Single Window</div>
            <div className="text-[10px] opacity-80">Official Government Account</div>
          </div>
        </div>
        <button onClick={onClose} className="opacity-70 hover:opacity-100"><XCircle className="w-5 h-5" /></button>
      </div>
      <div className="p-4 bg-[#E5DDD5] min-h-[120px]">
        <div className="bg-white rounded-lg p-3 text-sm text-gray-800 shadow-sm max-w-[90%] relative">
          <div className="font-bold text-[#075E54] mb-1">{title}</div>
          {message}
          <div className="text-[10px] text-gray-400 text-right mt-1 font-mono flex items-center justify-end gap-1">
            {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            <CheckCircle2 className="inline w-3 h-3 text-blue-500" />
          </div>
        </div>
      </div>
    </div>
  );
}
