import type React from "react";
import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";

interface LegacyModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  clickPosition?: { x: number; y: number } | null;
  className?: string;
  title?: string;
  fullScreen?: boolean;
}

const LegacyModal: React.FC<LegacyModalProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  title,
  fullScreen = false,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <div className="fixed inset-0 flex items-center justify-center p-2 sm:p-4 z-50 pointer-events-none">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className={`bg-card text-card-foreground rounded-2xl w-full max-h-[90vh] overflow-hidden flex flex-col pointer-events-auto border border-border/40 shadow-2xl relative ${className} ${fullScreen ? "h-[96dvh]" : ""}`}
            >
              {title && (
                <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between bg-card z-10 shrink-0">
                  <h3 className="text-lg sm:text-xl font-bold">{title}</h3>
                  <button onClick={onClose} className="p-2 rounded-xl hover:bg-muted transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              )}
              {children}
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
};
export default LegacyModal;
