import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useSubmitApplication, useGetApplication, useRespondDocument, getGetApplicationQueryKey } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useDemoStore } from "@/store/useDemoStore";
import { Activity, Search, FileText, CheckCircle2, Clock, Check, ArrowRight, Upload, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AIChatbot } from "./AIChatbot";

const formSchema = z.object({
  citizenName: z.string().min(2, "Name is required"),
  aadhaar: z.string().optional(),
  mobile: z.string().min(10, "Valid mobile number is required"),
  email: z.string().email("Valid email is required").optional().or(z.literal("")),
  businessName: z.string().min(2, "Business name is required"),
  businessType: z.string().min(2, "Business type is required"),
  district: z.string().min(2, "District is required"),
  description: z.string().optional(),
  startDate: z.string().optional(),
  documents: z.string().optional(),
});

export default function CitizenPortal() {
  const [activeTab, setActiveTab] = useState<"apply" | "track">("apply");
  const [trackingId, setTrackingId] = useState("");
  const { language } = useDemoStore();
  const { toast } = useToast();

  const isKn = language === "kn";
  const t = {
    title: isKn ? "ನಾಗರಿಕ ಪೋರ್ಟಲ್" : "Citizen Portal",
    subtitle: isKn ? "ಅರ್ಜಿ ಸಲ್ಲಿಸಿ ಮತ್ತು ಟ್ರ್ಯಾಕ್ ಮಾಡಿ" : "Submit and track applications across all departments via Single Window.",
    apply: isKn ? "ಹೊಸ ಅರ್ಜಿ" : "New Application",
    track: isKn ? "ಅರ್ಜಿ ಸ್ಥಿತಿ" : "Track Status",
    formTitle: isKn ? "ಏಕ ಗವಾಕ್ಷಿ ಅರ್ಜಿ" : "Single Window Application",
    formDesc: isKn ? "ಈ ಫಾರ್ಮ್ ಅನ್ನು ಒಮ್ಮೆ ಭರ್ತಿ ಮಾಡಿ. ನಾವು ಅದನ್ನು ಎಲ್ಲಾ ಅಗತ್ಯ ಇಲಾಖೆಗಳಿಗೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ರವಾನಿಸುತ್ತೇವೆ." : "Fill out this form once. We will route it to all required departments automatically.",
    applicantDetails: isKn ? "ಅರ್ಜಿದಾರರ ವಿವರಗಳು" : "Applicant Details",
    businessDetails: isKn ? "ವ್ಯವಹಾರದ ವಿವರಗಳು" : "Business Details",
    additionalInfo: isKn ? "ಹೆಚ್ಚುವರಿ ಮಾಹಿತಿ" : "Additional Information",
    submitBtn: isKn ? "ಏಕ ಗವಾಕ್ಷಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ" : "Submit Application to Single Window",
    trackSearch: isKn ? "ಅರ್ಜಿ ಐಡಿ ನಮೂದಿಸಿ" : "Enter Application ID (e.g., KA-2026-XXXXX)",
    trackBtn: isKn ? "ಹುಡುಕು" : "Track"
  };

  return (
    <div className="container max-w-5xl mx-auto py-8 px-4">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-primary flex items-center gap-3">
            <Activity className="h-8 w-8" />
            {t.title}
          </h1>
          <p className="text-muted-foreground mt-2">{t.subtitle}</p>
        </div>
        <div className="flex bg-muted/50 p-1 rounded-md border">
          <button
            onClick={() => setActiveTab("apply")}
            className={`px-4 py-2 text-sm font-medium rounded-sm transition-all ${
              activeTab === "apply" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.apply}
          </button>
          <button
            onClick={() => setActiveTab("track")}
            className={`px-4 py-2 text-sm font-medium rounded-sm transition-all ${
              activeTab === "track" ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.track}
          </button>
        </div>
      </div>

      {activeTab === "apply" ? (
        <ApplicationForm onTrack={(id) => { setTrackingId(id); setActiveTab("track"); }} />
      ) : (
        <ApplicationTracker initialId={trackingId} />
      )}
      <AIChatbot appId={trackingId || activeTab === "track" ? trackingId : undefined} />
    </div>
  );
}

function ApplicationForm({ onTrack }: { onTrack: (id: string) => void }) {
  const submitApp = useSubmitApplication();
  const { toast } = useToast();
  const [successId, setSuccessId] = useState<string | null>(null);
  const { language } = useDemoStore();
  const isKn = language === "kn";
  
  const t = {
    formTitle: isKn ? "ಏಕ ಗವಾಕ್ಷಿ ಅರ್ಜಿ" : "Single Window Application",
    formDesc: isKn ? "ಈ ಫಾರ್ಮ್ ಅನ್ನು ಒಮ್ಮೆ ಭರ್ತಿ ಮಾಡಿ. ನಾವು ಅದನ್ನು ಎಲ್ಲಾ ಅಗತ್ಯ ಇಲಾಖೆಗಳಿಗೆ ಸ್ವಯಂಚಾಲಿತವಾಗಿ ರವಾನಿಸುತ್ತೇವೆ." : "Fill out this form once. We will route it to all required departments automatically.",
    applicantDetails: isKn ? "ಅರ್ಜಿದಾರರ ವಿವರಗಳು" : "Applicant Details",
    businessDetails: isKn ? "ವ್ಯವಹಾರದ ವಿವರಗಳು" : "Business Details",
    additionalInfo: isKn ? "ಹೆಚ್ಚುವರಿ ಮಾಹಿತಿ" : "Additional Information",
    submitBtn: isKn ? "ಏಕ ಗವಾಕ್ಷಿಗೆ ಅರ್ಜಿ ಸಲ್ಲಿಸಿ" : "Submit Application to Single Window",
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      citizenName: "",
      aadhaar: "",
      mobile: "",
      email: "",
      businessName: "",
      businessType: "",
      district: "",
      description: "",
      startDate: "",
      documents: "business-license-draft.pdf",
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    submitApp.mutate({ data: values }, {
      onSuccess: (data) => {
        setSuccessId(data.appId);
        toast({
          title: "Application Submitted",
          description: `Your application ID is ${data.appId}. You can use this to track your status.`,
        });
      },
      onError: () => {
        toast({
          title: "Submission Failed",
          description: "There was an error submitting your application. Please try again.",
          variant: "destructive",
        });
      }
    });
  }

  if (successId) {
    return (
      <Card className="border-primary/20 shadow-lg bg-card/50 backdrop-blur-sm animate-in fade-in zoom-in duration-500">
        <CardContent className="pt-12 pb-12 flex flex-col items-center justify-center text-center space-y-6">
          <div className="h-20 w-20 bg-primary/10 rounded-full flex items-center justify-center">
            <CheckCircle2 className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold">Application Submitted Successfully</h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Your single window application has been routed to the relevant departments. Paperwork is moving.
            </p>
          </div>
          <div className="bg-muted p-4 rounded-md border font-mono text-xl tracking-widest text-primary flex items-center gap-4">
            {successId}
          </div>
          <Button onClick={() => onTrack(successId)} size="lg" className="mt-4 group">
            Track My Application
            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/50 shadow-md">
      <CardHeader className="border-b bg-muted/10 pb-6">
        <CardTitle>{t.formTitle}</CardTitle>
        <CardDescription>{t.formDesc}</CardDescription>
      </CardHeader>
      <CardContent className="pt-6">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">{t.applicantDetails}</h3>
                <FormField control={form.control} name="citizenName" render={({ field }) => (
                  <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input placeholder="John Doe" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="aadhaar" render={({ field }) => (
                  <FormItem><FormLabel>Aadhaar Number (Optional)</FormLabel><FormControl><Input placeholder="XXXX XXXX XXXX" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="mobile" render={({ field }) => (
                    <FormItem><FormLabel>Mobile</FormLabel><FormControl><Input placeholder="9876543210" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Email</FormLabel><FormControl><Input placeholder="john@example.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg border-b pb-2">{t.businessDetails}</h3>
                <FormField control={form.control} name="businessName" render={({ field }) => (
                  <FormItem><FormLabel>Business Name</FormLabel><FormControl><Input placeholder="Acme Foods" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="businessType" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Business Type</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="restaurant">Restaurant / Cafe</SelectItem>
                        <SelectItem value="manufacturing">Manufacturing</SelectItem>
                        <SelectItem value="retail">Retail Store</SelectItem>
                        <SelectItem value="it">IT Services</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="district" render={({ field }) => (
                  <FormItem>
                    <FormLabel>District</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select district" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="bengaluru_urban">Bengaluru Urban</SelectItem>
                        <SelectItem value="mysuru">Mysuru</SelectItem>
                        <SelectItem value="hubballi">Hubballi</SelectItem>
                        <SelectItem value="mangaluru">Mangaluru</SelectItem>
                        <SelectItem value="belagavi">Belagavi</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-lg">{t.additionalInfo}</h3>
              <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Description of Activities</FormLabel><FormControl><Textarea placeholder="Briefly describe your business operations..." className="h-20" {...field} /></FormControl><FormMessage /></FormItem>
              )} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField control={form.control} name="startDate" render={({ field }) => (
                  <FormItem><FormLabel>Expected Start Date</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="documents" render={({ field }) => (
                  <FormItem><FormLabel>Attached Documents</FormLabel><FormControl><Input placeholder="business-license.pdf" {...field} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>
            </div>

            <div className="pt-6 flex justify-end">
              <Button type="submit" size="lg" disabled={submitApp.isPending} className="w-full md:w-auto">
                {submitApp.isPending ? "Submitting..." : t.submitBtn}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

function DocumentRequestCard({ req, appId, refetch }: { req: any, appId: string, refetch: () => void }) {
  const [response, setResponse] = useState("");
  const [open, setOpen] = useState(false);
  const respondDoc = useRespondDocument();
  const { toast } = useToast();

  const handleRespond = () => {
    if (!response) return;
    respondDoc.mutate({ appId, data: { documentId: req.id, citizenResponse: response } }, {
      onSuccess: () => {
        toast({ title: "Document Submitted" });
        setOpen(false);
        refetch();
      }
    });
  };

  if (req.fulfilledAt) {
    return (
      <div className="p-3 border rounded-md bg-muted/30 border-green-500/20 text-sm">
        <div className="flex items-center gap-2 text-green-600 mb-1">
          <CheckCircle2 className="h-4 w-4" /> 
          <span className="font-medium">Fulfilled: {req.documentName}</span>
        </div>
        <p className="text-muted-foreground text-xs ml-6">{req.department}</p>
      </div>
    );
  }

  return (
    <div className="p-3 border rounded-md border-amber-500/50 bg-amber-500/5">
      <div className="flex justify-between items-start mb-2">
        <div>
          <h4 className="font-medium text-sm text-amber-600 dark:text-amber-500">{req.documentName}</h4>
          <p className="text-xs text-muted-foreground">Requested by {req.department}</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="h-8 border-amber-500 text-amber-600 hover:bg-amber-500/10">
              <Upload className="h-3 w-3 mr-1" /> Upload
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Upload Requested Document</DialogTitle>
              <DialogDescription>{req.documentName} for {req.department}</DialogDescription>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <div className="space-y-2">
                <Label>Document File / Link</Label>
                <Input value={response} onChange={e => setResponse(e.target.value)} placeholder="Enter file name or link..." />
              </div>
            </div>
            <DialogFooter>
              <Button onClick={handleRespond} disabled={respondDoc.isPending || !response}>Submit Document</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

function ApplicationTracker({ initialId }: { initialId: string }) {
  const [searchId, setSearchId] = useState(initialId);
  const [activeId, setActiveId] = useState(initialId);
  const { language } = useDemoStore();
  const isKn = language === "kn";

  const t = {
    trackSearch: isKn ? "ಅರ್ಜಿ ಐಡಿ ನಮೂದಿಸಿ" : "Enter Application ID (e.g., KA-2026-XXXXX)",
    trackBtn: isKn ? "ಹುಡುಕು" : "Track"
  };
  
  const { data, isLoading, error, refetch } = useGetApplication(activeId, {
    query: {
      enabled: !!activeId,
      queryKey: getGetApplicationQueryKey(activeId),
      refetchInterval: 5000, // Poll every 5s for live updates
    }
  });

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchId.trim()) setActiveId(searchId.trim());
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/50 shadow-md">
        <CardContent className="pt-6">
          <form onSubmit={handleSearch} className="flex gap-4">
            <Input 
              placeholder={t.trackSearch} 
              value={searchId} 
              onChange={(e) => setSearchId(e.target.value)}
              className="flex-1 font-mono uppercase text-lg h-12"
            />
            <Button type="submit" size="lg" className="h-12 px-8">
              <Search className="mr-2 h-5 w-5" /> {t.trackBtn}
            </Button>
          </form>
        </CardContent>
      </Card>

      {isLoading && (
        <Card className="border-border/50 p-12 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </Card>
      )}

      {error && (
        <Card className="border-destructive/50 bg-destructive/10 p-8 text-center">
          <p className="text-destructive font-medium">Application not found. Please check the ID and try again.</p>
        </Card>
      )}

      {data && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <Card className="border-border/50 shadow-md overflow-hidden">
              <div className="bg-muted px-6 py-4 border-b flex justify-between items-center">
                <h3 className="font-semibold">Application Details</h3>
                <Badge variant={data.application.overallStatus === 'Approved' ? 'default' : data.application.overallStatus === 'Rejected' ? 'destructive' : 'secondary'} className="capitalize">
                  {data.application.overallStatus}
                </Badge>
              </div>
              <CardContent className="p-0">
                <dl className="divide-y text-sm">
                  <div className="px-6 py-4 grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">App ID</dt>
                    <dd className="col-span-2 font-mono text-primary">{data.application.appId}</dd>
                  </div>
                  <div className="px-6 py-4 grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">Applicant</dt>
                    <dd className="col-span-2">{data.application.citizenName}</dd>
                  </div>
                  <div className="px-6 py-4 grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">Business</dt>
                    <dd className="col-span-2 font-medium">{data.application.businessName}</dd>
                  </div>
                  <div className="px-6 py-4 grid grid-cols-3 gap-4">
                    <dt className="text-muted-foreground font-medium">Submitted</dt>
                    <dd className="col-span-2">{new Date(data.application.submittedAt).toLocaleDateString()}</dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {data.deptApplications.length > 0 && (
              <Card className="border-border/50 shadow-md">
                <CardHeader className="pb-3 border-b bg-muted/20">
                  <CardTitle className="text-base">Department Routing</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {data.deptApplications.map(dept => (
                    <div key={dept.id} className="flex justify-between items-center p-3 border rounded-md bg-background">
                      <div>
                        <p className="font-medium text-sm">{dept.department}</p>
                        <p className="text-xs text-muted-foreground">Assigned: {dept.assignedOfficer || 'Pending'}</p>
                      </div>
                      <Badge
                        variant={dept.status === 'Approved' ? 'default' : dept.status === 'Rejected' ? 'destructive' : dept.status === 'Documents Requested' ? 'outline' : 'secondary'}
                        className={`capitalize text-xs ${dept.status === 'Approved' ? 'bg-green-600 text-white' : dept.status === 'Documents Requested' ? 'border-amber-500 text-amber-500' : ''}`}
                      >
                        {dept.status}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {data.documentRequests && data.documentRequests.length > 0 && (
              <Card className="border-amber-500/30 shadow-md">
                <CardHeader className="pb-3 border-b border-amber-500/20 bg-amber-500/10">
                  <CardTitle className="text-base text-amber-700 dark:text-amber-500">Action Required</CardTitle>
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {data.documentRequests.map(req => (
                    <DocumentRequestCard key={req.id} req={req} appId={data.application.appId} refetch={refetch} />
                  ))}
                </CardContent>
              </Card>
            )}
          </div>

          <div className="lg:col-span-2">
            <Card className="border-border/50 shadow-md h-full">
              <CardHeader className="border-b bg-muted/20">
                <CardTitle>Live Timeline</CardTitle>
                <CardDescription>Real-time updates from all connected departments</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <ScrollArea className="h-[500px] pr-4">
                  <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                    {data.workflowEvents
                      .slice()
                      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                      .map((event, index) => {
                        const toState = event.toState;
                        const fromState = event.fromState;
                        const actor = event.actor;
                        const isApproved = toState === 'Approved';
                        const isRejected = toState === 'Rejected';
                        const isDocReq = event.eventType === 'document.requested';
                        const isLatest = index === 0;

                        const iconBg = isApproved
                          ? 'bg-green-600 text-white'
                          : isRejected
                          ? 'bg-destructive text-destructive-foreground'
                          : isDocReq
                          ? 'bg-amber-500 text-white'
                          : isLatest
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground';

                        const Icon = isApproved
                          ? CheckCircle2
                          : isRejected
                          ? XCircle
                          : isDocReq
                          ? AlertCircle
                          : isLatest
                          ? RefreshCw
                          : Check;

                        const labelMap: Record<string, string> = {
                          'workflow.state.changed': 'Status Updated',
                          'document.requested': 'Document Requested',
                          'adapter.foodsafety.received': 'Food Safety Adapter — Fields Mapped',
                          'adapter.labour.received': 'Labour Adapter — Fields Mapped',
                          'application.submitted': 'Application Submitted',
                        };

                        const label = labelMap[event.eventType] ?? event.eventType.replace(/[._]/g, ' ');

                        return (
                          <div key={event.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                            <div className={`flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm ${iconBg}`}>
                              <Icon className={`w-4 h-4 ${isLatest && !isApproved && !isRejected && !isDocReq ? 'animate-spin' : ''}`} />
                            </div>
                            <div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border shadow-sm bg-card transition-all hover:shadow-md ${isApproved ? 'border-green-500/30 bg-green-500/5' : isRejected ? 'border-destructive/30 bg-destructive/5' : isDocReq ? 'border-amber-500/30 bg-amber-500/5' : ''}`}>
                              <div className="flex items-center justify-between mb-1">
                                <Badge variant="outline" className="text-[10px] font-mono">{event.department}</Badge>
                                <time className="text-xs text-muted-foreground font-mono">
                                  {new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </time>
                              </div>
                              <h4 className={`font-semibold text-sm ${isApproved ? 'text-green-600 dark:text-green-400' : isRejected ? 'text-destructive' : isDocReq ? 'text-amber-600 dark:text-amber-400' : ''}`}>
                                {label}
                              </h4>
                              {fromState && toState && (
                                <div className="flex items-center gap-1.5 mt-1.5">
                                  <span className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded text-muted-foreground">{fromState}</span>
                                  <ArrowRight className="h-3 w-3 text-muted-foreground shrink-0" />
                                  <span className={`text-[11px] font-mono px-1.5 py-0.5 rounded font-semibold ${isApproved ? 'bg-green-500/20 text-green-600 dark:text-green-400' : isRejected ? 'bg-destructive/20 text-destructive' : isDocReq ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400' : 'bg-primary/20 text-primary'}`}>
                                    {toState}
                                  </span>
                                </div>
                              )}
                              {actor && (
                                <p className="text-[11px] text-muted-foreground mt-1">by {actor}</p>
                              )}
                              {event.notes && (
                                <p className="text-xs text-muted-foreground mt-2 border-l-2 pl-2 italic leading-relaxed">{event.notes}</p>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    
                    {/* Submission Event (Base) */}
                    <div className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow-sm bg-muted text-muted-foreground">
                        <FileText className="w-4 h-4" />
                      </div>
                      <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded border shadow-sm bg-card/50">
                        <div className="flex items-center justify-between mb-1">
                          <Badge variant="outline" className="text-[10px] font-mono">SYSTEM</Badge>
                          <time className="text-xs text-muted-foreground font-mono">{new Date(data.application.submittedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
                        </div>
                        <h4 className="font-semibold text-sm">Application Submitted</h4>
                        <p className="text-sm text-muted-foreground mt-1.5">Received by BridgeSync Single Window Portal.</p>
                      </div>
                    </div>
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}
