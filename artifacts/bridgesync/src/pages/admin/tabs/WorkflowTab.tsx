import React, { useState } from "react";
import { useGetWorkflowStates, useAddWorkflowState } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Workflow, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function WorkflowTab() {
  const { data: states, refetch } = useGetWorkflowStates();
  const addState = useAddWorkflowState();
  const { toast } = useToast();

  const [newSw, setNewSw] = useState("");
  const [newFs, setNewFs] = useState("");
  const [newLab, setNewLab] = useState("");

  const handleAdd = () => {
    if (!newSw || !newFs || !newLab) return;
    addState.mutate({ data: { swState: newSw, foodSafetyState: newFs, labourState: newLab } }, {
      onSuccess: () => {
        toast({ title: "Workflow State Added" });
        setNewSw(""); setNewFs(""); setNewLab("");
        refetch();
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto py-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Workflow className="h-6 w-6" /> Workflow State Translator
        </h2>
        <p className="text-muted-foreground">Normalize varying department statuses into the Single Window taxonomy.</p>
      </div>

      <Card className="border-border/50 shadow-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/20">
              <TableRow>
                <TableHead className="w-1/3">Single Window (Standard)</TableHead>
                <TableHead className="w-1/3">Food Safety (Target)</TableHead>
                <TableHead className="w-1/3">Labour Dept (Target)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {states?.map(s => (
                <TableRow key={s.id}>
                  <TableCell className="font-mono font-medium text-primary">{s.swState}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{s.foodSafetyState}</TableCell>
                  <TableCell className="font-mono text-muted-foreground">{s.labourState}</TableCell>
                </TableRow>
              ))}
              <TableRow className="bg-muted/10">
                <TableCell><Input placeholder="e.g. pending_payment" value={newSw} onChange={e=>setNewSw(e.target.value)} className="font-mono text-sm h-8" /></TableCell>
                <TableCell><Input placeholder="e.g. fees_due" value={newFs} onChange={e=>setNewFs(e.target.value)} className="font-mono text-sm h-8" /></TableCell>
                <TableCell><Input placeholder="e.g. awaiting_challan" value={newLab} onChange={e=>setNewLab(e.target.value)} className="font-mono text-sm h-8" /></TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="p-4 border-t flex justify-end bg-muted/5">
            <Button onClick={handleAdd} disabled={addState.isPending || !newSw} size="sm">
              <Plus className="mr-2 h-4 w-4" /> Add State Mapping
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
