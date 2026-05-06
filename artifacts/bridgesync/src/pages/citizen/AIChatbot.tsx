import React, { useState } from "react";
import { useChatWithAssistant } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { MessageSquare, X, Send, Bot } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useDemoStore } from "@/store/useDemoStore";

export function AIChatbot({ appId }: { appId?: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<{role: 'user' | 'assistant', text: string}[]>([]);
  const { language } = useDemoStore();
  const chat = useChatWithAssistant();

  const handleSend = () => {
    if (!message.trim()) return;
    
    setHistory(prev => [...prev, { role: 'user', text: message }]);
    const currentMsg = message;
    setMessage("");

    chat.mutate({
      data: { message: currentMsg, appId, language }
    }, {
      onSuccess: (data) => {
        setHistory(prev => [...prev, { role: 'assistant', text: data.reply }]);
      }
    });
  };

  if (!isOpen) {
    return (
      <Button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-2xl p-0 animate-in slide-in-from-bottom-10 fade-in"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-6 right-6 w-80 h-[500px] shadow-2xl flex flex-col z-50 animate-in slide-in-from-bottom-10 fade-in border-primary/20">
      <CardHeader className="p-4 border-b bg-primary text-primary-foreground rounded-t-lg flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5" />
          <CardTitle className="text-sm">BridgeSync Assistant</CardTitle>
        </div>
        <Button variant="ghost" size="icon" className="h-6 w-6 text-primary-foreground hover:bg-primary-foreground/20" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-1 p-0 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4">
            <div className="bg-muted p-3 rounded-lg rounded-tl-none text-sm max-w-[85%]">
              Hello! I'm the AI assistant. I can help you understand the requirements or check the status of your application{appId ? ` ${appId}` : ''}.
            </div>
            {history.map((msg, i) => (
              <div key={i} className={`p-3 rounded-lg text-sm max-w-[85%] ${msg.role === 'user' ? 'bg-primary text-primary-foreground ml-auto rounded-tr-none' : 'bg-muted rounded-tl-none mr-auto'}`}>
                {msg.text}
              </div>
            ))}
            {chat.isPending && (
              <div className="bg-muted p-3 rounded-lg rounded-tl-none text-sm max-w-[85%] flex gap-1">
                <span className="animate-bounce">.</span><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter className="p-3 border-t bg-muted/10">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex w-full gap-2">
          <Input 
            placeholder="Type a message..." 
            value={message} 
            onChange={e => setMessage(e.target.value)}
            className="flex-1"
          />
          <Button type="submit" size="icon" disabled={chat.isPending || !message.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </CardFooter>
    </Card>
  );
}
