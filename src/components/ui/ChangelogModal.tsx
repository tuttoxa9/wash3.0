import React from "react";
import Modal from "./modal";
import { changelog } from "@/lib/changelog";

interface ChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangelogModal: React.FC<ChangelogModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="История обновлений">
      <div className="space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar pr-2 pb-4">
        {changelog.map((release, idx) => (
          <div
            key={release.version}
            className={`relative pl-6 pb-6 border-l-2 ${
              idx === 0 ? "border-primary" : "border-border/50"
            } ${idx === changelog.length - 1 ? "pb-0 border-transparent" : ""}`}
          >
            {/* Timeline dot */}
            <div
              className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-background ${
                idx === 0 ? "bg-primary" : "bg-muted-foreground/30"
              }`}
            />

            <div className="flex items-center gap-3 mb-3">
              <h3 className="text-lg font-bold text-foreground">
                {release.version}
              </h3>
              <span className="text-sm text-muted-foreground px-2 py-0.5 bg-muted rounded-md">
                {release.date}
              </span>
              {idx === 0 && (
                <span className="text-[10px] uppercase font-bold tracking-wider text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  Актуальная
                </span>
              )}
            </div>

            <div className="space-y-4">
              {release.features && release.features.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    ✨ Новое
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {release.features.map((feature, fIdx) => (
                      <li key={`feature-${fIdx}`}>{feature}</li>
                    ))}
                  </ul>
                </div>
              )}

              {release.design && release.design.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    🎨 Дизайн
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {release.design.map((item, dIdx) => (
                      <li key={`design-${dIdx}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {release.fixes && release.fixes.length > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-foreground mb-1 flex items-center gap-1.5">
                    🛠 Исправления и Оптимизации
                  </h4>
                  <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                    {release.fixes.map((fix, fxIdx) => (
                      <li key={`fix-${fxIdx}`}>{fix}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
};

export default ChangelogModal;
