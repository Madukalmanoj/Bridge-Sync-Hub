import React, { useState } from "react";
import { useDiscoverSchema, useOnboardDepartment } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Database, CheckCircle2, ArrowRight, Loader2, Link as LinkIcon, Network } from "lucide-react";

export function OnboardingTab() {
  const [step, setStep] = useState(1);
  const [deptName, setDeptName] = useState("");
  const [systemType, setSystemType] = useState("postgres");
  const { toast } = useToast();

  const discoverSchema = useDiscoverSchema();
  const onboard = useOnboardDepartment();

  const nextStep = () => setStep(s => Math.min(5, s + 1));
  const prevStep = () => setStep(s => Math.max(1, s - 1));

  const handleTestConnection = () => {
    // Simulate connection test
    setTimeout(() => {
      toast({ title: "Connection Successful", description: "Established secure tunnel to department system." });
      nextStep();
    }, 1500);
  };

  const handleDiscover = () => {
    discoverSchema.mutate({ data: { departmentName: deptName, systemType } }, {
      onSuccess: () => {
        toast({ title: "Schema Discovered", description: `Found ${discoverSchema.data?.length || 0} fields.` });
        nextStep();
      }
    });
  };

  const handleFinish = () => {
    onboard.mutate({ data: { name: deptName, systemType } }, {
      onSuccess: () => {
        toast({ title: "Department Onboarded", description: `${deptName} is now live on BridgeSync.` });
        setStep(5);
      }
    });
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Department Onboarding</h2>
        <p className="text-muted-foreground">Connect legacy systems to the Single Window portal in minutes.</p>
      </div>

      <div className="flex justify-between mb-8 relative before:absolute before:top-1/2 before:w-full before:h-1 before:bg-muted before:-z-10">
        {[1,2,3,4,5].map(s => (
          <div key={s} className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-4 ${
            step > s ? 'bg-primary border-primary text-primary-foreground' :
            step === s ? 'bg-background border-primary text-primary' :
            'bg-background border-muted text-muted-foreground'
          }`}>
            {step > s ? <CheckCircle2 className="h-4 w-4" /> : s}
          </div>
        ))}
      </div>

      <Card className="border-border/50 shadow-md">
        {step === 1 && (
          <>
            <CardHeader>
              <CardTitle>Department Details</CardTitle>
              <CardDescription>Enter the department name and database type.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Department Name</Label>
                <Input value={deptName} onChange={e => setDeptName(e.target.value)} placeholder="e.g. Environment Control Board" />
              </div>
              <div className="space-y-2">
                <Label>System Type</Label>
                <Select value={systemType} onValueChange={setSystemType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="postgres">PostgreSQL</SelectItem>
                    <SelectItem value="mysql">MySQL</SelectItem>
                    <SelectItem value="oracle">Oracle DB</SelectItem>
                    <SelectItem value="mssql">Legacy MS SQL</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
            <CardFooter className="justify-end">
              <Button onClick={nextStep} disabled={!deptName}>Next <ArrowRight className="ml-2 h-4 w-4" /></Button>
            </CardFooter>
          </>
        )}

        {step === 2 && (
          <>
            <CardHeader>
              <CardTitle>Connection Test</CardTitle>
              <CardDescription>Verify secure connection to {deptName}'s {systemType} database.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 flex flex-col items-center py-8">
              <Network className="h-16 w-16 text-muted-foreground mb-4" />
              <div className="w-full max-w-sm space-y-2">
                <Label>Connection String / URL</Label>
                <Input type="password" value="************************" readOnly />
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="ghost" onClick={prevStep}>Back</Button>
              <Button onClick={handleTestConnection}><LinkIcon className="mr-2 h-4 w-4" /> Test Connection</Button>
            </CardFooter>
          </>
        )}

        {step === 3 && (
          <>
            <CardHeader>
              <CardTitle>AI Schema Discovery</CardTitle>
              <CardDescription>Scan the connected database to discover tables and fields.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Database className="h-16 w-16 text-primary mb-6" />
              <p className="text-muted-foreground max-w-md">
                BridgeSync AI will scan the target database, identify relevant applicant/business tables, and prepare them for mapping to the Single Window standard.
              </p>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="ghost" onClick={prevStep}>Back</Button>
              <Button onClick={handleDiscover} disabled={discoverSchema.isPending}>
                {discoverSchema.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Database className="mr-2 h-4 w-4" />}
                Run Discovery
              </Button>
            </CardFooter>
          </>
        )}

        {step === 4 && (
          <>
            <CardHeader>
              <CardTitle>Review Discovered Schema</CardTitle>
              <CardDescription>Found fields in target system.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border rounded-md divide-y max-h-64 overflow-auto">
                {discoverSchema.data?.map((f: any, i: number) => (
                  <div key={i} className="p-3 flex justify-between bg-card text-sm">
                    <span className="font-mono font-medium">{f.fieldName}</span>
                    <span className="text-muted-foreground">{f.fieldType}</span>
                  </div>
                ))}
                {!discoverSchema.data && (
                   <div className="p-8 text-center text-muted-foreground">Run discovery first</div>
                )}
              </div>
            </CardContent>
            <CardFooter className="justify-between">
              <Button variant="ghost" onClick={prevStep}>Back</Button>
              <Button onClick={handleFinish} disabled={onboard.isPending}>Complete Onboarding</Button>
            </CardFooter>
          </>
        )}

        {step === 5 && (
          <CardContent className="flex flex-col items-center py-16 text-center">
            <div className="h-20 w-20 bg-green-500/20 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-10 w-10 text-green-500" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Department Onboarded Successfully</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              {deptName} is now fully integrated into the BridgeSync Single Window Portal. You can now use the Schema Mapper to connect fields.
            </p>
            <Button onClick={() => setStep(1)} variant="outline">Onboard Another</Button>
          </CardContent>
        )}
      </Card>
    </div>
  );
}
