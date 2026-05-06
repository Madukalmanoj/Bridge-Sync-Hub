import React, { useState } from "react";
import { useGetFieldMappings, useRunSchemaMapping, useUpdateFieldMapping, getGetFieldMappingsQueryKey } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Database, Zap, Check, X, Edit2, Play, Activity } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export function SchemaMapperTab() {
  const [sourceSystem, setSourceSystem] = useState("SingleWindow");
  const [targetSystem, setTargetSystem] = useState("FoodSafety");
  const { toast } = useToast();

  const { data: mappings, isLoading, refetch } = useGetFieldMappings(sourceSystem, targetSystem, {
    query: { queryKey: getGetFieldMappingsQueryKey(sourceSystem, targetSystem), enabled: !!sourceSystem && !!targetSystem }
  });

  const runMapping = useRunSchemaMapping();
  const updateMapping = useUpdateFieldMapping();

  const handleRunMapping = () => {
    runMapping.mutate({
      data: {
        sourceSystem,
        targetSystem,
        sourceFields: ["businessName", "businessType", "district", "ownerName"],
        targetFields: ["establishmentName", "category", "region", "proprietor"]
      }
    }, {
      onSuccess: () => {
        toast({ title: "AI Mapping Complete", description: "Successfully generated field mappings." });
        refetch();
      }
    });
  };

  const handleConfirm = (id: number) => {
    updateMapping.mutate({ id, data: { confirmed: true } }, {
      onSuccess: () => refetch()
    });
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">AI Schema Mapper</h2>
          <p className="text-muted-foreground">Map data fields between systems automatically using AI.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-xs text-muted-foreground font-mono">Learning from corrections</span>
          </div>
          <Button onClick={handleRunMapping} disabled={runMapping.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
            {runMapping.isPending ? <Activity className="mr-2 h-4 w-4 animate-spin" /> : <Zap className="mr-2 h-4 w-4" />}
            Run AI Mapping
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-6 items-start">
        {/* Source System */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-muted/20 border-b">
            <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Source System</CardTitle>
            <Select value={sourceSystem} onValueChange={setSourceSystem}>
              <SelectTrigger className="mt-2 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="SingleWindow">Single Window Portal</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {mappings?.map(m => (
              <div key={`src-${m.id}`} className="p-3 border rounded-md bg-card shadow-sm flex items-center justify-between">
                <span className="font-mono text-sm">{m.sourceField}</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Connections */}
        <div className="flex flex-col items-center justify-center pt-24 space-y-8 w-24">
          {mappings?.map(m => (
            <div key={`conn-${m.id}`} className="flex flex-col items-center group relative w-full h-12 justify-center">
              <div className="w-full h-0.5 bg-primary/30 relative">
                <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded text-[10px] font-mono font-bold
                  ${m.confidence > 0.9 ? 'bg-green-500/20 text-green-500' : m.confidence > 0.7 ? 'bg-amber-500/20 text-amber-500' : 'bg-destructive/20 text-destructive'}`}>
                  {(m.confidence * 100).toFixed(0)}%
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Target System */}
        <Card className="border-border/50 shadow-sm">
          <CardHeader className="bg-muted/20 border-b">
            <CardTitle className="text-base flex items-center gap-2"><Database className="h-4 w-4 text-primary" /> Target System</CardTitle>
            <Select value={targetSystem} onValueChange={setTargetSystem}>
              <SelectTrigger className="mt-2 bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="FoodSafety">Food Safety</SelectItem>
                <SelectItem value="Labour">Labour Dept</SelectItem>
              </SelectContent>
            </Select>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {mappings?.map(m => (
              <div key={`tgt-${m.id}`} className={`p-3 border rounded-md bg-card shadow-sm flex items-center justify-between ${m.confirmed ? 'border-green-500/50 bg-green-500/5' : ''}`}>
                <span className="font-mono text-sm">{m.targetField}</span>
                <div className="flex gap-1">
                  {m.confirmed ? (
                    <Badge variant="outline" className="text-green-500 border-green-500/30 bg-green-500/10">Confirmed</Badge>
                  ) : (
                    <>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-green-500 hover:text-green-600 hover:bg-green-500/10" onClick={() => handleConfirm(m.id)}>
                        <Check className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" className="h-6 w-6 text-muted-foreground">
                        <Edit2 className="h-3 w-3" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
