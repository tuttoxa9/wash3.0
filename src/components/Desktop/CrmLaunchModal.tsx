import { useEffect, useRef, useState } from "react";
import type React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/lib/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";

interface CrmLaunchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CrmLaunchModal: React.FC<CrmLaunchModalProps> = ({ isOpen, onClose }) => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [error, setError] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  // If already authenticated — auto-launch CRM
  useEffect(() => {
    if (isOpen && user) {
      setLaunching(true);
      const t = setTimeout(() => {
        navigate("/crm");
      }, 800);
      return () => clearTimeout(t);
    }
  }, [isOpen, user, navigate]);

  // Focus email field when modal opens for unauthenticated user
  useEffect(() => {
    if (isOpen && !user) {
      const t = setTimeout(() => emailRef.current?.focus(), 350);
      return () => clearTimeout(t);
    }
  }, [isOpen, user]);

  // Reset state on close
  useEffect(() => {
    if (!isOpen) {
      setEmail("");
      setPassword("");
      setError("");
      setLaunching(false);
    }
  }, [isOpen]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setError("");

    try {
      const { error } = await login({ email, password });
      if (error) throw error;

      setLaunching(true);
      setTimeout(() => {
        navigate("/crm");
      }, 800);
    } catch {
      setError("Неверный email или пароль");
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="crm-backdrop"
            className="fixed inset-0 z-40 bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />

          {/* Modal window — same glass style as LoginPage */}
          <motion.div
            key="crm-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <motion.div
              className="pointer-events-auto w-full max-w-[280px]"
              initial={{ scale: 0.5, opacity: 0, y: 24 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: 12 }}
              transition={{
                type: "spring",
                stiffness: 380,
                damping: 30,
                opacity: { duration: 0.2 },
              }}
            >
              {/* Card — identical look to LoginPage card */}
              <div className="relative w-full bg-white/[0.03] dark:bg-black/25 backdrop-blur-[32px] rounded-3xl p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] text-white flex flex-col gap-4">

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-1.5 rounded-full text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                  aria-label="Закрыть"
                >
                  <X className="w-3.5 h-3.5" />
                </button>

                {/* Logo + subtitle */}
                <div className="text-center flex flex-col items-center gap-1 mb-1">
                  <img
                    src="/logo.png"
                    alt="Detail Lab"
                    className="h-10 w-auto object-contain drop-shadow-md select-none pointer-events-none"
                    draggable="false"
                  />
                  <p className="text-[9px] text-white/40 mt-1">Реклама / CRM</p>
                </div>

                {/* Login form */}
                <form onSubmit={handleLogin} className="space-y-3">
                  <input
                    ref={emailRef}
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="w-full px-3.5 py-2 bg-white/[0.04] dark:bg-black/35 backdrop-blur-[12px] rounded-2xl text-white placeholder-white/20 text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all border-0"
                  />
                  <input
                    type="password"
                    placeholder="Пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                    className="w-full px-3.5 py-2 bg-white/[0.04] dark:bg-black/35 backdrop-blur-[12px] rounded-2xl text-white placeholder-white/20 text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all border-0"
                  />

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-red-400 text-[10px] text-center bg-red-950/20 py-2 px-3 rounded-2xl"
                    >
                      {error}
                    </motion.div>
                  )}

                  <button
                    type="submit"
                    disabled={loginLoading}
                    className="w-full py-2 mt-1 bg-white/[0.14] hover:bg-white/[0.22] active:bg-white/[0.28] active:scale-[0.97] backdrop-blur-[8px] transition-all text-xs font-bold rounded-2xl text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_4px_15px_rgba(0,0,0,0.2)] border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loginLoading ? (
                      <span className="flex items-center justify-center gap-2">
                        <span className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                        Вход...
                      </span>
                    ) : (
                      "Войти"
                    )}
                  </button>
                </form>
              </div>
            </motion.div>
          </motion.div>

          {/* Full-screen launching overlay */}
          <AnimatePresence>
            {launching && (
              <motion.div
                key="launching"
                className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
              >
                <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
                <div className="relative z-10 flex flex-col items-center gap-3">
                  <div className="w-10 h-10 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
                  <p className="text-white/60 text-sm">Открываю CRM...</p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};

export default CrmLaunchModal;
