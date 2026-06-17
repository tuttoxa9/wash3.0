import type React from "react";
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useAppContext } from "@/lib/context/AppContext";
import { crmService } from "@/lib/services/crmService";
import type { CRMLead, CRMLeadStatus, CRMHistoryEntry, CRMSettings } from "@/lib/types";
import { 
  LayoutDashboard, 
  Settings, 
  LogOut, 
  Plus, 
  Search, 
  X, 
  User, 
  Phone, 
  Car, 
  Tag, 
  Coins, 
  Wrench, 
  Clock, 
  Calendar as CalendarIcon, 
  History, 
  FileText, 
  AlertCircle, 
  Bell, 
  Check, 
  Copy, 
  RefreshCw,
  ChevronLeft,
  Trash2,
  PhoneCall,
  PhoneOff,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Globe,
  MessageCircle,
  Inbox,
  Sparkles,
  Lock,
  Mail,
  Sun,
  Send
} from "lucide-react";
import { format, subDays, addDays } from "date-fns";
import { ru } from "date-fns/locale";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";

// Константы статусов на русском языке
const STATUS_LABELS: Record<CRMLeadStatus, string> = {
  new: "Новые",
  in_work: "В работе",
  appointment: "Приезд",
  call_back: "Перезвон",
  no_answer: "Недозвон",
  thinking: "Думает",
  won: "Завершен",
  lost: "Отказ"
};

// Цвета для статусов
const STATUS_COLORS: Record<CRMLeadStatus, string> = {
  new: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  in_work: "bg-amber-500/10 text-amber-400 border-amber-500/20",
  appointment: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  call_back: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
  no_answer: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  thinking: "bg-pink-500/10 text-pink-400 border-pink-500/20",
  won: "bg-green-500/10 text-green-400 border-green-500/20",
  lost: "bg-red-500/10 text-red-400 border-red-500/20"
};

// Цветные точки для статусов в таблице
const STATUS_DOT_COLORS: Record<CRMLeadStatus, string> = {
  new: "bg-blue-500",
  in_work: "bg-amber-500",
  appointment: "bg-purple-500",
  call_back: "bg-indigo-500",
  no_answer: "bg-orange-500",
  thinking: "bg-pink-500",
  won: "bg-green-500",
  lost: "bg-red-500"
};

// Иконки для табов
const STATUS_ICONS: Record<CRMLeadStatus | "all", React.ReactNode> = {
  all: <Inbox className="w-4 h-4" />,
  new: <Plus className="w-4 h-4" />,
  in_work: <Wrench className="w-4 h-4" />,
  appointment: <CalendarIcon className="w-4 h-4" />,
  call_back: <PhoneCall className="w-4 h-4" />,
  no_answer: <PhoneOff className="w-4 h-4" />,
  thinking: <HelpCircle className="w-4 h-4" />,
  won: <CheckCircle2 className="w-4 h-4" />,
  lost: <AlertTriangle className="w-4 h-4" />
};

// Цвета для источников рекламы
const SOURCE_COLORS: Record<string, string> = {
  "Instagram": "bg-pink-500/10 text-pink-400 border-pink-500/20",
  "TikTok": "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
  "звонок": "bg-green-500/10 text-green-400 border-green-500/20",
  "сайт": "bg-purple-500/10 text-purple-400 border-purple-500/20",
  "другое": "bg-gray-500/10 text-gray-400 border-gray-500/20"
};

// Обои для рабочего стола CRM
const WALLPAPERS = [
  {
    id: "indigo",
    name: "Индиго абстракт",
    url: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "purple",
    name: "Фиолетовый шелк",
    url: "https://images.unsplash.com/photo-1618005198143-e5283b519a7f?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1618005198143-e5283b519a7f?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "green",
    name: "Изумрудное стекло",
    url: "https://images.unsplash.com/photo-1618005174098-b80c353b1b6d?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1618005174098-b80c353b1b6d?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "orange",
    name: "Оранжевый неон",
    url: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1634017839464-5c339ebe3cb4?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "dark",
    name: "Темный абстракт",
    url: "https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1604871000636-074fa5117945?auto=format&fit=crop&w=200&q=80"
  },
  {
    id: "lavender",
    name: "Лавандовый неон",
    url: "https://images.unsplash.com/photo-1634017851502-c81766a0665f?auto=format&fit=crop&w=1920&q=80",
    thumb: "https://images.unsplash.com/photo-1634017851502-c81766a0665f?auto=format&fit=crop&w=200&q=80"
  }
];

// Функция форматирования белорусских номеров телефонов
const formatBYPhone = (val: string): string => {
  let digits = val.replace(/\D/g, "");

  if (digits.startsWith("80")) {
    digits = "375" + digits.slice(2);
  } else if (digits.length > 0 && !digits.startsWith("3")) {
    if (
      digits.startsWith("29") || 
      digits.startsWith("33") || 
      digits.startsWith("44") || 
      digits.startsWith("25")
    ) {
      digits = "375" + digits;
    }
  }

  // Ограничиваем длину в 12 цифр
  const capped = digits.slice(0, 12);

  if (capped.length === 0) return "";
  if (capped.length <= 3) return `+${capped}`;
  if (capped.length <= 5) return `+${capped.slice(0, 3)} (${capped.slice(3)}`;
  if (capped.length <= 8) return `+${capped.slice(0, 3)} (${capped.slice(3, 5)}) ${capped.slice(5)}`;
  if (capped.length <= 10) return `+${capped.slice(0, 3)} (${capped.slice(3, 5)}) ${capped.slice(5, 8)}-${capped.slice(8)}`;
  return `+${capped.slice(0, 3)} (${capped.slice(3, 5)}) ${capped.slice(5, 8)}-${capped.slice(8, 10)}-${capped.slice(10)}`;
};

// Кастомный компонент Выпадающего Списка (Select)
interface CustomSelectProps<T extends string> {
  value: T;
  onChange: (val: T) => void;
  options: { value: T; label: string }[];
  label?: string;
}


const AnimatedCheckbox = ({ checked, onChange, label }: { checked: boolean, onChange: () => void, label: string }) => {
  return (
    <div 
      onClick={onChange}
      className="flex items-center gap-2 cursor-pointer group select-none"
    >
      <div className={`w-4 h-4 rounded-[4px] flex items-center justify-center border transition-all duration-200 shadow-sm
        ${checked ? 'bg-primary border-primary' : 'bg-card border-border/60 group-hover:border-primary/50'}
      `}>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
        </motion.div>
      </div>
      <span className="text-[11px] text-foreground/80 group-hover:text-foreground transition-colors font-medium">{label}</span>
    </div>
  );
};

function CustomSelect<T extends string>({ value, onChange, options, label }: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'}`}>
      {label && <label className="text-[10px] text-white/60 block mb-1">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-10 px-3 bg-white/[0.04] text-white rounded-xl text-xs flex items-center justify-between focus:outline-none transition-colors"
      >
        <span className="truncate mr-2">{selectedOption?.label || value || "Выберите..."}</span>
        <motion.span 
          animate={{ rotate: isOpen ? 180 : 0 }} 
          className="text-white/40 text-[9px]"
        >
          ▼
        </motion.span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
            <motion.div 
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute left-0 right-0 mt-1.5 bg-black/60 backdrop-blur-2xl border border-white/5 rounded-xl shadow-2xl z-20 py-1 overflow-hidden divide-y divide-white/5"
            >
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between
                    ${opt.value === value 
                      ? "bg-white/10 text-white font-bold" 
                      : "text-white/60 hover:text-white hover:bg-white/[0.05]"}`}
                >
                  <span className="truncate">{opt.label}</span>
                  {opt.value === value && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// Кастомный компонент боковой панели, выезжающей справа
interface RightDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const RightDrawer: React.FC<RightDrawerProps> = ({ isOpen, onClose, title, children }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] md:w-[580px] bg-black/55 backdrop-blur-[32px] border-l border-white/5 text-white shadow-2xl z-[100] flex flex-col h-full overflow-hidden"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-white/5 shrink-0">
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.12] text-white/60 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar">
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

const CrmPage: React.FC = () => {
  const { user, login, logout, loading: authLoading } = useAuth();
  const { state: appState, dispatch } = useAppContext(); 

  // Auth gate states
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");
  const [viewMode, setViewMode] = useState<"gate" | "crm" | "settings">("gate");
  const [mobileViewLevel, setMobileViewLevel] = useState<"statuses" | "leads">("statuses");

  // Refs for seamless mobile background video cross-fading
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const isFirstPlay = useRef(true);

  const handleTimeUpdateA = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoA = e.currentTarget;
    const videoB = videoBRef.current;
    if (!videoB) return;
    
    const duration = videoA.duration;
    const currentTime = videoA.currentTime;
    if (!duration) return;
    
    const crossFadeDuration = 1.5;
    const maxOpacity = 0.25;
    
    // First time load: fade in from 0
    if (isFirstPlay.current && currentTime < 1.0) {
      videoA.style.opacity = ((currentTime / 1.0) * maxOpacity).toString();
      return;
    } else if (isFirstPlay.current && currentTime >= 1.0) {
      isFirstPlay.current = false;
      videoA.style.opacity = maxOpacity.toString();
    }
    
    // Near the end of video A: start playing B and cross-fade
    if (currentTime > duration - crossFadeDuration) {
      if (videoB.paused) {
        videoB.currentTime = 0;
        videoB.play().catch(() => {});
      }
      const progress = (currentTime - (duration - crossFadeDuration)) / crossFadeDuration;
      videoA.style.opacity = (maxOpacity * (1 - progress)).toString();
      videoB.style.opacity = (maxOpacity * progress).toString();
    }
  };

  const handleEndedA = () => {
    const videoA = videoARef.current;
    const videoB = videoBRef.current;
    if (!videoA || !videoB) return;
    
    videoA.pause();
    videoA.currentTime = 0;
    videoA.style.opacity = "0";
    videoB.style.opacity = "0.25";
  };

  const handleTimeUpdateB = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoB = e.currentTarget;
    const videoA = videoARef.current;
    if (!videoA) return;
    
    const duration = videoB.duration;
    const currentTime = videoB.currentTime;
    if (!duration) return;
    
    const crossFadeDuration = 1.5;
    const maxOpacity = 0.25;
    
    // Near the end of video B: start playing A and cross-fade
    if (currentTime > duration - crossFadeDuration) {
      if (videoA.paused) {
        videoA.currentTime = 0;
        videoA.play().catch(() => {});
      }
      const progress = (currentTime - (duration - crossFadeDuration)) / crossFadeDuration;
      videoB.style.opacity = (maxOpacity * (1 - progress)).toString();
      videoA.style.opacity = (maxOpacity * progress).toString();
    }
  };

  const handleEndedB = () => {
    const videoB = videoBRef.current;
    const videoA = videoARef.current;
    if (!videoB || !videoA) return;
    
    videoB.pause();
    videoB.currentTime = 0;
    videoB.style.opacity = "0";
    videoA.style.opacity = "0.25";
  };

  // CRM Workspace states
  const [leads, setLeads] = useState<CRMLead[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [activeTab, setActiveTab] = useState<CRMLeadStatus | "all">("new");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedWallpaper, setSelectedWallpaper] = useState(() => {
    return localStorage.getItem("crm_wallpaper") || WALLPAPERS[0].url;
  });

  const handleSelectWallpaper = (url: string) => {
    setSelectedWallpaper(url);
    localStorage.setItem("crm_wallpaper", url);
  };

  // Modals states
  const [isAddDrawerOpen, setIsAddDrawerOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<CRMLead | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Settings states
  const [crmSettings, setCrmSettings] = useState<CRMSettings>({
    telegramBotToken: "",
    telegramChatId: "",
    telegramEnabled: false,
    webhookApiKey: ""
  });
  const [savingSettings, setSavingSettings] = useState(false);
  const [isApiKeyCopied, setIsApiKeyCopied] = useState(false);
  const [isTestingTelegram, setIsTestingTelegram] = useState(false);

  // Форма добавления нового лида (без плейсхолдеров)
  const [newLeadForm, setNewLeadForm] = useState({
    name: "",
    phone: "",
    car: "",
    source: "звонок",
    service: "",
    price: 0,
    status: "new" as CRMLeadStatus,
    notes: ""
  });

  // Загрузка данных при входе в CRM или настройки
  useEffect(() => {
    if (user) {
      loadLeads();
      loadSettings();
    }
  }, [user]);

  const loadLeads = async () => {
    setLoadingLeads(true);
    const data = await crmService.getAllLeads();
    setLeads(data);
    setLoadingLeads(false);
  };

  const loadSettings = async () => {
    const data = await crmService.getSettings();
    if (data) {
      setCrmSettings(data);
    } else {
      const initialSettings: CRMSettings = {
        telegramBotToken: "",
        telegramChatId: "",
        telegramEnabled: false,
        webhookApiKey: crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).substring(2, 18)
      };
      setCrmSettings(initialSettings);
      await crmService.saveSettings(initialSettings);
    }
  };

  // Обработка логина
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError("");
    try {
      const { error } = await login({ email, password });
      if (error) throw error;
      toast.success("Успешный вход!");
    } catch (err: any) {
      setLoginError("Неверный email или пароль.");
      toast.error("Ошибка авторизации");
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await logout();
      setViewMode("gate");
      setEmail("");
      setPassword("");
      toast.success("Вы вышли из аккаунта");
    } catch (err) {
      console.error(err);
    }
  };

  // Обработка настроек
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingSettings(true);
    const success = await crmService.saveSettings(crmSettings);
    setSavingSettings(false);
    if (success) {
      toast.success("Настройки CRM сохранены");
      setViewMode("gate");
    } else {
      toast.error("Не удалось сохранить настройки");
    }
  };

  const regenerateWebhookKey = () => {
    const newKey = crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).substring(2, 18);
    setCrmSettings(prev => ({ ...prev, webhookApiKey: newKey }));
    toast.info("Сгенерирован новый API ключ. Сохраните форму!");
  };

  const copyWebhookUrl = () => {
    const url = `${window.location.origin}/api/leads-webhook?api_key=${crmSettings.webhookApiKey}`;
    navigator.clipboard.writeText(url);
    setIsApiKeyCopied(true);
    toast.success("Webhook URL скопирован");
    setTimeout(() => setIsApiKeyCopied(false), 2000);
  };

  const handleTestTelegramBot = async () => {
    if (!crmSettings.telegramBotToken.trim() || !crmSettings.telegramChatId.trim()) {
      toast.error("Заполните токен бота и ID чата");
      return;
    }

    setIsTestingTelegram(true);
    try {
      const message = 
        `🔔 <b>Тестовое сообщение CRM</b>\n\n` +
        `✅ Telegram-бот успешно настроен и подключен!\n` +
        `📅 Время проверки: ${format(new Date(), "HH:mm:ss dd.MM.yyyy")}`;

      const res = await fetch(`https://api.telegram.org/bot${crmSettings.telegramBotToken}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: crmSettings.telegramChatId,
          text: message,
          parse_mode: "HTML"
        })
      });

      const data = await res.json();

      if (res.ok && data.ok) {
        toast.success("Тестовое сообщение успешно отправлено!");
      } else {
        console.error("Telegram error:", data);
        toast.error(`Ошибка Telegram: ${data.description || "неизвестная ошибка"}`);
      }
    } catch (err: any) {
      console.error("Test Telegram bot error:", err);
      toast.error("Ошибка при отправке: проверьте подключение к сети");
    } finally {
      setIsTestingTelegram(false);
    }
  };

  // Создание лида вручную
  const handleAddLeadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLeadForm.name.trim() || !newLeadForm.phone.trim()) {
      toast.error("Имя и телефон обязательны");
      return;
    }

    const newHistoryEntry: CRMHistoryEntry = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
      type: "creation",
      text: `Лид создан вручную. Статус: ${STATUS_LABELS[newLeadForm.status]}`,
      createdAt: new Date().toISOString()
    };

    if (newLeadForm.notes.trim()) {
      newHistoryEntry.text += `. Комментарий: "${newLeadForm.notes.trim()}"`;
    }

    const payload = {
      name: newLeadForm.name.trim(),
      phone: newLeadForm.phone.trim(),
      car: newLeadForm.car.trim() || undefined,
      status: newLeadForm.status,
      source: newLeadForm.source,
      service: newLeadForm.service || undefined,
      price: Number(newLeadForm.price || 0),
      notes: newLeadForm.notes.trim() || undefined,
      notifyBefore: [],
      history: [newHistoryEntry]
    };

    const newLead = await crmService.addLead(payload);
    if (newLead) {
      toast.success("Лид успешно добавлен");
      setIsAddDrawerOpen(false);
      setNewLeadForm({
        name: "",
        phone: "",
        car: "",
        source: "звонок",
        service: "",
        price: 0,
        status: "new",
        notes: ""
      });
      loadLeads();
    } else {
      toast.error("Ошибка при создании лида");
    }
  };

  // Удаление лида
  const handleDeleteLead = async (id: string) => {
    if (!confirm("Вы действительно хотите удалить этого лида?")) return;
    const success = await crmService.deleteLead(id);
    if (success) {
      toast.success("Лид удален");
      setIsDetailOpen(false);
      setSelectedLead(null);
      loadLeads();
    } else {
      toast.error("Ошибка при удалении лида");
    }
  };

  // Подготовка деталей лида к редактированию
  const [detailForm, setDetailForm] = useState<CRMLead | null>(null);
  const [newNoteText, setNewNoteText] = useState("");
  const [nextStepDateInput, setNextStepDateInput] = useState("");
  const [nextStepTimeInput, setNextStepTimeInput] = useState("");

  useEffect(() => {
    if (selectedLead) {
      setDetailForm({ ...selectedLead });
      setNewNoteText("");
      
      if (selectedLead.nextStepDate) {
        const d = new Date(selectedLead.nextStepDate);
        setNextStepDateInput(format(d, "yyyy-MM-dd"));
        setNextStepTimeInput(format(d, "HH:mm"));
      } else {
        setNextStepDateInput("");
        setNextStepTimeInput("");
      }
    } else {
      setDetailForm(null);
    }
  }, [selectedLead]);

  // Сохранение отредактированного лида
  const handleUpdateLead = async () => {
    if (!detailForm || !selectedLead) return;
    if (!detailForm.name.trim() || !detailForm.phone.trim()) {
      toast.error("Имя и телефон обязательны");
      return;
    }

    const updatedHistory = [...detailForm.history];
    const userAuthor = user?.email || "Менеджер";

    // Обязательное указание следующего шага
    if (detailForm.status !== "won" && detailForm.status !== "lost") {
      if (!nextStepDateInput || !nextStepTimeInput) {
        toast.error("Необходимо указать дату и время следующего шага");
        return;
      }
    }
    
    // Отслеживаем изменения полей
    if (detailForm.status !== selectedLead.status) {
      updatedHistory.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        type: "status",
        text: `Статус изменен: ${STATUS_LABELS[selectedLead.status]} ➔ ${STATUS_LABELS[detailForm.status]}`,
        createdAt: new Date().toISOString(),
        author: userAuthor,
        fromValue: selectedLead.status,
        toValue: detailForm.status
      });
    }

    if (detailForm.price !== selectedLead.price) {
      updatedHistory.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        type: "price",
        text: `Стоимость изменена: ${selectedLead.price} руб. ➔ ${detailForm.price} руб.`,
        createdAt: new Date().toISOString(),
        author: userAuthor,
        fromValue: String(selectedLead.price),
        toValue: String(detailForm.price)
      });
    }

    if (detailForm.service !== selectedLead.service) {
      updatedHistory.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        type: "service",
        text: `Услуга изменена: "${selectedLead.service || "Нет"}" ➔ "${detailForm.service || "Нет"}"`,
        createdAt: new Date().toISOString(),
        author: userAuthor,
        fromValue: selectedLead.service,
        toValue: detailForm.service
      });
    }

    // Обработка даты/времени следующего шага
    let combinedNextStepDate = undefined;
    if (nextStepDateInput) {
      const timePart = nextStepTimeInput || "12:00";
      combinedNextStepDate = new Date(`${nextStepDateInput}T${timePart}:00`).toISOString();
    }

    if (combinedNextStepDate !== selectedLead.nextStepDate) {
      const fromStr = selectedLead.nextStepDate 
        ? format(new Date(selectedLead.nextStepDate), "dd.MM.yyyy HH:mm")
        : "Не запланировано";
      const toStr = combinedNextStepDate 
        ? format(new Date(combinedNextStepDate), "dd.MM.yyyy HH:mm")
        : "Снято планирование";

      updatedHistory.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        type: "other",
        text: `Запланирован следующий шаг: с "${fromStr}" на "${toStr}"`,
        createdAt: new Date().toISOString(),
        author: userAuthor
      });
    }

    const finalLead: CRMLead = {
      ...detailForm,
      nextStepDate: combinedNextStepDate,
      history: updatedHistory,
      sentNotifications: combinedNextStepDate !== selectedLead.nextStepDate ? [] : detailForm.sentNotifications
    };

    const success = await crmService.updateLead(finalLead);
    if (success) {
      toast.success("Лид успешно обновлен");
      setSelectedLead(finalLead);
      loadLeads();
    } else {
      toast.error("Не удалось обновить лида");
    }
  };

  // Добавление текстовой заметки в историю лида
  const handleAddNoteToHistory = async () => {
    if (!detailForm || !newNoteText.trim()) return;
    const userAuthor = user?.email || "Менеджер";

    const newNoteId = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11);
    const newNoteHistory: CRMHistoryEntry = {
      id: newNoteId,
      type: "note",
      text: newNoteText.trim(),
      createdAt: new Date().toISOString(),
      author: userAuthor
    };

    const finalLead: CRMLead = {
      ...detailForm,
      notes: newNoteText.trim(),
      history: [...detailForm.history, newNoteHistory]
    };

    const success = await crmService.updateLead(finalLead);
    if (success) {
      toast.success("Заметка сохранена");
      setDetailForm(finalLead);
      setSelectedLead(finalLead);
      setNewNoteText("");
      loadLeads();
    } else {
      toast.error("Ошибка при сохранении заметки");
    }
  };

  // Переключение тумблера напоминаний в форме деталей
  const handleToggleNotifyBefore = (minutes: number) => {
    if (!detailForm) return;
    const currentList = detailForm.notifyBefore || [];
    let newList = [];
    if (currentList.includes(minutes)) {
      newList = currentList.filter(m => m !== minutes);
    } else {
      newList = [...currentList, minutes];
    }
    setDetailForm(prev => prev ? ({ ...prev, notifyBefore: newList }) : null);
  };

  // Фильтрация и группировка лидов
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(now, 1), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(now, 1), "yyyy-MM-dd");

  const filteredLeads = leads.filter(lead => {
    if (activeTab !== "all" && lead.status !== activeTab) return false;

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      const nameMatch = lead.name.toLowerCase().includes(q);
      const phoneMatch = lead.phone.replace(/[^0-9]/g, "").includes(q.replace(/[^0-9]/g, ""));
      const carMatch = (lead.car || "").toLowerCase().includes(q);
      const serviceMatch = (lead.service || "").toLowerCase().includes(q);
      return nameMatch || phoneMatch || carMatch || serviceMatch;
    }

    return true;
  });

  // Группировка
  const groups: Record<string, CRMLead[]> = {};
  for (const lead of filteredLeads) {
    const activeDateStr = lead.nextStepDate 
      ? lead.nextStepDate.slice(0, 10) 
      : lead.createdAt.slice(0, 10);
    
    if (!groups[activeDateStr]) {
      groups[activeDateStr] = [];
    }
    groups[activeDateStr].push(lead);
  }

  // Сортировка внутри групп по времени
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => {
      const timeA = a.nextStepDate ? a.nextStepDate.slice(11, 16) : a.createdAt.slice(11, 16);
      const timeB = b.nextStepDate ? b.nextStepDate.slice(11, 16) : b.createdAt.slice(11, 16);
      return timeA.localeCompare(timeB);
    });
  }

  // Сортировка ключей групп (Будущие по возрастанию, Прошедшие/Сегодня по убыванию)
  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    const isFutureA = a > todayStr;
    const isFutureB = b > todayStr;
    
    if (isFutureA && !isFutureB) return -1;
    if (!isFutureA && isFutureB) return 1;
    
    if (isFutureA && isFutureB) {
      return a.localeCompare(b); 
    } else {
      return b.localeCompare(a); 
    }
  });

  const getGroupTitleColor = (key: string) => {
    if (key === todayStr) return "text-blue-500 dark:text-blue-400";
    if (key === yesterdayStr) return "text-muted-foreground";
    if (key === tomorrowStr) return "text-amber-500 dark:text-amber-400";
    if (key < todayStr) return "text-destructive";
    return "text-purple-500 dark:text-purple-400";
  };

  const getGroupTitleFormatted = (key: string) => {
    const count = groups[key]?.length || 0;
    let baseTitle = "";

    if (key === todayStr) baseTitle = "СЕГОДНЯ";
    else if (key === yesterdayStr) baseTitle = "ВЧЕРА";
    else if (key === tomorrowStr) baseTitle = "ЗАВТРА";
    else {
      const d = new Date(key);
      baseTitle = format(d, "d MMMM yyyy", { locale: ru }).toUpperCase();
    }

    return `${baseTitle}  ${count}`;
  };

  const getSourceIcon = (source: string) => {
    const src = source.toLowerCase();
    if (src.includes("instagram") || src.includes("insta")) {
      return (
        <span title="Instagram">
          <svg className="w-4 h-4 text-pink-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
            <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
            <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
          </svg>
        </span>
      );
    }
    if (src.includes("tiktok") || src.includes("tt")) {
      return (
        <span title="TikTok">
          <svg className="w-4 h-4 text-foreground" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/>
          </svg>
        </span>
      );
    }
    if (src.includes("звонок") || src.includes("call") || src.includes("phone")) {
      return <span title="Звонок"><Phone className="w-4 h-4 text-green-400" /></span>;
    }
    if (src.includes("сайт") || src.includes("web") || src.includes("site")) {
      return <span title="Сайт"><Globe className="w-4 h-4 text-purple-400" /></span>;
    }
    return <span title={source}><User className="w-4 h-4 text-muted-foreground/80" /></span>;
  };

  const getTabCount = (status: CRMLeadStatus | "all") => {
    if (status === "all") return leads.length;
    return leads.filter(l => l.status === status).length;
  };

  // --- RENDERING ---

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-7 h-7 text-foreground animate-spin" />
          <span className="text-muted-foreground/80 text-xs tracking-wider">Инициализация CRM...</span>
        </div>
      </div>
    );
  }

  // 1. GATE VIEW (Входная карточка)
  if (viewMode === "gate") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background video A for mobile only */}
        <video
          ref={videoARef}
          src="/main.mp4"
          autoPlay
          muted
          playsInline
          onTimeUpdate={handleTimeUpdateA}
          onEnded={handleEndedA}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 block md:hidden transition-opacity duration-300"
          style={{ opacity: 0 }}
        />

        {/* Background video B for mobile only */}
        <video
          ref={videoBRef}
          src="/main.mp4"
          muted
          playsInline
          onTimeUpdate={handleTimeUpdateB}
          onEnded={handleEndedB}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 block md:hidden transition-opacity duration-300"
          style={{ opacity: 0 }}
        />
        
        {/* Dark overlay for mobile video background */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none z-[1] block md:hidden" />

        <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 black:bg-blue-500/15 blur-[60px] rounded-full scale-[1.2] z-[-1] pointer-events-none"></div>
        
        <div className="w-full max-w-[280px] bg-white/[0.03] dark:bg-black/25 backdrop-blur-[32px] rounded-3xl p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative z-10 border-0 text-white flex flex-col gap-4">
          
          <div className="text-center">
            <h1 className="text-base font-bold tracking-tight text-white/90">Detail Lab CRM</h1>
            <p className="text-[9px] text-white/40 mt-1">Авторизация</p>
          </div>

          {!user ? (
            <form onSubmit={handleLoginSubmit} className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="Email"
                className="w-full px-3.5 py-2 bg-white/[0.04] dark:bg-black/35 backdrop-blur-[12px] rounded-2xl text-white placeholder-white/20 text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all border-0"
              />

              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Пароль"
                className="w-full px-3.5 py-2 bg-white/[0.04] dark:bg-black/35 backdrop-blur-[12px] rounded-2xl text-white placeholder-white/20 text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all border-0"
              />

              {loginError && (
                <div className="text-red-350 text-[10px] text-center bg-red-950/20 py-2 px-3 rounded-2xl border-0">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full py-2 mt-1 bg-white/[0.14] hover:bg-white/[0.22] active:bg-white/[0.28] active:scale-[0.97] backdrop-blur-[8px] transition-all text-xs font-bold rounded-2xl text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_4px_15px_rgba(0,0,0,0.2)] border-0"
              >
                {loginLoading ? "Авторизация..." : "Войти в систему"}
              </button>
            </form>
          ) : (
            <div className="space-y-3.5">
              <div className="text-center bg-white/[0.04] dark:bg-black/35 backdrop-blur-[12px] p-3.5 rounded-2xl border-0">
                <h3 className="text-xs font-semibold text-white/95">Сессия активна</h3>
                <span className="text-[9px] text-white/50 block truncate mt-0.5">{user.email}</span>
              </div>

              <div className="flex flex-col gap-2">
                <button
                  onClick={() => setViewMode("crm")}
                  className="w-full py-2 bg-white/[0.14] hover:bg-white/[0.22] active:bg-white/[0.28] active:scale-[0.97] backdrop-blur-[8px] transition-all text-xs font-bold rounded-2xl text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_4px_15px_rgba(0,0,0,0.2)] border-0 flex items-center justify-center gap-1.5"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-white/90" />
                  <span>Войти в CRM</span>
                </button>

                <button
                  onClick={() => setViewMode("settings")}
                  className="w-full py-2 bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.1] active:scale-[0.97] backdrop-blur-[4px] transition-all text-xs font-bold rounded-2xl text-white/80 border-0 flex items-center justify-center gap-1.5"
                >
                  <Settings className="w-3.5 h-3.5 text-white/80" />
                  <span>Настройки</span>
                </button>

                <div className="h-[1px] bg-white/10 my-0.5"></div>

                <button
                  onClick={handleLogoutClick}
                  className="w-full py-2 bg-red-500/[0.08] hover:bg-red-500/[0.16] active:bg-red-500/[0.22] active:scale-[0.97] backdrop-blur-[6px] transition-all text-xs font-bold rounded-2xl text-red-300 border-0 flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Выйти</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 2. SETTINGS VIEW (Настройки CRM)
  if (viewMode === "settings") {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background video A for mobile only */}
        <video
          ref={videoARef}
          src="/main.mp4"
          autoPlay
          muted
          playsInline
          onTimeUpdate={handleTimeUpdateA}
          onEnded={handleEndedA}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 block md:hidden transition-opacity duration-300"
          style={{ opacity: 0 }}
        />

        {/* Background video B for mobile only */}
        <video
          ref={videoBRef}
          src="/main.mp4"
          muted
          playsInline
          onTimeUpdate={handleTimeUpdateB}
          onEnded={handleEndedB}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 block md:hidden transition-opacity duration-300"
          style={{ opacity: 0 }}
        />
        
        {/* Dark overlay for mobile video background */}
        <div className="absolute inset-0 bg-black/30 pointer-events-none z-[1] block md:hidden" />

        <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 black:bg-blue-500/15 blur-[60px] rounded-full scale-[1.2] z-[-1] pointer-events-none"></div>

        <div className="w-full max-w-[280px] bg-white/[0.03] dark:bg-black/25 backdrop-blur-[32px] rounded-3xl p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative z-10 border-0 text-white">
          
          <div className="flex items-center gap-2 mb-3.5">
            <button
              onClick={() => setViewMode("gate")}
              className="p-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] active:bg-white/[0.16] active:scale-[0.95] text-white/80 transition-all border-0"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xs font-bold text-white/95 uppercase tracking-wider">Настройки</h1>
          </div>

          <form onSubmit={handleSaveSettings} className="space-y-3">
            
            {/* Выбор Темы оформления */}
            <div className="p-3 bg-white/[0.04] dark:bg-black/35 backdrop-blur-[12px] rounded-2xl space-y-2 border-0">
              <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider block">
                Тема интерфейса
              </span>
              <div className="flex gap-2">
                {(["light", "dark", "black"] as const).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => dispatch({ type: "SET_THEME", payload: t })}
                    className={`flex-1 py-1 rounded-xl text-[10px] font-semibold border-0 transition-all
                      ${appState.theme === t
                        ? "bg-white/15 text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                        : "bg-white/[0.04] text-white/50 hover:text-white"}`}
                  >
                    {t === "light" ? "Светлая" : t === "dark" ? "Темная" : "Черная"}
                  </button>
                ))}
              </div>
            </div>

            {/* Выбор Обоев */}
            <div className="p-3 bg-white/[0.04] dark:bg-black/35 backdrop-blur-[12px] rounded-2xl space-y-2 border-0">
              <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider block">
                Обои рабочего стола
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {WALLPAPERS.map(wp => (
                  <button
                    key={wp.id}
                    type="button"
                    onClick={() => handleSelectWallpaper(wp.url)}
                    className={`relative aspect-video rounded-lg overflow-hidden border-0 transition-all active:scale-[0.95]
                      ${selectedWallpaper === wp.url ? "ring-2 ring-white/80" : "opacity-60 hover:opacity-100"}`}
                    title={wp.name}
                  >
                    <img src={wp.thumb} alt={wp.name} className="w-full h-full object-cover pointer-events-none" />
                  </button>
                ))}
              </div>
            </div>

            {/* Telegram */}
            <div className="p-3 bg-white/[0.04] dark:bg-black/35 backdrop-blur-[12px] rounded-2xl space-y-2 border-0">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider block">
                  Telegram оповещения
                </span>
                
                {/* Компактный свитчер без иконок */}
                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={crmSettings.telegramEnabled}
                    onChange={() => setCrmSettings(prev => ({ ...prev, telegramEnabled: !prev.telegramEnabled }))}
                    className="hidden peer"
                  />
                  <div className="w-9 h-5 bg-white/[0.08] dark:bg-black/40 peer-checked:bg-white/[0.22] backdrop-blur-[8px] rounded-full transition-colors duration-300 relative shadow-[inset_0_1px_2px_rgba(0,0,0,0.25)] border-0">
                    <div className={`absolute top-0.5 left-0.5 w-3.5 h-3.5 rounded-full bg-white transition-transform duration-300 shadow-[0_2px_5px_rgba(0,0,0,0.35)] ${
                      crmSettings.telegramEnabled ? "translate-x-[18px]" : "translate-x-0"
                    }`} />
                  </div>
                </label>
              </div>

              <AnimatePresence initial={false}>
                {crmSettings.telegramEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                    className="overflow-hidden space-y-2 pt-0.5"
                  >
                    <div>
                      <label className="text-[9px] text-white/50 block mb-0.5">Токен бота</label>
                      <input
                        type="text"
                        value={crmSettings.telegramBotToken}
                        onChange={(e) => setCrmSettings(prev => ({ ...prev, telegramBotToken: e.target.value }))}
                        required={crmSettings.telegramEnabled}
                        className="w-full px-2.5 py-1.5 bg-white/[0.04] dark:bg-black/25 backdrop-blur-[10px] rounded-xl text-white placeholder-white/20 text-[10px] focus:outline-none focus:ring-1 focus:ring-white/10 transition-all border-0"
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-white/50 block mb-0.5">ID чата / группы</label>
                      <input
                        type="text"
                        value={crmSettings.telegramChatId}
                        onChange={(e) => setCrmSettings(prev => ({ ...prev, telegramChatId: e.target.value }))}
                        required={crmSettings.telegramEnabled}
                        className="w-full px-2.5 py-1.5 bg-white/[0.04] dark:bg-black/25 backdrop-blur-[10px] rounded-xl text-white placeholder-white/20 text-[10px] focus:outline-none focus:ring-1 focus:ring-white/10 transition-all border-0"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleTestTelegramBot}
                      disabled={isTestingTelegram || !crmSettings.telegramBotToken.trim() || !crmSettings.telegramChatId.trim()}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-white/[0.12] hover:bg-white/[0.2] active:bg-white/[0.26] active:scale-[0.98] transition-all text-[10px] font-semibold rounded-xl border-0 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.1)] text-white"
                    >
                      {isTestingTelegram ? (
                        <>
                          <RefreshCw className="w-3 animate-spin text-white/60" />
                          <span>Отправка...</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3 text-sky-400" />
                          <span>Проверить подключение</span>
                        </>
                      )}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Webhook */}
            <div className="p-3 bg-white/[0.04] dark:bg-black/35 backdrop-blur-[12px] rounded-2xl space-y-2 border-0">
              <span className="text-[9px] font-bold text-white/70 uppercase tracking-wider block">
                Make / Zapier Webhook
              </span>

              <div className="space-y-1.5">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="text-[9px] text-white/50 block mb-0.5">API ключ безопасности</label>
                    <input
                      type="text"
                      readOnly
                      value={crmSettings.webhookApiKey}
                      className="w-full px-2.5 py-1.5 bg-white/[0.04] dark:bg-black/25 backdrop-blur-[10px] rounded-xl text-white/70 text-[10px] select-all focus:outline-none border-0"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={regenerateWebhookKey}
                    className="h-[28px] w-[28px] self-end rounded-xl bg-white/[0.06] hover:bg-white/[0.14] active:bg-white/[0.2] active:scale-[0.97] backdrop-blur-[6px] border-0 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                    title="Обновить ключ"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </button>
                </div>

                <div>
                  <label className="text-[9px] text-white/50 block mb-0.5">Адрес вебхука</label>
                  <div className="flex items-center gap-2 bg-white/[0.04] dark:bg-black/25 backdrop-blur-[10px] rounded-xl px-2.5 py-1.5 overflow-hidden border-0">
                    <span className="text-white/70 text-[9px] select-all truncate flex-1 font-mono">
                      {window.location.origin}/api/leads-webhook?api_key={crmSettings.webhookApiKey}
                    </span>
                    <button
                      type="button"
                      onClick={copyWebhookUrl}
                      className="text-white/60 hover:text-white transition-colors"
                    >
                      {isApiKeyCopied ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setViewMode("gate")}
                className="flex-1 py-1.5 bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] active:scale-[0.97] backdrop-blur-[4px] rounded-xl text-white/70 hover:text-white text-[10px] font-semibold border-0"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={savingSettings}
                className="flex-1 py-1.5 bg-white/[0.14] hover:bg-white/[0.22] active:bg-white/[0.28] active:scale-[0.97] backdrop-blur-[8px] rounded-xl text-white text-[10px] font-semibold border-0 flex items-center justify-center gap-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]"
              >
                {savingSettings && <RefreshCw className="w-3 h-3 animate-spin" />}
                <span>Сохранить</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // 3. CRM WORKSPACE (Основной экран)
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col font-sans">
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[260px_1fr] min-h-0 h-full">
        
        {/* ЛЕВАЯ КОЛОНКА */}
        <aside className="hidden md:flex flex-col gap-6 bg-background border-r border-border/40 p-6 shrink-0 h-screen sticky top-0 overflow-y-auto">
          {/* Кнопка "Добавить лида" */}
          <button
            onClick={() => setIsAddDrawerOpen(true)}
            className="w-full h-11 bg-card text-foreground border border-border rounded-full hover:bg-muted hover:border-primary/50 active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs font-semibold shadow-sm"
          >
            <Plus className="w-4 h-4 text-foreground" />
            <span>Добавить лида</span>
          </button>

          {/* Фильтры */}
          <div className="space-y-2.5">
            <span className="text-[10px] font-bold text-muted-foreground/80 tracking-widest uppercase block px-3">
              Фильтры
            </span>

            <nav className="flex flex-col gap-1">
              <button
                onClick={() => setActiveTab("all")}
                className={`w-full h-10 px-3 rounded-xl text-xs font-medium flex items-center justify-between transition-colors
                  ${activeTab === "all"
                    ? "bg-muted text-foreground font-bold"
                    : "text-muted-foreground hover:text-foreground/90 hover:bg-muted/50"}`}
              >
                <div className="flex items-center gap-2.5">
                  {STATUS_ICONS["all"]}
                  <span>Вся база</span>
                </div>
                <span className="text-[10px] text-muted-foreground/80 font-bold bg-card border border-border/40 px-2 py-0.5 rounded-full">
                  {getTabCount("all")}
                </span>
              </button>

              {(["new", "in_work", "appointment", "call_back", "no_answer", "thinking", "won", "lost"] as const).map(tab => {
                const isActive = activeTab === tab;
                const count = getTabCount(tab);
                const label = STATUS_LABELS[tab];

                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`w-full h-10 px-3 rounded-xl text-xs font-medium flex items-center justify-between transition-colors
                      ${isActive
                        ? "bg-muted text-foreground font-bold"
                        : "text-muted-foreground hover:text-foreground/90 hover:bg-muted/50"}`}
                  >
                    <div className="flex items-center gap-2.5">
                      {STATUS_ICONS[tab]}
                      <span>{label}</span>
                    </div>
                    {count > 0 && (
                      <span className="text-[10px] text-muted-foreground/80 font-bold bg-card border border-border/40 px-2 py-0.5 rounded-full">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="mt-auto pt-6 border-t border-border/40 flex flex-col gap-2">
            <button
              onClick={() => setViewMode("gate")}
              className="w-full h-9 px-3 rounded-xl text-muted-foreground/80 hover:text-foreground/80 hover:bg-muted/20 transition-all text-xs font-semibold flex items-center gap-2.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Главный экран CRM</span>
            </button>
          </div>
        </aside>

        {/* ПРАВАЯ КОЛОНКА */}
        <main className="flex-1 flex flex-col min-w-0 bg-transparent h-screen overflow-hidden">
          
          {/* МОБИЛЬНОЕ МЕНЮ СТАТУСОВ (Показывается только если mobileViewLevel === "statuses") */}
          <div className={`md:hidden flex-1 flex-col ${mobileViewLevel === "statuses" ? "flex" : "hidden"} bg-transparent h-full overflow-y-auto custom-scrollbar`}>
            <div className="flex items-center justify-between px-5 pt-6 pb-4 shrink-0">
              <h1 className="text-xl font-bold text-white tracking-tight">CRM Клиенты</h1>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setIsAddDrawerOpen(true)}
                  className="h-10 px-4 bg-white text-black font-semibold rounded-xl flex items-center justify-center active:scale-95 transition-transform shadow-md text-sm gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Лид
                </button>
                <button
                  onClick={() => setViewMode("gate")}
                  className="h-10 w-10 bg-white/[0.04] text-white rounded-xl flex items-center justify-center active:scale-95 transition-transform border-0 hover:bg-white/[0.08]"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-5 pb-6 space-y-4">
              <div className="space-y-2.5">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase px-1">Основные</h3>
                <div className="flex flex-col gap-2">
                  {(["all", "new", "in_work", "appointment", "call_back", "no_answer", "thinking"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setMobileViewLevel("leads"); }}
                      className="w-full p-3.5 bg-white/[0.04] rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all shadow-sm border-0 group"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${tab === 'new' ? 'bg-blue-500 text-white' : 'bg-white/[0.08] text-white'}`}>
                          {STATUS_ICONS[tab]}
                        </div>
                        <span className="text-sm font-bold text-white">{tab === "all" ? "Все лиды" : STATUS_LABELS[tab]}</span>
                      </div>
                      <span className="text-sm font-black text-white/60 bg-white/[0.08] px-3 py-1 rounded-full group-hover:bg-white/[0.14] transition-colors">
                        {getTabCount(tab)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <h3 className="text-[10px] font-bold text-white/40 tracking-widest uppercase px-1">Завершенные</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setActiveTab("won"); setMobileViewLevel("leads"); }}
                    className="p-3.5 bg-white/[0.04] rounded-2xl flex items-center gap-3 active:scale-[0.98] border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                      {STATUS_ICONS["won"]}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-white/40 uppercase truncate">{STATUS_LABELS["won"]}</div>
                      <div className="text-sm font-black text-white">{getTabCount("won")}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setActiveTab("lost"); setMobileViewLevel("leads"); }}
                    className="p-3.5 bg-white/[0.04] rounded-2xl flex items-center gap-3 active:scale-[0.98] border-0"
                  >
                    <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                      {STATUS_ICONS["lost"]}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className="text-[10px] font-bold text-white/40 uppercase truncate">{STATUS_LABELS["lost"]}</div>
                      <div className="text-sm font-black text-white">{getTabCount("lost")}</div>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* СПИСОК ЛИДОВ (Показывается всегда на Desktop, а на Mobile только если mobileViewLevel === "leads") */}
          <div className={`flex-1 flex-col min-w-0 bg-transparent h-full ${mobileViewLevel === "leads" ? "flex" : "hidden md:flex"}`}>
            
            {/* Шапка для мобильных (внутри списка лидов) */}
            <div className="md:hidden flex flex-col gap-3 px-4 pt-4 pb-2 border-b border-white/5 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setMobileViewLevel("statuses")}
                    className="p-2 -ml-2 text-white/60 hover:text-white active:scale-95 transition-all rounded-full hover:bg-white/[0.08]"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <h1 className="text-sm font-bold text-white uppercase tracking-wider">
                    {activeTab === "all" ? "Все лиды" : STATUS_LABELS[activeTab]}
                  </h1>
                </div>
                <button
                  onClick={() => setIsAddDrawerOpen(true)}
                  className="h-8 w-8 bg-white text-black rounded-lg flex items-center justify-center active:scale-95 transition-transform shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Строка поиска */}
          <div className="p-4 sm:p-6 border-b border-white/5 shrink-0 flex items-center justify-between">
            <div className="relative flex items-center w-full max-w-md">
              <Search className="w-4 h-4 text-white/40 absolute left-3 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className="w-full h-10 pl-9 pr-4 bg-white/[0.04] dark:bg-black/25 text-white placeholder-white/25 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs focus:outline-none transition-all font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 p-1 rounded-full text-white/60 hover:text-white"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="hidden md:flex items-center gap-3">
              <span className="text-[10px] text-white/60 font-bold uppercase tracking-widest bg-white/[0.04] px-3 py-1.5 rounded-full">
                Активный фильтр: {activeTab === "all" ? "Вся база" : STATUS_LABELS[activeTab]}
              </span>
            </div>
          </div>

          {/* Таблица лидов */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar">
            {loadingLeads ? (
              <div className="h-[50vh] flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-white/40 animate-spin" />
              </div>
            ) : sortedGroupKeys.length === 0 ? (
              <div className="h-[40vh] bg-white/[0.02] border border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center text-center p-6">
                <Inbox className="w-8 h-8 text-white/40 mb-3" />
                <h3 className="text-xs font-semibold text-white/60">Заявок не найдено</h3>
              </div>
            ) : (
              <div className="space-y-8">
                
                <div className="hidden md:grid grid-cols-[50px_1.5fr_1.2fr_1fr_1.1fr_1.2fr_2fr_1fr] gap-4 px-5 text-[10px] font-bold text-white/40 uppercase tracking-wider select-none shrink-0 border-b border-white/5 pb-2">
                  <span>Ист.</span>
                  <span>Имя</span>
                  <span>Телефон</span>
                  <span>Статус</span>
                  <span>След. шаг</span>
                  <span>Машина</span>
                  <span>Комментарий</span>
                  <span className="text-right">Создан</span>
                </div>

                {sortedGroupKeys.map(groupKey => {
                  const groupLeads = groups[groupKey];
                  const formattedTitle = getGroupTitleFormatted(groupKey);

                  return (
                    <div key={groupKey} className="space-y-2.5">
                      <div className={`px-1 text-[10px] font-bold tracking-wider uppercase ${getGroupTitleColor(groupKey)}`}>
                        {formattedTitle}
                      </div>

                      <div className="space-y-2">
                        {groupLeads.map(lead => {
                          const overdue = lead.nextStepDate && new Date(lead.nextStepDate) < now && !["won", "lost"].includes(lead.status);

                          return (
                            <div key={lead.id}>
                              
                              {/* ДЕСКТОПНЫЙ РЯД */}
                              <div
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setIsDetailOpen(true);
                                }}
                                className="hidden md:grid grid-cols-[50px_1.5fr_1.2fr_1fr_1.1fr_1.2fr_2fr_1fr] gap-4 items-center px-5 py-3.5 bg-white/[0.03] hover:bg-white/[0.07] active:bg-white/[0.1] backdrop-blur-[6px] border-0 rounded-xl transition-all duration-150 cursor-pointer shadow-sm"
                              >
                                <div className="flex items-center justify-start pl-1.5 text-white/60">
                                  {getSourceIcon(lead.source || "")}
                                </div>

                                <span className="text-xs font-bold text-white truncate pr-2">
                                  {lead.name}
                                </span>

                                <span className="font-mono text-white/70 text-xs tracking-tight">
                                  {lead.phone}
                                </span>

                                <div className="flex items-center gap-1.5 text-xs text-white/80">
                                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[lead.status]}`} />
                                  <span>{STATUS_LABELS[lead.status] === "Новые" ? "Новый" : STATUS_LABELS[lead.status]}</span>
                                </div>

                                <div>
                                  {lead.nextStepDate ? (
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-semibold
                                      ${overdue
                                        ? "bg-red-500/15 text-red-400"
                                        : "bg-white/[0.08] text-white/70"}`}
                                    >
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        {format(new Date(lead.nextStepDate), "d.MM, HH:mm", { locale: ru })}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className="text-[10px] text-white/30">—</span>
                                  )}
                                </div>

                                <span className="text-xs text-white/70 truncate pr-2">
                                  {lead.car || "—"}
                                </span>

                                <span className="text-xs text-white/60 truncate max-w-[280px] block" title={lead.notes}>
                                  {lead.notes || "—"}
                                </span>

                                <span className="text-[10px] text-white/40 text-right">
                                  {format(new Date(lead.createdAt), "d MMM, HH:mm", { locale: ru })}
                                </span>
                              </div>

                              {/* МОБИЛЬНАЯ КАРТОЧКА */}
                              <div
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setIsDetailOpen(true);
                                }}
                                className="md:hidden p-3.5 bg-white/[0.05] dark:bg-black/35 backdrop-blur-md border-0 shadow-[0_4px_12px_rgba(0,0,0,0.15)] rounded-2xl active:scale-[0.99] transition-all flex flex-col gap-3 cursor-pointer relative overflow-hidden group"
                              >
                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b from-primary/50 to-primary/10"></div>
                                <div className="pl-1.5 flex justify-between items-start gap-2">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <div className="shrink-0 text-white/60 bg-white/[0.08] p-1.5 rounded-xl group-hover:bg-primary/20 transition-colors">
                                      {getSourceIcon(lead.source || "")}
                                    </div>
                                    <div className="flex flex-col">
                                      <span className="text-xs font-bold text-white truncate">
                                        {lead.name}
                                      </span>
                                      <span className="text-[10px] text-white/60 font-mono mt-0.5">
                                        {lead.phone}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-1.5 text-[10px] text-white/80 bg-white/[0.06] px-2 py-0.5 rounded-full">
                                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[lead.status]}`} />
                                      <span className="font-semibold">{STATUS_LABELS[lead.status]}</span>
                                    </div>
                                    {lead.price ? (
                                      <span className="text-xs font-black text-white mt-0.5">
                                        {lead.price} BYN
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="pl-1.5 flex flex-col gap-2 pt-1.5 border-t border-white/5">
                                  <div className="flex items-center justify-between text-[11px]">
                                    {lead.service ? (
                                      <span className="text-primary/90 font-bold bg-primary/20 px-2 py-0.5 rounded-md border border-primary/20 truncate">
                                        {lead.service}
                                      </span>
                                    ) : (
                                      <span className="text-white/40 italic">Нет услуги</span>
                                    )}
                                    {lead.car && <span className="text-white/70 font-medium truncate ml-2 bg-white/[0.08] px-2 py-0.5 rounded-md">{lead.car}</span>}
                                  </div>

                                  {lead.notes && (
                                    <p className="text-[11px] text-white/60 truncate">
                                      {lead.notes}
                                    </p>
                                  )}

                                  <div className="flex items-center justify-between mt-1">
                                    {lead.nextStepDate ? (
                                      <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold
                                        ${overdue
                                          ? "bg-red-500/10 text-red-400"
                                          : "bg-white/[0.08] text-white/75"}`}
                                      >
                                        <Clock className="w-3 h-3" />
                                        <span>
                                          След. шаг: {format(new Date(lead.nextStepDate), "d MMM, HH:mm", { locale: ru })}
                                        </span>
                                      </div>
                                    ) : (
                                      <div></div>
                                    )}
                                    
                                    <span className="text-[9px] text-white/40 font-medium self-end mb-0.5">
                                      Создан: {format(new Date(lead.createdAt), "d.MM.yy HH:mm", { locale: ru })}
                                    </span>
                                  </div>
                                </div>
                              </div>

                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}

              </div>
            )}
          </div>
          </div>
        </main>
      </div>

      {/* DRAWER СПРАВА: ДОБАВЛЕНИЕ ЛИДА */}
      <RightDrawer
        isOpen={isAddDrawerOpen}
        onClose={() => setIsAddDrawerOpen(false)}
        title="Добавить лида вручную"
      >
        <form onSubmit={handleAddLeadSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/60 block mb-1">Имя клиента *</label>
              <input
                type="text"
                value={newLeadForm.name}
                onChange={(e) => setNewLeadForm(prev => ({ ...prev, name: e.target.value }))}
                required
                className="w-full px-3 py-2 bg-white/[0.04] text-white placeholder-white/20 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs focus:outline-none transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] text-white/60 block mb-1">Телефон *</label>
              <input
                type="text"
                value={newLeadForm.phone}
                onChange={(e) => setNewLeadForm(prev => ({ ...prev, phone: formatBYPhone(e.target.value) }))}
                maxLength={19}
                required
                className="w-full px-3 py-2 bg-white/[0.04] text-white placeholder-white/20 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs font-mono focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/60 block mb-1">Автомобиль</label>
            <input
              type="text"
              value={newLeadForm.car}
              onChange={(e) => setNewLeadForm(prev => ({ ...prev, car: e.target.value }))}
              className="w-full px-3 py-2 bg-white/[0.04] text-white placeholder-white/20 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs focus:outline-none transition-colors"
            />
          </div>

          {/* Кастомный селект для Источника */}
          <CustomSelect
            label="Источник"
            value={newLeadForm.source}
            onChange={(val) => setNewLeadForm(prev => ({ ...prev, source: val }))}
            options={[
              { value: "звонок", label: "Телефонный звонок" },
              { value: "Instagram", label: "Instagram" },
              { value: "TikTok", label: "TikTok" },
              { value: "сайт", label: "Сайт" },
              { value: "другое", label: "Другое" }
            ]}
          />

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] text-white/60 block mb-1">Услуга</label>
              <input
                type="text"
                value={newLeadForm.service || ""}
                onChange={(e) => setNewLeadForm(prev => ({ ...prev, service: e.target.value }))}
                list="service-names"
                className="w-full px-3 py-2 bg-white/[0.04] text-white placeholder-white/20 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs focus:outline-none transition-colors"
              />
              <datalist id="service-names">
                {appState.services.map(s => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-[10px] text-white/60 block mb-1">Стоимость (руб.)</label>
              <input
                type="number"
                value={newLeadForm.price || ""}
                onChange={(e) => setNewLeadForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                className="w-full px-3 py-2 bg-white/[0.04] text-white placeholder-white/20 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs focus:outline-none transition-colors"
              />
            </div>
          </div>

          {/* Кастомный селект для статуса */}
          <CustomSelect
            label="Начальный статус"
            value={newLeadForm.status}
            onChange={(val) => setNewLeadForm(prev => ({ ...prev, status: val }))}
            options={(Object.keys(STATUS_LABELS) as CRMLeadStatus[]).map(statusKey => ({
              value: statusKey,
              label: STATUS_LABELS[statusKey]
            }))}
          />

          <div>
            <label className="text-[10px] text-white/60 block mb-1">Заметки / Комментарий</label>
            <textarea
              placeholder="Опишите детали запроса клиента..."
              value={newLeadForm.notes}
              onChange={(e) => setNewLeadForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full px-3 py-2 bg-white/[0.04] text-white placeholder-white/20 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs resize-none focus:outline-none transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddDrawerOpen(false)}
              className="flex-1 h-10 bg-white/[0.04] hover:bg-white/[0.08] backdrop-blur-[4px] rounded-xl text-white text-xs font-semibold"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 h-10 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 text-xs shadow"
            >
              Добавить
            </button>
          </div>
        </form>
      </RightDrawer>

      {/* DRAWER СПРАВА: ДЕТАЛИ ЛИДА */}
      <RightDrawer
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedLead(null);
        }}
        title="Редактирование карточки клиента"
      >
        {detailForm && (
          <div className="space-y-6">
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/60 block mb-1">ФИО Клиента</label>
                  <input
                    type="text"
                    value={detailForm.name}
                    onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                    className="w-full px-3 py-2 bg-white/[0.04] text-white placeholder-white/20 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label className="text-[10px] text-white/60 block mb-1">Телефон</label>
                  <input
                    type="text"
                    value={detailForm.phone}
                    onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, phone: formatBYPhone(e.target.value) }) : null)}
                    maxLength={19}
                    className="w-full px-3 py-2 bg-white/[0.04] text-white placeholder-white/20 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs font-mono focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-white/60 block mb-1">Автомобиль</label>
                <input
                  type="text"
                  value={detailForm.car || ""}
                  onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, car: e.target.value }) : null)}
                  className="w-full px-3 py-2 bg-white/[0.04] text-white placeholder-white/20 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-white/60 block mb-1">Название услуги</label>
                  <input
                    type="text"
                    value={detailForm.service || ""}
                    onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, service: e.target.value }) : null)}
                    list="service-names-edit"
                    className="w-full px-3 py-2 bg-white/[0.04] text-white placeholder-white/20 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs focus:outline-none transition-colors"
                  />
                  <datalist id="service-names-edit">
                    {appState.services.map(s => (
                      <option key={s.id} value={s.name} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="text-[10px] text-white/60 block mb-1">Стоимость (руб.)</label>
                  <input
                    type="number"
                    value={detailForm.price || ""}
                    onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, price: Number(e.target.value) }) : null)}
                    className="w-full px-3 py-2 bg-white/[0.04] text-white placeholder-white/20 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {/* Кастомный селект для статуса */}
                <CustomSelect
                  label="Статус лида"
                  value={detailForm.status}
                  onChange={(val) => setDetailForm(prev => prev ? ({ ...prev, status: val }) : null)}
                  options={(Object.keys(STATUS_LABELS) as CRMLeadStatus[]).map(statusKey => ({
                    value: statusKey,
                    label: STATUS_LABELS[statusKey]
                  }))}
                />
                <div className="z-10 relative">
                  <CustomSelect
                    label="Источник"
                    value={detailForm.source || ""}
                    onChange={(val) => setDetailForm(prev => prev ? ({ ...prev, source: val }) : null)}
                    options={[
                      { value: "звонок", label: "Телефонный звонок" },
                      { value: "Instagram", label: "Instagram" },
                      { value: "TikTok", label: "TikTok" },
                      { value: "сайт", label: "Сайт" },
                      { value: "другое", label: "Другое" }
                    ]}
                  />
                </div>
              </div>

              {/* Планирование следующего шага */}
              <div className="p-4 bg-white/[0.04] border border-white/5 rounded-2xl space-y-3.5">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-primary" />
                  <span>Следующий шаг визита/звонка</span>
                </span>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[9px] text-white/60 block mb-1">Дата события</label>
                    <input
                      type="date"
                      value={nextStepDateInput}
                      onChange={(e) => setNextStepDateInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white/[0.04] text-white border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-lg text-xs focus:outline-none transition-colors"
                    />
                  </div>
                  <div>
                    <label className="text-[9px] text-white/60 block mb-1">Время события</label>
                    <input
                      type="time"
                      value={nextStepTimeInput}
                      onChange={(e) => setNextStepTimeInput(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white/[0.04] text-white border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-lg text-xs focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {nextStepDateInput && (
                  <div className="pt-2 border-t border-white/5 space-y-2">
                    <label className="text-[9px] text-white/60 block">Напоминания в Telegram бот:</label>
                    <div className="flex items-center gap-4">
                      {[10, 20, 30].map(minutes => {
                        const checked = detailForm.notifyBefore?.includes(minutes) || false;
                        return (
                          <AnimatedCheckbox
                            key={minutes}
                            checked={checked}
                            onChange={() => handleToggleNotifyBefore(minutes)}
                            label={`За ${minutes} мин.`}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleDeleteLead(detailForm.id)}
                  className="p-2.5 rounded-xl bg-red-500/[0.08] hover:bg-red-500/[0.16] backdrop-blur-[6px] text-red-300 flex items-center justify-center transition-colors"
                  title="Удалить карточку"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleUpdateLead}
                  className="flex-1 py-2.5 bg-white text-black font-semibold rounded-xl hover:bg-zinc-200 active:scale-[0.98] transition-all text-xs shadow-md"
                >
                  Сохранить изменения
                </button>
              </div>
            </div>

            <hr className="border-white/5" />

            {/* История и заметки менеджера */}
            <div className="space-y-4">
              <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <History className="w-4 h-4 text-white/60" />
                <span>Заметки и история изменений</span>
              </span>

              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Добавить новую заметку менеджера..."
                  value={newNoteText}
                  onChange={(e) => setNewNoteText(e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/[0.04] text-white placeholder-white/20 border-0 focus:bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs focus:outline-none transition-colors"
                />
                <button
                  type="button"
                  onClick={handleAddNoteToHistory}
                  className="px-4 bg-white/[0.08] hover:bg-white/[0.14] text-white rounded-xl text-xs font-semibold transition-all active:scale-[0.98]"
                >
                  Добавить
                </button>
              </div>

              <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-4 space-y-4 custom-scrollbar max-h-[300px] overflow-y-auto shadow-inner">
                {detailForm.history && detailForm.history.length > 0 ? (
                  [...detailForm.history].reverse().map((entry) => {
                    let icon = <ChevronLeft className="w-2.5 h-2.5 text-white/60" />;
                    if (entry.type === "creation") icon = <Plus className="w-2.5 h-2.5 text-green-400" />;
                    else if (entry.type === "status") icon = <Tag className="w-2.5 h-2.5 text-blue-400" />;
                    else if (entry.type === "note") icon = <FileText className="w-2.5 h-2.5 text-amber-500" />;
                    else if (entry.type === "price" || entry.type === "service") icon = <Coins className="w-2.5 h-2.5 text-purple-400" />;

                    const time = new Date(entry.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
                    const date = new Date(entry.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

                    return (
                      <div key={entry.id} className="flex gap-3 text-xs text-white/80">
                        <div className="w-5 h-5 rounded-full bg-white/[0.06] border border-white/5 flex items-center justify-center shrink-0 mt-0.5">
                          {icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="leading-relaxed break-words text-white/90">{entry.text}</p>
                          <span className="text-[9px] text-white/40 block mt-0.5">
                            {date} в {time} {entry.author ? `• ${entry.author.split("@")[0]}` : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-4 text-[10px] text-white/30 italic">
                    История операций пуста
                  </div>
                )}
              </div>
            </div>

          </div>
        )}
      </RightDrawer>

    </div>
  );
};

export default CrmPage;
