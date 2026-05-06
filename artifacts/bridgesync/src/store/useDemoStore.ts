import { create } from "zustand";

interface DemoState {
  isDemoMode: boolean;
  toggleDemoMode: () => void;
  language: "en" | "kn";
  toggleLanguage: () => void;
}

export const useDemoStore = create<DemoState>((set) => ({
  isDemoMode: false,
  toggleDemoMode: () => set((state) => ({ isDemoMode: !state.isDemoMode })),
  language: "en",
  toggleLanguage: () => set((state) => ({ language: state.language === "en" ? "kn" : "en" })),
}));
