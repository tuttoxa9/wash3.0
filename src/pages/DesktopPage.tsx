import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Waves, Megaphone, Palette, X, Settings, Send, Eye, EyeOff, Loader2, Check } from "@phosphor-icons/react";
import AppIcon from "@/components/Desktop/AppIcon";
import CrmLaunchModal from "@/components/Desktop/CrmLaunchModal";
import { useAuth } from "@/lib/context/AuthContext";
import { crmService } from "@/lib/services/crmService";
import type { CRMSettings } from "@/lib/types";
import { toast } from "sonner";

// ─── Telegram Settings Modal ──────────────────────────────────────
const TelegramSettingsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [settings, setSettings] = useState<CRMSettings>({
    telegramBotToken: "",
    telegramChatId: "",
    telegramEnabled: false,
    webhookApiKey: "",
  });
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [showToken, setShowToken] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      crmService.getSettings().then((data) => {
        if (data) setSettings(data);
        setLoading(false);
      });
    }
  }, [isOpen]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const appUrl = window.location.hostname === "localhost" ? (settings.appUrl || "") : window.location.origin;
    const success = await crmService.saveSettings({ ...settings, appUrl });
    setSaving(false);
    if (success) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleTest = async () => {
    if (!settings.telegramBotToken.trim() || !settings.telegramChatId.trim()) {
      return;
    }
    setTesting(true);
    try {
      const res = await fetch("/api/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ botToken: settings.telegramBotToken, chatId: settings.telegramChatId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Тест прошёл успешно!");
      } else {
        toast.error(`Ошибка: ${data.error || "неизвестная"}`);
      }
    } catch {
      toast.error("Ошибка подключения");
    } finally {
      setTesting(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="tg-backdrop"
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            key="tg-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <motion.div
              className="pointer-events-auto w-full max-w-[340px]"
              initial={{ scale: 0.92, opacity: 0, y: 16 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0, y: 8 }}
              transition={{ type: "spring", stiffness: 360, damping: 28 }}
            >
              <div className="relative bg-white/[0.04] backdrop-blur-[32px] rounded-3xl p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6)] text-white flex flex-col gap-4 border border-white/[0.08]">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-1.5 rounded-full text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                >
                  <X size={14} />
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/15 border border-sky-400/20 flex items-center justify-center flex-shrink-0">
                    <Send size={20} weight="duotone" className="text-sky-300" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Telegram-бот</p>
                    <p className="text-[11px] text-white/40">Уведомления для CRM и оклейки</p>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center py-4">
                    <Loader2 size={24} className="animate-spin text-white/40" />
                  </div>
                ) : (
                  <form onSubmit={handleSave} className="flex flex-col gap-3">
                    {/* Enable toggle */}
                    <button
                      type="button"
                      onClick={() => setSettings(p => ({ ...p, telegramEnabled: !p.telegramEnabled }))}
                      className={`flex items-center justify-between w-full px-3.5 py-2.5 rounded-2xl border transition-all text-xs font-medium ${
                        settings.telegramEnabled
                          ? "bg-sky-500/15 border-sky-400/30 text-sky-300"
                          : "bg-white/[0.04] border-white/[0.08] text-white/50"
                      }`}
                    >
                      <span>Уведомления включены</span>
                      <div className={`w-8 h-4 rounded-full transition-colors relative ${
                        settings.telegramEnabled ? "bg-sky-500" : "bg-white/20"
                      }`}>
                        <div className={`absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all ${
                          settings.telegramEnabled ? "right-0.5" : "left-0.5"
                        }`} />
                      </div>
                    </button>

                    {/* Bot Token */}
                    <div className="relative">
                      <input
                        type={showToken ? "text" : "password"}
                        placeholder="Bot Token"
                        value={settings.telegramBotToken}
                        onChange={(e) => setSettings(p => ({ ...p, telegramBotToken: e.target.value }))}
                        className="w-full px-3.5 py-2.5 pr-9 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white placeholder-white/20 text-xs focus:outline-none focus:border-white/20 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showToken ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    {/* Chat ID */}
                    <input
                      type="text"
                      placeholder="Chat ID"
                      value={settings.telegramChatId}
                      onChange={(e) => setSettings(p => ({ ...p, telegramChatId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-white/[0.04] border border-white/[0.08] rounded-2xl text-white placeholder-white/20 text-xs focus:outline-none focus:border-white/20 transition-all"
                    />

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTest}
                        disabled={testing || !settings.telegramBotToken || !settings.telegramChatId}
                        className="flex-1 py-2 bg-white/[0.07] hover:bg-white/[0.12] active:scale-[0.97] transition-all text-xs font-medium rounded-2xl text-white/70 border border-white/[0.08] disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {testing ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                        Тест
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-[2] py-2 bg-white/[0.12] hover:bg-white/[0.18] active:scale-[0.97] active:bg-white/[0.22] transition-all text-xs font-bold rounded-2xl text-white border-0 disabled:opacity-50 flex items-center justify-center gap-1.5"
                      >
                        {saving ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : saved ? (
                          <><Check size={12} />Сохранено!</>
                        ) : (
                          "Сохранить"
                        )}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

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

// ─── Wash launching overlay ───────────────────────────────────────
const WashLaunchOverlay: React.FC<{ visible: boolean }> = ({ visible }) => (
  <AnimatePresence>
    {visible && (
      <motion.div
        key="wash-launching"
        className="fixed inset-0 z-[60] flex flex-col items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="absolute inset-0 bg-black/65 backdrop-blur-sm" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Открываю Мойку...</p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Main Desktop Page ────────────────────────────────────────────
const DesktopPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [crmModalOpen, setCrmModalOpen] = useState(false);
  const [tgModalOpen, setTgModalOpen] = useState(false);
  const [washLaunching, setWashLaunching] = useState(false);

  const handleWashClick = () => {
    if (user) {
      setWashLaunching(true);
      setTimeout(() => navigate("/wash"), 600);
    } else {
      navigate("/login");
    }
  };

  const handleOkleykaClick = () => {
    if (user) {
      navigate("/okleyka");
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
      onClick: handleOkleykaClick,
    },
  ];

  return (
    <div className="min-h-[100dvh] w-full overflow-hidden relative bg-black select-none">

      {/* ── Wallpaper background ── */}
      <div className="absolute inset-0 z-0">
        <img
          src="/wallpapers/desktop_bg.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable="false"
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* ── Top bar: logo left, TG settings + clock right ── */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-2">
        <div className="flex items-center gap-2.5 pointer-events-none">
          <img
            src="/logo.png"
            alt="Detail Lab"
            className="h-6 w-auto object-contain opacity-70"
            draggable="false"
          />
        </div>
        <div className="flex items-center gap-3">
          {/* Telegram settings button */}
          <button
            onClick={() => setTgModalOpen(true)}
            className="p-2 rounded-xl text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all active:scale-95"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
            title="Настройки Telegram-бота"
          >
            <Settings size={18} weight="bold" />
          </button>
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
      <WashLaunchOverlay visible={washLaunching} />
      <TelegramSettingsModal isOpen={tgModalOpen} onClose={() => setTgModalOpen(false)} />
    </div>
  );
};

export default DesktopPage;
