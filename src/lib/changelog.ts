export type ChangeType = "FEAT" | "FIX" | "UI" | "PERF" | "REFACTOR";

export interface ChangeItem {
  type: ChangeType;
  text: string;
}

export interface ChangelogRelease {
  version: string;
  date: string;
  changes: ChangeItem[];
}

export const changelog: ChangelogRelease[] = [
  {
    version: "v1.0.0",
    date: "2025-03-09",
    changes: [
      { type: "UI", text: "Global transition to Meta-style UI with semantic tabbed layouts." },
      { type: "UI", text: "Integrated corporate 'Onest' font across all application layers." },
      { type: "FIX", text: "Corrected precision logic for cash, terminal, debt, and organization totals in DOCX generation." },
      { type: "REFACTOR", text: "Separated role determination engine from state derivation in historical reporting." }
    ]
  },
  {
    version: "v0.9.5",
    date: "2025-03-08",
    changes: [
      { type: "FEAT", text: "Introduced isolated 'Morning Lobby' (Pre-shift screen) architecture." },
      { type: "REFACTOR", text: "Decoupled monolithic Dashboard into modular, feature-specific components." },
      { type: "UI", text: "Refined strict CSS-only transitions for shift editing modals, replacing heavy framer-motion loops." }
    ]
  },
  {
    version: "v0.9.0",
    date: "2025-03-06",
    changes: [
      { type: "FEAT", text: "Implemented real-time 'Shift notes' synchronization within Sidebar drawer." },
      { type: "FEAT", text: "Added administrative toggle for including/excluding organizations from net revenue calculation." },
      { type: "UI", text: "Engineered General Revenue Report utilizing dense data-table structure with optimized mobile overflow." },
      { type: "PERF", text: "Reduced Big O complexity in appointment aggregation from O(N*M) to O(N) using isolated reduce passes." }
    ]
  }
];

export const CURRENT_VERSION = changelog[0].version;
