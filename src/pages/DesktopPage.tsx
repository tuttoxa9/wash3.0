import type React from "react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Waves, Megaphone, Palette, X, Gear, PaperPlane, Eye, EyeSlash, Check } from "@phosphor-icons/react";
import { Loader2 } from "lucide-react";
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
          {/* Solid dark backdrop — no blur */}
          <motion.div
            key="tg-backdrop"
            className="fixed inset-0 z-40 bg-black/60"
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
              {/* Solid card — no glass/blur */}
              <div className="relative bg-zinc-900 rounded-3xl p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] text-white flex flex-col gap-4 border border-zinc-800">
                <button
                  onClick={onClose}
                  className="absolute top-3 right-3 p-1.5 rounded-full text-white/40 hover:text-white/80 hover:bg-white/[0.08] transition-all"
                >
                  <X size={14} />
                </button>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0">
                    <PaperPlane size={20} weight="duotone" className="text-sky-400" />
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
                          ? "bg-sky-500/20 border-sky-500/40 text-sky-300"
                          : "bg-zinc-800 border-zinc-700 text-white/50"
                      }`}
                    >
                      <span>Уведомления включены</span>
                      <div className={`w-8 h-4 rounded-full transition-colors relative ${
                        settings.telegramEnabled ? "bg-sky-500" : "bg-zinc-600"
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
                        className="w-full px-3.5 py-2.5 pr-9 bg-zinc-800 border border-zinc-700 rounded-2xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-zinc-500 transition-all"
                      />
                      <button
                        type="button"
                        onClick={() => setShowToken(p => !p)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
                      >
                        {showToken ? <EyeSlash size={14} /> : <Eye size={14} />}
                      </button>
                    </div>

                    {/* Chat ID */}
                    <input
                      type="text"
                      placeholder="Chat ID"
                      value={settings.telegramChatId}
                      onChange={(e) => setSettings(p => ({ ...p, telegramChatId: e.target.value }))}
                      className="w-full px-3.5 py-2.5 bg-zinc-800 border border-zinc-700 rounded-2xl text-white placeholder-white/30 text-xs focus:outline-none focus:border-zinc-500 transition-all"
                    />

                    <div className="flex gap-2 pt-1">
                      <button
                        type="button"
                        onClick={handleTest}
                        disabled={testing || !settings.telegramBotToken || !settings.telegramChatId}
                        className="flex-1 py-2 bg-zinc-800 hover:bg-zinc-700 active:scale-[0.97] transition-all text-xs font-medium rounded-2xl text-white/70 border border-zinc-700 disabled:opacity-40 flex items-center justify-center gap-1.5"
                      >
                        {testing ? <Loader2 size={12} className="animate-spin" /> : <PaperPlane size={12} />}
                        Тест
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="flex-[2] py-2 bg-zinc-700 hover:bg-zinc-600 active:scale-[0.97] transition-all text-xs font-bold rounded-2xl text-white border-0 disabled:opacity-50 flex items-center justify-center gap-1.5"
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
        {/* Solid dark overlay — no backdrop-blur */}
        <div className="absolute inset-0 bg-black/75" />
        <div className="relative z-10 flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
          <p className="text-white/60 text-sm">Открываю Мойку...</p>
        </div>
      </motion.div>
    )}
  </AnimatePresence>
);

// ─── Blocked App Modal ────────────────────────────────────────────
const BlockedAppModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [stage, setStage] = useState<"loading" | "message" | "success">("loading");
  const [requestId, setRequestId] = useState<string>("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setStage("loading");
      const timer = setTimeout(() => {
        setStage("message");
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleSendRequest = async () => {
    setIsSending(true);

    // Fetch CRM settings to get Telegram bot token and chat ID
    let settings: CRMSettings | null = null;
    try {
      settings = await crmService.getSettings();
    } catch (e) {
      console.error("Error fetching CRM settings:", e);
    }

    const newRequestId = Math.floor(10000 + Math.random() * 90000).toString();

    if (settings && settings.telegramBotToken && settings.telegramChatId) {
      try {
        const customMessage = `🚨 <b>Запрос на восстановление базы данных</b>\n\n` +
          `🔒 <b>Причина:</b> Приложение автоматически отключено по причине отсутствия активных сессий.\n` +
          `🆔 <b>Номер запроса:</b> #${newRequestId}\n` +
          `📅 <b>Дата:</b> ${new Date().toLocaleString("ru-RU", { timeZone: "Europe/Moscow" })} (МСК)`;

        await fetch("/api/test-telegram", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            botToken: settings.telegramBotToken,
            chatId: settings.telegramChatId,
            customMessage
          }),
        });
      } catch (err) {
        console.error("Failed to send telegram notification:", err);
      }
    }

    setRequestId(newRequestId);
    setStage("success");
    setIsSending(false);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          key="blocked-app-overlay"
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Smooth dark background */}
          <div className="absolute inset-0 bg-black/90" />

          <div className="relative z-10 flex flex-col items-center max-w-md w-full px-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl flex flex-col items-center justify-center text-center gap-6 min-h-[300px] w-full"
            >
              {stage === "loading" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  className="flex flex-col items-center justify-center"
                >
                  {/* Custom animated loader */}
                  <div className="relative w-20 h-20">
                    <motion.div
                      className="absolute inset-0 border-4 border-transparent border-t-red-500 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                      className="absolute inset-2 border-4 border-transparent border-r-orange-500 rounded-full"
                      animate={{ rotate: -360 }}
                      transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
                    />
                    <motion.div
                      className="absolute inset-4 border-4 border-transparent border-b-yellow-500 rounded-full"
                      animate={{ rotate: 360 }}
                      transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                    />
                  </div>
                </motion.div>
              )}

              {stage === "message" && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center text-center gap-6 w-full"
                >
                  <h2 className="text-xl font-semibold text-white">Доступ ограничен</h2>

                  <p className="text-white/70 text-sm leading-relaxed">
                    Приложение автоматически отключено по причине отсутствия активных сессий, для восстановления базы данных и доступа отправьте запрос на восстановление
                  </p>

                  <button
                    onClick={handleSendRequest}
                    disabled={isSending}
                    className="mt-2 w-full py-3.5 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all disabled:opacity-50 flex justify-center items-center gap-2"
                  >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <PaperPlane size={18} />}
                    Отправить запрос
                  </button>

                  <button
                    onClick={onClose}
                    className="text-white/40 hover:text-white/80 text-xs transition-colors mt-2"
                  >
                    Закрыть
                  </button>
                </motion.div>
              )}

              {stage === "success" && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex flex-col items-center text-center gap-6 w-full"
                >
                  <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mb-2">
                    <Check size={32} weight="bold" className="text-green-500" />
                  </div>

                  <h2 className="text-xl font-semibold text-white">Запрос отправлен</h2>

                  <div className="bg-black/50 p-4 rounded-2xl w-full border border-white/10">
                    <p className="text-white/70 text-sm">
                      Запрос был отправлен, его номер:
                    </p>
                    <p className="text-2xl font-mono font-bold text-white mt-2">
                      #{requestId}
                    </p>
                  </div>

                  <button
                    onClick={onClose}
                    className="mt-2 w-full py-3.5 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold rounded-xl transition-all"
                  >
                    Закрыть
                  </button>
                </motion.div>
              )}
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

// ─── Main Desktop Page ────────────────────────────────────────────
const DesktopPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [wallpaperLoaded, setWallpaperLoaded] = useState(false);

  const [crmModalOpen, setCrmModalOpen] = useState(false);
  const [tgModalOpen, setTgModalOpen] = useState(false);
  const [washLaunching, setWashLaunching] = useState(false);
  const [blockedModalOpen, setBlockedModalOpen] = useState(false);

  const handleWashClick = () => {
    if (user) {
      setWashLaunching(true);
      setTimeout(() => navigate("/wash"), 600);
    } else {
      navigate("/login");
    }
  };

  const apps = [
    {
      id: "wash",
      label: "Мойка",
      icon: <Waves size={40} weight="fill" className="text-white" />,
      gradient: "from-blue-400 to-blue-600",
      onClick: handleWashClick,
    },
    {
      id: "crm",
      label: "Реклама",
      icon: <Megaphone size={40} weight="fill" className="text-white" />,
      gradient: "from-amber-400 to-amber-600",
      onClick: () => setBlockedModalOpen(true),
    },
    {
      id: "okleyka",
      label: "Оклейка",
      icon: <Palette size={40} weight="fill" className="text-white" />,
      gradient: "from-violet-500 to-purple-700",
      onClick: () => setBlockedModalOpen(true),
    },
    {
      id: "settings",
      label: "Настройки",
      icon: <Gear size={40} weight="fill" className="text-white" />,
      gradient: "from-slate-500 to-slate-700",
      onClick: () => setBlockedModalOpen(true),
    },
  ];

  return (
    <div className="min-h-[100dvh] w-full overflow-hidden relative bg-black select-none">

      {/* ── Mobile video background (< md) ── */}
      <div className="absolute inset-0 z-0 md:hidden">
        <video
          src="/main.mp4"
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
        />
        {/* Subtle dark overlay for readability */}
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* ── Desktop wallpaper background (md+) ── */}
      <div className="absolute inset-0 z-0 hidden md:block">
        <motion.img
          initial={{ opacity: 0 }}
          animate={{ opacity: wallpaperLoaded ? 1 : 0 }}
          transition={{ duration: 1.5, ease: "easeOut" }}
          src="/wallpapers/desktop_bg.webp"
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable="false"
          onLoad={() => setWallpaperLoaded(true)}
        />
        <div className="absolute inset-0 bg-black/20" />
      </div>

      {/* ── Top bar: logo left, clock right ── */}
      <div className="relative z-10 flex items-center justify-between px-6 pt-5 pb-2">
        <div className="flex items-center gap-2.5 pointer-events-none">
          <img
            src="/logo.png"
            alt="Detail Lab"
            className="h-6 w-auto object-contain opacity-70"
            draggable="false"
          />
        </div>
        <ClockWidget />
      </div>

      {/* ── App icons ── */}
      <div className="relative z-10 px-4 sm:px-6 pt-6 sm:pt-8">
        <motion.div
          className="grid grid-cols-4 sm:flex sm:flex-row sm:flex-wrap gap-x-2 gap-y-6 sm:gap-5 justify-items-center"
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
                gradient={app.gradient}
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
      <BlockedAppModal isOpen={blockedModalOpen} onClose={() => setBlockedModalOpen(false)} />
    </div>
  );
};

export default DesktopPage;
