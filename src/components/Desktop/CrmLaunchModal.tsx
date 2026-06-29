import { useEffect, useState } from "react";
import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/context/AuthContext";
import { useNavigate } from "react-router-dom";

interface CrmLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CrmLaunchModal: React.FC<CrmLaunchModalProps> = ({ isOpen, onClose }) => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [launching, setLaunching] = useState(false);

  // If authenticated — auto-launch CRM
  useEffect(() => {
    if (isOpen && user) {
      setLaunching(true);
      const t = setTimeout(() => {
        navigate("/crm");
      }, 800);
      return () => clearTimeout(t);
    }
    // If not authenticated — redirect to login
    if (isOpen && !loading && !user) {
      onClose();
      navigate("/login");
    }
  }, [isOpen, user, loading, navigate, onClose]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setLaunching(false);
    }
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && launching && (
        <motion.div
          key="crm-launching"
          className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Solid dark overlay — no backdrop-blur */}
          <div className="absolute inset-0 bg-black/75" />
          <div className="relative z-10 flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
            <p className="text-white/60 text-sm">Открываю CRM...</p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default CrmLaunchModal;
