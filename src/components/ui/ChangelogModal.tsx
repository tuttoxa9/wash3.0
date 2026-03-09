import React from "react";
import Modal from "./modal";
import { changelog, type ChangeType } from "@/lib/changelog";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const getBadgeStyle = (type: ChangeType) => {
  switch (type) {
    case "FEAT":
      return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
    case "FIX":
      return "text-rose-500 bg-rose-500/10 border-rose-500/20";
    case "UI":
      return "text-sky-500 bg-sky-500/10 border-sky-500/20";
    case "PERF":
      return "text-amber-500 bg-amber-500/10 border-amber-500/20";
    case "REFACTOR":
      return "text-purple-500 bg-purple-500/10 border-purple-500/20";
    default:
      return "text-muted-foreground bg-muted border-border";
  }
};

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Release History">
      <div className="space-y-6 max-h-[65vh] overflow-y-auto custom-scrollbar pr-1 sm:pr-3 pb-4">
        {changelog.map((release, idx) => (
          <div
            key={release.version}
            className="group relative bg-background/50 border border-border/40 rounded-xl overflow-hidden hover:border-border transition-colors duration-200"
          >
            {/* Header / Meta */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 sm:p-4 bg-muted/20 border-b border-border/40">
              <div className="flex items-center gap-3">
                <span className="font-mono text-base font-bold text-foreground tracking-tight">
                  {release.version}
                </span>
                {idx === 0 && (
                  <span className="font-mono text-[10px] uppercase font-bold tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded border border-primary/20">
                    LATEST
                  </span>
                )}
              </div>
              <span className="font-mono text-xs text-muted-foreground/80">
                {release.date}
              </span>
            </div>

            {/* Changes List */}
            <div className="p-3 sm:p-4">
              <ul className="space-y-3">
                {release.changes.map((change, cIdx) => (
                  <li
                    key={cIdx}
                    className="flex flex-col sm:flex-row sm:items-start gap-2 sm:gap-4"
                  >
                    <div className="shrink-0 pt-[2px]">
                      <span
                        className={`font-mono text-[10px] font-semibold tracking-wider px-1.5 py-0.5 rounded border ${getBadgeStyle(
                          change.type
                        )} flex justify-center w-fit sm:min-w-[70px]`}
                      >
                        {change.type}
                      </span>
                    </div>
                    <p className="text-[13px] text-muted-foreground leading-relaxed flex-1">
                      {change.text}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default ChangelogModal;
