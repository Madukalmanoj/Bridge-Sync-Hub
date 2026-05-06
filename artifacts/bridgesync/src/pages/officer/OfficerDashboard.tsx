import React, { useState } from "react";
import { useGetOfficers, useGetDeptApplications, useUpdateDeptApplicationStatus, useRequestDocument, getGetDeptApplicationsQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Lock, Users, AlertCircle, FileText, CheckCircle2, XCircle, ArrowRight, ShieldCheck, FileSearch, Building2, Send } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export default function OfficerDashboard() {
  const [department, setDepartment] = useState<string>("Food Safety Department");
  const [officerId, setOfficerId] = useState<string>("");
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  if (!isLoggedIn) {
    return <OfficerLogin 
      department={department} 
      setDepartment={setDepartment} 
      officerId={officerId} 
      setOfficerId={setOfficerId} 
      onLogin={() => setIsLoggedIn(true)} 
    />;
  }

  return <OfficerQueue department={department} officerId={parseInt(officerId)} onLogout={() => setIsLoggedIn(false)} />;
}

function OfficerLogin({ department, setDepartment, officerId, setOfficerId, onLogin }: any) {
  const { data: officers, isLoading } = useGetOfficers(department, {
    query: { enabled: !!department }
  });

  return (
    <div className="min-h-[calc(100vh-3.5rem)] flex items-center justify-center p-4 bg-muted/20">
      <Card className="w-full max-w-md border-primary/20 shadow-xl overflow-hidden">
        <div className="bg-primary/5 h-2 w-full" />
        <CardHeader className="space-y-1 pb-6 text-center">
          <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="h-6 w-6 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">Officer Access</CardTitle>
          <CardDescription>BridgeSync Secure Gateway</CardDescription>
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
            <Select value={officerId} onValueChange={setOfficerId} disabled={isLoading || !officers}>
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

function OfficerQueue({ department, officerId, onLogout }: any) {
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null);
  
  const { data: applications, isLoading } = useGetDeptApplications(department, { officerId }, {
    query: {
      enabled: !!department,
      queryKey: getGetDeptApplicationsQueryKey(department, { officerId }),
      refetchInterval: 15000
    }
  });

  const selectedApp = applications?.find(a => a.appId === selectedAppId);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] overflow-hidden">
      {/* Queue Sidebar */}
      <div className={`${selectedAppId ? 'w-1/3 hidden lg:flex border-r' : 'w-full'} flex-col bg-background transition-all duration-300`}>
        <div className="p-4 border-b bg-muted/10 flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {department} Queue
            </h2>
            <p className="text-xs text-muted-foreground mt-1">Showing active applications</p>
          </div>
          <Button variant="ghost" size="sm" onClick={onLogout}>Exit</Button>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1,2,3].map(i => (
                <div key={i} className="h-24 bg-muted/50 animate-pulse rounded-md border" />
              ))}
            </div>
          ) : applications?.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
              <CheckCircle2 className="h-12 w-12 mb-4 opacity-20" />
              <p>Queue is empty.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {applications?.map(app => {
                const days = app.daysPending || 0;
                let statusColor = "border-l-4 border-l-green-500";
                let badgeColor = "bg-green-500/10 text-green-700 dark:text-green-400";
                
                if (days > 7) {
                  statusColor = "border-l-4 border-l-destructive bg-destructive/5 pulse-border";
                  badgeColor = "bg-destructive/20 text-destructive";
                } else if (days > 3) {
                  statusColor = "border-l-4 border-l-amber-500";
                  badgeColor = "bg-amber-500/10 text-amber-700 dark:text-amber-400";
                }
                
                if (app.status === 'Approved' || app.status === 'Rejected') {
                  statusColor = "border-l-4 border-l-muted opacity-60";
                  badgeColor = "bg-muted text-muted-foreground";
                }

                return (
                  <div 
                    key={app.id} 
                    onClick={() => setSelectedAppId(app.appId)}
                    className={`p-4 rounded-md border cursor-pointer transition-all hover:shadow-md ${statusColor} ${selectedAppId === app.appId ? 'ring-2 ring-primary shadow-md' : 'bg-card'}`}
                  >
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-mono text-sm font-semibold">{app.appId}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeColor}`}>
                        {app.status}
                      </span>
                    </div>
                    <div className="font-medium truncate">{app.citizenName}</div>
                    <div className="text-xs text-muted-foreground truncate">{app.businessType} • {app.district}</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Detail View */}
      {selectedAppId ? (
        <div className="flex-1 flex flex-col bg-muted/5 relative">
          <div className="p-4 border-b bg-background flex items-center gap-4">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSelectedAppId(null)}>
              <ArrowRight className="h-5 w-5 rotate-180" />
            </Button>
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-bold text-xl font-mono">{selectedApp?.appId}</h2>
                <Badge variant={selectedApp?.status === 'Approved' ? 'default' : selectedApp?.status === 'Rejected' ? 'destructive' : 'secondary'} className="uppercase">
                  {selectedApp?.status}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">Submitted: {new Date(selectedApp?.createdAt || '').toLocaleDateString()}</p>
            </div>
          </div>
          
          <div className="flex-1 overflow-auto p-6 space-y-6">
            <Card className="border-border/50 shadow-sm">
              <CardHeader className="bg-muted/20 border-b pb-4">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  Translated Application Data
                </CardTitle>
                <CardDescription>Mapped securely from Single Window via BridgeSync</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableBody>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground w-1/3">Applicant</TableCell>
                      <TableCell>{selectedApp?.citizenName}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">Business Type</TableCell>
                      <TableCell>{selectedApp?.businessType}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-medium text-muted-foreground">District</TableCell>
                      <TableCell>{selectedApp?.district}</TableCell>
                    </TableRow>
                    {selectedApp?.nativeFieldsJson && Object.entries(JSON.parse(selectedApp.nativeFieldsJson)).map(([k,v]) => (
                      <TableRow key={k}>
                        <TableCell className="font-medium text-muted-foreground capitalize">{k.replace(/_/g, ' ')}</TableCell>
                        <TableCell>{v as string}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            {!['Approved', 'Rejected'].includes(selectedApp?.status ?? '') && (
              <ActionPanel department={department} appId={selectedAppId} />
            )}
          </div>
        </div>
      ) : (
        <div className="hidden lg:flex flex-1 items-center justify-center bg-muted/5 flex-col text-muted-foreground">
          <FileSearch className="h-16 w-16 mb-4 opacity-20" />
          <h3 className="text-lg font-medium">No Application Selected</h3>
          <p className="text-sm">Select an application from the queue to review</p>
        </div>
      )}
    </div>
  );
}

function ActionPanel({ department, appId }: { department: string, appId: string }) {
  const { toast } = useToast();
  const updateStatus = useUpdateDeptApplicationStatus();
  const requestDoc = useRequestDocument();
  const [docName, setDocName] = useState("");
  const [rejectReason, setRejectReason] = useState("");
  
  const [waPopup, setWaPopup] = useState<{show: boolean, title: string, msg: string}>({ show: false, title: "", msg: "" });

  const showWa = (title: string, msg: string) => {
    setWaPopup({ show: true, title, msg });
    setTimeout(() => setWaPopup(prev => ({...prev, show: false})), 8000);
  };

  const handleApprove = () => {
    updateStatus.mutate({ deptName: department, appId, data: { status: 'Approved' } }, {
      onSuccess: () => {
        toast({ title: "Approved", description: "Application moved to approved state.", variant: "default" });
        showWa("Application Approved ✅", `Dear Citizen, your application ${appId} for ${department} has been approved.`);
      }
    });
  };

  const handleReject = () => {
    if (!rejectReason) return toast({ title: "Reason Required", variant: "destructive" });
    updateStatus.mutate({ deptName: department, appId, data: { status: 'Rejected', notes: rejectReason } }, {
      onSuccess: () => {
        toast({ title: "Rejected", description: "Application rejected.", variant: "default" });
        showWa("Application Rejected ❌", `Dear Citizen, your application ${appId} for ${department} was rejected. Reason: ${rejectReason}`);
      }
    });
  };

  const handleRequestDoc = () => {
    if (!docName) return;
    requestDoc.mutate({ deptName: department, appId, data: { documentName: docName } }, {
      onSuccess: () => {
        toast({ title: "Requested", description: "Document request sent to citizen.", variant: "default" });
        showWa("Document Required 📄", `Dear Citizen, the ${department} has requested a new document for application ${appId}: ${docName}. Please upload it in the portal.`);
      }
    });
  };

  return (
    <>
    <Card className="border-primary/20 shadow-md bg-card/50 overflow-hidden">
      <div className="bg-primary/10 px-4 py-3 border-b flex items-center justify-between">
        <h3 className="font-semibold text-sm flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-primary" /> Decision Panel
        </h3>
      </div>
      <div className="p-4 grid grid-cols-3 gap-4">
        <Button 
          className="w-full bg-green-600 hover:bg-green-700 text-white border-none shadow-sm" 
          onClick={handleApprove}
          disabled={updateStatus.isPending}
        >
          <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
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
              <DialogDescription>Citizen will be notified to upload this document.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Document Name / Description</Label>
              <Input value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. FSSAI License Draft" className="mt-2" />
            </div>
            <DialogFooter>
              <Button onClick={handleRequestDoc} disabled={requestDoc.isPending}>Send Request</Button>
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
              <DialogDescription>This action is final and will notify the citizen.</DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Label>Reason for rejection</Label>
              <Textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} placeholder="Provide clear reason..." className="mt-2" />
            </div>
            <DialogFooter>
              <Button variant="destructive" onClick={handleReject} disabled={updateStatus.isPending}>Confirm Rejection</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Card>
    <WhatsAppSimulator show={waPopup.show} onClose={() => setWaPopup(prev => ({...prev, show: false}))} title={waPopup.title} message={waPopup.msg} />
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
        <button onClick={onClose} className="opacity-70 hover:opacity-100"><XCircle className="w-5 h-5"/></button>
      </div>
      <div className="p-4 bg-[#E5DDD5] min-h-[120px] bg-[url('https://i.pinimg.com/originals/8c/98/99/8c98994518b575bfd8c949e91d20548b.jpg')] bg-cover">
        <div className="bg-white rounded-lg p-3 text-sm text-gray-800 shadow-sm max-w-[90%] relative">
          <div className="font-bold text-[#075E54] mb-1">{title}</div>
          {message}
          <div className="text-[10px] text-gray-400 text-right mt-1 font-mono">11:42 AM <CheckCircle2 className="inline w-3 h-3 text-blue-500"/></div>
        </div>
      </div>
    </div>
  );
}
