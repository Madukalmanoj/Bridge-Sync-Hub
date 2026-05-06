import React from "react";
import { Link, useLocation } from "wouter";
import { useDemoStore } from "@/store/useDemoStore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [location] = useLocation();
  const { isDemoMode, toggleDemoMode, language, toggleLanguage } = useDemoStore();

  const navItems = [
    { label: "Citizen Portal", path: "/" },
    { label: "Officer Dashboard", path: "/officer" },
    { label: "Admin Console", path: "/admin" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <BridgeLogo className="h-6 w-6 text-primary" />
            <span className="hidden font-bold sm:inline-block tracking-tight text-primary">
              BridgeSync
            </span>
          </Link>
          <nav className="flex items-center space-x-6 text-sm font-medium">
            {navItems.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={`transition-colors hover:text-foreground/80 ${
                  location === item.path ? "text-foreground font-bold border-b-2 border-primary" : "text-foreground/60"
                }`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            {isDemoMode && (
              <span className="inline-flex items-center rounded-sm border border-destructive bg-destructive/10 px-2.5 py-0.5 text-xs font-semibold text-destructive transition-colors mr-4 animate-pulse">
                DEMO MODE
              </span>
            )}
          </div>
          <nav className="flex items-center space-x-4">
            <Button variant="ghost" size="sm" onClick={toggleLanguage} className="font-mono border">
              {language === 'en' ? 'A / ಅ' : 'ಅ / A'}
            </Button>
            <div className="flex items-center space-x-2 border-l pl-4 border-border/50">
              <Switch id="demo-mode" checked={isDemoMode} onCheckedChange={toggleDemoMode} />
              <Label htmlFor="demo-mode" className="text-xs uppercase tracking-wider font-mono">Demo</Label>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}

function BridgeLogo(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="square"
      strokeLinejoin="bevel"
      {...props}
    >
      <path d="M4 22V10" />
      <path d="M20 22V10" />
      <path d="M2 10C2 5.5 6.5 2 12 2C17.5 2 22 5.5 22 10" />
      <path d="M4 14H20" />
      <path d="M4 18H20" />
    </svg>
  );
}
