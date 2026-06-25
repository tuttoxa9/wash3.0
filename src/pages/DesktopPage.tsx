import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Waves, Megaphone, Palette, X } from "@phosphor-icons/react";
import AppIcon from "@/components/Desktop/AppIcon";
import CrmLaunchModal from "@/components/Desktop/CrmLaunchModal";
import { useAuth } from "@/lib/context/AuthContext";

// ─── "В разработке" попап ─────────────────────────────────────────
const WipModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => (
  <AnimatePresence>
    {isOpen && (
      <>
        <motion.div
          key="wip-backdrop"
          className="fixed inset-0 z-40 bg-black/30"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={onClose}
        />
        <motion.div
          key="wip-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
        >
          <motion.div
            className="pointer-events-auto w-full max-w-[260px]"
            initial={{ scale: 0.5, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
          >
            <div className="relative bg-white/[0.03] backdrop-blur-[32px] rounded-3xl p-6 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] text-white flex flex-col items-center gap-4">
              <button
                onClick={onClose}
                className="absolute top-3 right-3 p-1.5 rounded-full text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                aria-label="Закрыть"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              <div className="w-14 h-14 rounded-2xl bg-purple-500/15 border border-purple-400/20 flex items-center justify-center">
                <Palette size={28} weight="duotone" className="text-purple-300" />
              </div>

              <div className="text-center space-y-1.5">
                <p className="font-semibold text-sm text-white">Оклейка</p>
                <p className="text-white/50 text-[11px] leading-relaxed">
                  В разработке. Скоро здесь появится приложение для работы с оклейкой.
                </p>
              </div>

              <button
                onClick={onClose}
                className="w-full py-2 bg-white/[0.1] hover:bg-white/[0.16] active:scale-[0.97] transition-all text-xs font-medium rounded-2xl text-white/80 border-0"
              >
                Закрыть
              </button>
            </div>
          </motion.div>
        </motion.div>
      </>
    )}
  </AnimatePresence>
);

// ─── Desktop clock widget ─────────────────────────────────────────
const ClockWidget: React.FC = () => {
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const hours = time.getHours().toString().padStart(2, "0");
  const minutes = time.getMinutes().toString().padStart(2, "0");

  const dateStr = time.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="text-right select-none" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.8)" }}>
      <p className="text-white/90 text-2xl font-light tracking-tight leading-none">
        {hours}:{minutes}
      </p>
      <p className="text-white/40 text-[11px] mt-0.5 capitalize">{dateStr}</p>
    </div>
  );
};

// ─── Main Desktop Page ────────────────────────────────────────────
const DesktopPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [crmModalOpen, setCrmModalOpen] = useState(false);
  const [wipModalOpen, setWipModalOpen] = useState(false);

  const handleWashClick = () => {
    if (user) {
      navigate("/wash");
    } else {
      navigate("/login");
    }
  };

  const apps = [
    {
      id: "wash",
      label: "Мойка",
      icon: <Waves size={38} weight="duotone" className="text-blue-300" />,
      color: "bg-blue-500/40",
      onClick: handleWashClick,
    },
    {
      id: "crm",
      label: "Реклама",
      icon: <Megaphone size={38} weight="duotone" className="text-amber-300" />,
      color: "bg-amber-500/40",
      onClick: () => setCrmModalOpen(true),
    },
    {
      id: "okleyka",
      label: "Оклейка",
      icon: <Palette size={38} weight="duotone" className="text-purple-300" />,
      color: "bg-purple-500/40",
      onClick: () => setWipModalOpen(true),
    },
  ];

  return (
    <div className="min-h-[100dvh] w-full overflow-hidden relative bg-black select-none">

      {/* ── Wallpaper background ── */}
      <div className="absolute inset-0 z-0">
        <img
          src="/wallpapers/desktop_bg.jpg"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable="false"
        />
        {/* Subtle dark overlay so icons are readable */}
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* ── Top bar: logo left, clock right ── */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-2 pointer-events-none">
        <div className="flex items-center gap-2.5">
          <img
            src="/logo.png"
            alt="Detail Lab"
            className="h-6 w-auto object-contain opacity-70"
            draggable="false"
          />
        </div>
        <div className="pointer-events-none">
          <ClockWidget />
        </div>
      </div>

      {/* ── App icons — top-left grid ── */}
      <div className="relative z-10 px-6 pt-8">
        <motion.div
          className="flex flex-row flex-wrap gap-5"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: {},
            visible: { transition: { staggerChildren: 0.07, delayChildren: 0.15 } },
          }}
        >
          {apps.map((app) => (
            <motion.div
              key={app.id}
              variants={{
                hidden: { opacity: 0, y: 16, scale: 0.88 },
                visible: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 320, damping: 24 } },
              }}
            >
              <AppIcon
                icon={app.icon}
                label={app.label}
                color={app.color}
                onClick={app.onClick}
              />
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* ── Modals ── */}
      <CrmLaunchModal isOpen={crmModalOpen} onClose={() => setCrmModalOpen(false)} />
      <WipModal isOpen={wipModalOpen} onClose={() => setWipModalOpen(false)} />
    </div>
  );
};

export default DesktopPage;
