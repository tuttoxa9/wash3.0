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
  ChevronRight,
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
    url: "/wallpapers/indigo.jpg",
    thumb: "/wallpapers/indigo_thumb.jpg"
  },
  {
    id: "purple",
    name: "Фиолетовый шелк",
    url: "/wallpapers/purple.jpg",
    thumb: "/wallpapers/purple_thumb.jpg"
  },
  {
    id: "green",
    name: "Изумрудное стекло",
    url: "/wallpapers/green.jpg",
    thumb: "/wallpapers/green_thumb.jpg"
  },
  {
    id: "orange",
    name: "Оранжевый неон",
    url: "/wallpapers/orange.jpg",
    thumb: "/wallpapers/orange_thumb.jpg"
  },
  {
    id: "dark",
    name: "Темный абстракт",
    url: "/wallpapers/dark.jpg",
    thumb: "/wallpapers/dark_thumb.jpg"
  },
  {
    id: "lavender",
    name: "Лавандовый неон",
    url: "/wallpapers/lavender.jpg",
    thumb: "/wallpapers/lavender_thumb.jpg"
  },
  {
    id: "detail",
    name: "Detail Lab",
    url: "/wallpapers/detail.webp",
    thumb: "/wallpapers/detail.webp"
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

// Получить только цифры из телефона
const getPhoneDigits = (phone: string): string => phone.replace(/\D/g, '');

// Копирование телефона
const handleCopyPhone = (phone: string) => {
  navigator.clipboard.writeText(phone);
  toast.success("Телефон скопирован");
};

// Ссылки на мессенджеры
const getWhatsAppLink = (phone: string) => `https://wa.me/${getPhoneDigits(phone)}`;
const getTelegramLink = (phone: string) => `https://t.me/+${getPhoneDigits(phone)}`;
const getViberLink = (phone: string) => `viber://chat?number=%2B${getPhoneDigits(phone)}`;

// Брендированные иконки мессенджеров
const WhatsAppIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.071 4.914A9.927 9.927 0 0012.036 2c-5.51 0-9.998 4.487-10 9.998a9.927 9.927 0 001.53 5.26l-1.025 3.742 3.829-.994a9.98 9.98 0 004.832 1.258h.004c5.51 0 10-4.487 10-10 0-2.668-1.039-5.176-2.923-7.078zm-7.035 15.39c-1.701 0-3.37-.457-4.828-1.326l-.347-.206-3.585.932.955-3.488-.225-.358a8.272 8.272 0 01-1.267-4.385c0-4.57 3.73-8.3 8.303-8.3 2.213 0 4.293.863 5.856 2.428 1.563 1.564 2.424 3.646 2.422 5.874-.004 4.572-3.734 8.302-8.307 8.302zm4.568-6.239c-.25-.124-1.477-.73-1.705-.813-.228-.083-.393-.124-.559.124-.166.248-.642.813-.787.978-.145.165-.29.186-.54.062-.25-.124-1.056-.39-2.01-1.242-.743-.662-1.245-1.48-1.39-1.728-.145-.248-.015-.383.11-.507.112-.111.25-.29.375-.434.125-.145.166-.248.25-.414.083-.166.04-.31-.02-.435-.063-.124-.559-1.347-.766-1.844-.202-.487-.407-.42-.559-.428-.145-.008-.31-.01-.476-.01-.166 0-.435.062-.663.31-.228.248-.87.848-.87 2.071 0 1.222.89 2.401 1.014 2.566.124.166 1.751 2.674 4.243 3.743.593.254 1.056.406 1.416.52.596.19 1.138.163 1.567.099.478-.072 1.477-.604 1.684-1.16.207-.555.207-1.031.145-1.131-.062-.1-.228-.166-.477-.29z"/>
  </svg>
);

const TelegramIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.05 1.577c-.39-.39-2.501.488-5.32 1.646L3.087 8.718c-.85.34-.82 1.042-.036 1.272l4.9 1.528 1.7 5.286c.21.656.76.24 1.1-.064l2.4-2.315 4.9 3.61c.64.47 1.2.14 1.36-.656l3.2-15.064c.2-.95-.31-1.127-.562-.952zm-11.838 11.23l7.6-6c.21-.166.42-.046.22.124l-6.8 6.502-.29 3.037-1.12-3.315z"/>
  </svg>
);

const ViberIcon = ({ className = "w-3.5 h-3.5" }: { className?: string }) => (
  <svg className={`${className} shrink-0`} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.696 6.7.633 9.817.57 12.933.488 18.776 6.12 20.36h.003l-.004 2.416s-.037.977.61 1.177c.777.242 1.234-.5 1.98-1.302.407-.44.972-1.084 1.397-1.58 3.85.326 6.812-.416 7.15-.525.776-.252 5.176-.816 5.892-6.657.74-6.02-.36-9.83-2.34-11.546-.596-.55-3.006-2.3-8.375-2.323 0 0-.395-.025-1.037-.017zm.058 1.693c.545-.004.88.017.88.017 4.542.02 6.717 1.388 7.222 1.846 1.675 1.435 2.53 4.868 1.906 9.897v.002c-.604 4.878-4.174 5.184-4.832 5.395-.28.09-2.882.737-6.153.524 0 0-2.436 2.94-3.197 3.704-.12.12-.26.167-.352.144-.13-.033-.166-.188-.165-.414l.02-4.018c-4.762-1.32-4.485-6.292-4.43-8.895.054-2.604.543-4.738 1.996-6.173 1.96-1.773 5.474-2.018 7.11-2.03zm.38 2.602c-.167 0-.303.135-.304.302 0 .167.133.303.3.305 1.624.01 2.946.537 4.028 1.592 1.073 1.046 1.62 2.468 1.633 4.334.002.167.14.3.307.3.166-.002.3-.138.3-.304-.014-1.984-.618-3.596-1.816-4.764-1.19-1.16-2.692-1.753-4.447-1.765zm-3.96.695c-.19-.032-.4.005-.616.117l-.01.002c-.43.247-.816.562-1.146.932-.002.004-.006.004-.008.008-.267.323-.42.638-.46.948-.008.046-.01.093-.007.14 0 .136.022.27.065.4l.013.01c.135.48.473 1.276 1.205 2.604.42.768.903 1.5 1.446 2.186.27.344.56.673.87.984l.132.132c.31.308.64.6.984.87.686.543 1.418 1.027 2.186 1.447 1.328.733 2.126 1.07 2.604 1.206l.01.014c.13.042.265.064.402.063.046.002.092 0 .138-.008.31-.036.627-.19.948-.46.004 0 .003-.002.008-.005.37-.33.683-.72.93-1.148l.003-.01c.225-.432.15-.842-.18-1.12-.004 0-.698-.58-1.037-.83-.36-.255-.73-.492-1.113-.71-.51-.285-1.032-.106-1.248.174l-.447.564c-.23.283-.657.246-.657.246-3.12-.796-3.955-3.955-3.955-3.955s-.037-.426.248-.656l.563-.448c.277-.215.456-.737.17-1.248-.217-.383-.454-.756-.71-1.115-.25-.34-.826-1.033-.83-1.035-.137-.165-.31-.265-.502-.297zm4.49.88c-.158.002-.29.124-.3.282-.01.167.115.312.282.324 1.16.085 2.017.466 2.645 1.15.63.688.93 1.524.906.155z"/>
  </svg>
);

interface CustomSelectProps<T extends string> {
  value: T;
  onChange: (val: T) => void;
  options: { value: T; label: string }[];
  label?: string;
  isCompact?: boolean;
  hasWallpaper?: boolean;
}

const AnimatedCheckbox = ({ checked, onChange, label, className = "", textClassName = "text-foreground/80 group-hover:text-foreground" }: { checked: boolean, onChange: () => void, label: string, className?: string, textClassName?: string }) => {
  return (
    <div 
      onClick={onChange}
      className={`flex items-center gap-2 cursor-pointer group select-none ${className}`}
    >
      <div className={`w-4 h-4 rounded-[4px] flex items-center justify-center border transition-all duration-200 shadow-sm
        ${checked ? 'bg-primary border-primary' : 'bg-zinc-900 border-zinc-700 group-hover:border-primary/50'}
      `}>
        <motion.div
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
        >
          <Check className="w-3 h-3 text-primary-foreground" strokeWidth={3} />
        </motion.div>
      </div>
      <span className={`text-[11px] transition-colors font-medium ${textClassName}`}>{label}</span>
    </div>
  );
};

function CustomSelect<T extends string>({ value, onChange, options, label, isCompact = false, hasWallpaper = true }: CustomSelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative ${isOpen ? 'z-50' : 'z-10'}`}>
      {label && <label className="text-[10px] text-white/50 block mb-1 font-semibold">{label}</label>}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full ${isCompact ? 'h-8 px-2.5 rounded-lg' : 'h-10 px-3 rounded-xl'} ${hasWallpaper ? 'bg-zinc-900 text-white hover:bg-zinc-800' : 'bg-muted text-foreground hover:bg-muted/80'} text-xs flex items-center justify-between border-0 focus:outline-none transition-colors`}
      >
        <span className="truncate mr-2 font-semibold">{selectedOption?.label || value || "Выберите..."}</span>
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
              className={`absolute left-0 right-0 mt-1 ${hasWallpaper ? 'bg-zinc-900' : 'bg-card border border-border'} rounded-lg shadow-2xl z-20 py-1 overflow-hidden divide-y ${hasWallpaper ? 'divide-zinc-800' : 'divide-border'}`}
            >
              {options.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 text-xs transition-colors flex items-center justify-between border-0
                    ${opt.value === value 
                      ? (hasWallpaper ? "bg-zinc-800 text-white font-bold" : "bg-muted text-foreground font-bold") 
                      : (hasWallpaper ? "text-white/60 hover:text-white hover:bg-zinc-800" : "text-foreground/70 hover:bg-muted/80")}`}
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
  footer?: React.ReactNode;
  onDelete?: () => void;
}

const RightDrawer: React.FC<RightDrawerProps> = ({ isOpen, onClose, title, children, footer, onDelete }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-50"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className="fixed right-0 top-0 bottom-0 w-full sm:w-[500px] md:w-[580px] bg-zinc-950 text-white shadow-2xl z-[100] flex flex-col h-full overflow-hidden border-0"
          >
            <div className="flex items-center justify-between px-6 py-5 shrink-0">
              <h3 className="text-base font-bold text-white tracking-tight">{title}</h3>
              <div className="flex items-center gap-2">
                {onDelete && (
                  <button
                    type="button"
                    onClick={onDelete}
                    className="p-1.5 rounded-lg bg-red-950/60 hover:bg-red-900/50 text-red-400 transition-colors"
                    title="Удалить карточку"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white/60 hover:text-white transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto overflow-x-hidden p-6 custom-scrollbar">
              {children}
            </div>
            {footer && (
              <div className="p-6 border-t border-zinc-900 shrink-0 bg-zinc-950">
                {footer}
              </div>
            )}
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
  const prevViewModeRef = useRef<string>("gate");

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
  const [viewingDate, setViewingDate] = useState<string | null>(null); // null = сегодня и ранее, строка = конкретная дата
  const [selectedWallpaper, setSelectedWallpaper] = useState(() => {
    const saved = localStorage.getItem("crm_wallpaper");
    if (saved === "none") return "none";
    if (saved && saved.startsWith("/wallpapers/")) {
      return saved;
    }
    if (saved && saved.includes("unsplash.com")) {
      if (saved.includes("1618005182384")) return "/wallpapers/indigo.jpg";
      if (saved.includes("1618005198143")) return "/wallpapers/purple.jpg";
      if (saved.includes("1618005174098")) return "/wallpapers/green.jpg";
      if (saved.includes("1634017839464")) return "/wallpapers/orange.jpg";
      if (saved.includes("1604871000636")) return "/wallpapers/dark.jpg";
      if (saved.includes("1634017851502")) return "/wallpapers/lavender.jpg";
    }
    return WALLPAPERS[0].url;
  });

  const [activeWallpaper, setActiveWallpaper] = useState<string>("none");
  const [isWallpaperLoaded, setIsWallpaperLoaded] = useState<boolean>(false);

  // Предзагрузка обоев в фоновом режиме
  useEffect(() => {
    if (!selectedWallpaper || selectedWallpaper === "none") {
      setActiveWallpaper("none");
      setIsWallpaperLoaded(false);
      return;
    }

    setIsWallpaperLoaded(false);
    const img = new Image();
    img.src = selectedWallpaper;
    img.onload = () => {
      setActiveWallpaper(selectedWallpaper);
      setIsWallpaperLoaded(true);
    };
    img.onerror = () => {
      setActiveWallpaper(selectedWallpaper);
      setIsWallpaperLoaded(true);
    };
  }, [selectedWallpaper]);

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

  // Сброс и мгновенный запуск видео при возвращении на экран входа/настроек
  useEffect(() => {
    if (viewMode === "gate" || viewMode === "settings") {
      const videoA = videoARef.current;
      const videoB = videoBRef.current;
      
      // Перезапускаем только если вернулись из самой CRM-ки
      if (prevViewModeRef.current === "crm") {
        isFirstPlay.current = true;
        if (videoA) {
          videoA.currentTime = 0;
          videoA.style.opacity = "0.25"; // сразу даем видимость, не дожидаясь cross-fade
          videoA.play().catch(() => {});
        }
        if (videoB) {
          videoB.pause();
          videoB.currentTime = 0;
          videoB.style.opacity = "0";
        }
      } else {
        // При переходе между gate и settings видео не прерывается, просто проверяем, что оно воспроизводится
        if (videoA && videoA.paused && (!videoB || videoB.paused)) {
          videoA.play().catch(() => {});
        }
      }
    }
    prevViewModeRef.current = viewMode;
  }, [viewMode]);

  const loadLeads = async () => {
    setLoadingLeads(true);
    const data = await crmService.getAllLeads();
    setLeads(data);
    setLoadingLeads(false);
  };

  const loadSettings = async () => {
    const data = await crmService.getSettings();
    if (data) {
      // Автоматически обновляем URL приложения в БД, если он изменился или отсутствует,
      // но только если мы не на локальном хосте (чтобы не затереть рабочий Vercel-домен)
      const isLocalhost = window.location.hostname === "localhost" || 
                          window.location.hostname === "127.0.0.1" || 
                          window.location.hostname.startsWith("192.168.");

      if (data.appUrl !== window.location.origin && !isLocalhost) {
        const updated = { ...data, appUrl: window.location.origin };
        await crmService.saveSettings(updated);
        setCrmSettings(updated);
      } else {
        setCrmSettings(data);
      }
    } else {
      const isLocalhost = window.location.hostname === "localhost" || 
                          window.location.hostname === "127.0.0.1" || 
                          window.location.hostname.startsWith("192.168.");

      const initialSettings: CRMSettings = {
        telegramBotToken: "",
        telegramChatId: "",
        telegramEnabled: false,
        webhookApiKey: crypto.randomUUID ? crypto.randomUUID().replace(/-/g, "") : Math.random().toString(36).substring(2, 18),
        appUrl: isLocalhost ? "" : window.location.origin
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
    
    const isLocalhost = window.location.hostname === "localhost" || 
                        window.location.hostname === "127.0.0.1" || 
                        window.location.hostname.startsWith("192.168.");
                        
    // Сохраняем URL только если он не локальный, иначе сохраняем старый URL (или пустой)
    const appUrl = isLocalhost ? (crmSettings.appUrl || "") : window.location.origin;
    const settingsWithUrl = { ...crmSettings, appUrl };
    
    const success = await crmService.saveSettings(settingsWithUrl);
    setSavingSettings(false);
    if (success) {
      setCrmSettings(settingsWithUrl);
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
      const res = await fetch("/api/test-telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botToken: crmSettings.telegramBotToken,
          chatId: crmSettings.telegramChatId
        })
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Тестовое сообщение успешно отправлено!");
      } else {
        console.error("Telegram proxy error:", data);
        toast.error(`Ошибка: ${data.error || "неизвестная ошибка"}`);
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
  const [nextStepDateInput, setNextStepDateInput] = useState("");
  const [nextStepTimeInput, setNextStepTimeInput] = useState("");

  useEffect(() => {
    if (selectedLead) {
      setDetailForm({ ...selectedLead });
      
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

    if ((detailForm.notes || "") !== (selectedLead.notes || "")) {
      updatedHistory.push({
        id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 11),
        type: "note",
        text: `Заметка обновлена: "${detailForm.notes || ""}"`,
        createdAt: new Date().toISOString(),
        author: userAuthor
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

  const getHasChanges = () => {
    if (!detailForm || !selectedLead) return false;
    
    let originalDateInput = "";
    let originalTimeInput = "";
    if (selectedLead.nextStepDate) {
      const d = new Date(selectedLead.nextStepDate);
      originalDateInput = format(d, "yyyy-MM-dd");
      originalTimeInput = format(d, "HH:mm");
    }

    const nextStepChanged = nextStepDateInput !== originalDateInput || nextStepTimeInput !== originalTimeInput;
    const notifyChanged = JSON.stringify(detailForm.notifyBefore || []) !== JSON.stringify(selectedLead.notifyBefore || []);
    
    return (
      detailForm.name !== selectedLead.name ||
      detailForm.phone !== selectedLead.phone ||
      (detailForm.car || "") !== (selectedLead.car || "") ||
      Number(detailForm.price || 0) !== Number(selectedLead.price || 0) ||
      (detailForm.service || "") !== (selectedLead.service || "") ||
      detailForm.status !== selectedLead.status ||
      (detailForm.source || "") !== (selectedLead.source || "") ||
      (detailForm.notes || "") !== (selectedLead.notes || "") ||
      nextStepChanged ||
      notifyChanged
    );
  };

  // Фильтрация и группировка лидов
  const now = new Date();
  const todayStr = format(now, "yyyy-MM-dd");
  const yesterdayStr = format(subDays(now, 1), "yyyy-MM-dd");
  const tomorrowStr = format(addDays(now, 1), "yyyy-MM-dd");

  const filteredLeads = leads.filter(lead => {
    if (activeTab !== "all" && lead.status !== activeTab) return false;

    // Фильтрация по дате (viewingDate)
    const activeDateStr = lead.nextStepDate 
      ? lead.nextStepDate.slice(0, 10) 
      : lead.createdAt.slice(0, 10);

    if (viewingDate === null) {
      // Исключаем будущие даты
      if (activeDateStr > todayStr) return false;
    } else {
      // Точное совпадение с выбранной датой
      if (activeDateStr !== viewingDate) return false;
    }

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

  // Сброс и мгновенный запуск видео при возвращении на экран входа/настроек
  // Сортировка внутри групп по дате создания (в убывающем порядке - новые сверху)
  for (const key of Object.keys(groups)) {
    groups[key].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
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

  // Статистика лидов для сводки
  const totalLeadsCount = leads.length;
  const leadsTodayCount = leads.filter(l => {
    const activeDateStr = l.nextStepDate ? l.nextStepDate.slice(0, 10) : l.createdAt.slice(0, 10);
    return activeDateStr === todayStr;
  }).length;
  const overdueLeadsCount = leads.filter(l => 
    l.nextStepDate && new Date(l.nextStepDate) < now && !["won", "lost"].includes(l.status)
  ).length;

  const statusStats = (Object.keys(STATUS_LABELS) as CRMLeadStatus[]).map(statusKey => {
    const count = leads.filter(l => l.status === statusKey).length;
    const percentage = totalLeadsCount > 0 ? (count / totalLeadsCount) * 100 : 0;
    return {
      key: statusKey,
      label: STATUS_LABELS[statusKey],
      count,
      percentage,
      color: STATUS_DOT_COLORS[statusKey]
    };
  });

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

  // 1 & 2. GATE & SETTINGS VIEW (Общий экран входа и настроек для плавного видео-фона)
  if (viewMode === "gate" || viewMode === "settings") {
    return (
      <div 
        key="gate-settings-root"
        className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center bg-black md:bg-[url('/wallpapers/detail.webp')]"
      >
        {/* Dark overlay for desktop wallpaper background */}
        <div className="absolute inset-0 bg-black/60 pointer-events-none z-0 hidden md:block" />
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
        
        {viewMode === "gate" ? (
          <div key="gate-card" className="w-full max-w-[280px] bg-white/10 dark:bg-black/40 backdrop-blur-[40px] backdrop-saturate-[1.2] rounded-3xl p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative z-10 border-0 text-white flex flex-col gap-4">
            
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
                  className="w-full px-3.5 py-2 !bg-white/[0.04] dark:!bg-black/35 backdrop-blur-[12px] rounded-2xl text-white placeholder-white/20 text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all !border-0"
                />

                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Пароль"
                  className="w-full px-3.5 py-2 !bg-white/[0.04] dark:!bg-black/35 backdrop-blur-[12px] rounded-2xl text-white placeholder-white/20 text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all !border-0"
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
                <div className="text-center !bg-white/[0.04] dark:!bg-black/35 backdrop-blur-[12px] p-3.5 rounded-2xl border-0">
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
        ) : (
          <div key="settings-card" className="w-full max-w-[800px] mx-4 md:mx-auto bg-white/10 dark:bg-black/40 backdrop-blur-[40px] backdrop-saturate-[1.2] rounded-3xl p-5 md:p-7 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative z-10 border-0 text-white flex flex-col max-h-[85vh]">
            
            <div className="flex items-center gap-2 mb-4 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode("gate")}
                className="p-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.1] active:bg-white/[0.16] active:scale-[0.95] text-white/80 transition-all border-0"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <h1 className="text-sm font-bold text-white/95 uppercase tracking-wider">Настройки CRM</h1>
            </div>

            <form onSubmit={handleSaveSettings} className="flex flex-col min-h-0 flex-1">
              
              {/* Scrollable container for settings options */}
              <div className="flex-1 overflow-y-auto pr-1 md:pr-2 space-y-4 min-h-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  
                  {/* Left Column: Appearance */}
                  <div className="space-y-4">
                    {/* Выбор Темы оформления */}
                    <div className="p-3.5 !bg-white/[0.04] dark:!bg-black/35 backdrop-blur-[12px] rounded-2xl space-y-2 border-0">
                      <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                        Тема интерфейса
                      </span>
                      <div className="flex gap-2.5">
                        {(["light", "dark", "black"] as const).map(t => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => dispatch({ type: "SET_THEME", payload: t })}
                            className={`flex-1 py-1.5 rounded-xl text-[11px] font-semibold border-0 transition-all 
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
                    <div className="p-3.5 !bg-white/[0.04] dark:!bg-black/35 backdrop-blur-[12px] rounded-2xl space-y-2 border-0">
                      <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                        Обои рабочего стола
                      </span>
                      <div className="grid grid-cols-4 gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectWallpaper("none")}
                          className={`relative aspect-video rounded-xl overflow-hidden border-0 transition-all active:scale-[0.95] bg-zinc-800 flex flex-col items-center justify-center gap-1
                            ${selectedWallpaper === "none" ? "ring-2 ring-white/80" : "opacity-60 hover:opacity-100"}`}
                          title="Без обоев"
                        >
                          <X className="w-3.5 h-3.5 text-white/60" />
                          <span className="text-[8px] text-white/60">Без обоев</span>
                        </button>
                        {WALLPAPERS.map(wp => (
                          <button
                            key={wp.id}
                            type="button"
                            onClick={() => handleSelectWallpaper(wp.url)}
                            className={`relative aspect-video rounded-xl overflow-hidden border-0 transition-all active:scale-[0.95]
                              ${selectedWallpaper === wp.url ? "ring-2 ring-white/80" : "opacity-60 hover:opacity-100"}`}
                            title={wp.name}
                          >
                            <img src={wp.thumb} alt={wp.name} className="w-full h-full object-cover pointer-events-none" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Integrations */}
                  <div className="space-y-4">
                    {/* Telegram */}
                    <div className="p-3.5 !bg-white/[0.04] dark:!bg-black/35 backdrop-blur-[12px] rounded-2xl space-y-2.5 border-0">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
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
                            className="overflow-hidden space-y-3 pt-1"
                          >
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div>
                                <label className="text-[9px] text-white/50 block mb-1">Токен бота</label>
                                <input
                                  type="text"
                                  value={crmSettings.telegramBotToken}
                                  onChange={(e) => setCrmSettings(prev => ({ ...prev, telegramBotToken: e.target.value }))}
                                  required={crmSettings.telegramEnabled}
                                  className="w-full px-3 py-2 !bg-white/[0.04] dark:!bg-black/25 backdrop-blur-[10px] rounded-xl text-white placeholder-white/20 text-[10px] focus:outline-none focus:ring-1 focus:ring-white/10 transition-all !border-0"
                                />
                              </div>
                              <div>
                                <label className="text-[9px] text-white/50 block mb-1">ID чата / группы</label>
                                <input
                                  type="text"
                                  value={crmSettings.telegramChatId}
                                  onChange={(e) => setCrmSettings(prev => ({ ...prev, telegramChatId: e.target.value }))}
                                  required={crmSettings.telegramEnabled}
                                  className="w-full px-3 py-2 !bg-white/[0.04] dark:!bg-black/25 backdrop-blur-[10px] rounded-xl text-white placeholder-white/20 text-[10px] focus:outline-none focus:ring-1 focus:ring-white/10 transition-all !border-0"
                                />
                              </div>
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
                    <div className="p-3.5 !bg-white/[0.04] dark:!bg-black/35 backdrop-blur-[12px] rounded-2xl space-y-2.5 border-0">
                      <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">
                        Make / Zapier Webhook
                      </span>

                      <div className="space-y-2">
                        <div className="flex gap-2.5">
                          <div className="flex-1">
                            <label className="text-[9px] text-white/50 block mb-1">API ключ безопасности</label>
                            <input
                              type="text"
                              readOnly
                              value={crmSettings.webhookApiKey}
                              className="w-full px-3 py-2 !bg-white/[0.04] dark:!bg-black/25 backdrop-blur-[10px] rounded-xl text-white/70 text-[10px] select-all focus:outline-none !border-0"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={regenerateWebhookKey}
                            className="h-[34px] w-[34px] self-end rounded-xl bg-white/[0.06] hover:bg-white/[0.14] active:bg-white/[0.2] active:scale-[0.97] backdrop-blur-[6px] border-0 flex items-center justify-center text-white/70 hover:text-white transition-colors"
                            title="Обновить ключ"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div>
                          <label className="text-[9px] text-white/50 block mb-1">Адрес вебхука</label>
                          <div className="flex items-center gap-2.5 !bg-white/[0.04] dark:!bg-black/25 backdrop-blur-[10px] rounded-xl px-3 py-2 overflow-hidden border-0">
                            <span className="text-white/70 text-[9px] select-all truncate flex-1 font-mono">
                              {window.location.origin}/api/leads-webhook?api_key={crmSettings.webhookApiKey}
                            </span>
                            <button
                              type="button"
                              onClick={copyWebhookUrl}
                              className="text-white/60 hover:text-white transition-colors"
                            >
                              {isApiKeyCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* Action buttons (fixed at bottom of form) */}
              <div className="flex gap-3 pt-4 border-t border-white/10 mt-4 shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode("gate")}
                  className="flex-1 py-2 bg-white/[0.04] hover:bg-white/[0.08] active:bg-white/[0.12] active:scale-[0.97] backdrop-blur-[4px] rounded-xl text-white/70 hover:text-white text-[11px] font-semibold border-0"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={savingSettings}
                  className="flex-1 py-2 bg-white/[0.14] hover:bg-white/[0.22] active:bg-white/[0.28] active:scale-[0.97] backdrop-blur-[8px] rounded-xl text-white text-[11px] font-semibold border-0 flex items-center justify-center gap-1.5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15)]"
                >
                  {savingSettings && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Сохранить</span>
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // 3. CRM WORKSPACE (Основной экран)
  const hasWallpaper = selectedWallpaper && selectedWallpaper !== "none";

  return (
    <div 
      key="crm-workspace-root"
      className={`min-h-screen flex flex-col font-sans relative bg-black ${
        hasWallpaper ? "text-white" : "text-foreground bg-background"
      }`}
    >
      {/* Плавное проявление обоев после полной прогрузки */}
      {hasWallpaper && (
        <div 
          className="absolute inset-0 bg-cover bg-center transition-opacity ease-in-out pointer-events-none z-0"
          style={{ 
            backgroundImage: `url(${activeWallpaper})`,
            opacity: isWallpaperLoaded ? 1 : 0,
            transitionDuration: "1200ms"
          }}
        />
      )}

      {/* Dark overlay for contrast */}
      {hasWallpaper && <div className="absolute inset-0 bg-black/85 pointer-events-none z-[1]" />}
      
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[260px_3fr_2fr] min-h-0 h-full relative z-10">
        
        {/* ЛЕВАЯ КОЛОНКА */}
        <aside className={`hidden md:flex flex-col gap-6 p-6 shrink-0 h-screen sticky top-0 overflow-y-auto border-r ${
          hasWallpaper 
            ? "bg-white/[0.06] backdrop-blur-2xl backdrop-brightness-[1.5] backdrop-saturate-[1.3] border-white/5" 
            : "bg-card border-border"
        }`}>
          {/* Кнопка "Добавить лида" */}
          <button
            onClick={() => setIsAddDrawerOpen(true)}
            className={`w-full h-11 border-0 rounded-full active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-xs font-semibold shadow-md ${
              hasWallpaper 
                ? "bg-white/[0.10] hover:bg-white/[0.18] text-white backdrop-blur-xl backdrop-brightness-[1.6] backdrop-saturate-[1.3]" 
                : "bg-primary hover:bg-primary/90 text-primary-foreground"
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Добавить лида</span>
          </button>

          {/* Фильтры */}
          <div className="space-y-2.5">
            <span className={`text-[10px] font-bold tracking-widest uppercase block px-3 ${
              hasWallpaper ? "text-white/40" : "text-muted-foreground/80"
            }`}>
              Фильтры
            </span>

            <nav className="flex flex-col gap-1.5">
              <button
                onClick={() => setActiveTab("all")}
                className={`w-full h-10 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border
                  ${activeTab === "all"
                    ? "bg-indigo-600 text-white border-indigo-500/30 shadow-[0_4px_12px_rgba(99,102,241,0.3)]"
                    : (hasWallpaper 
                      ? "bg-zinc-900/70 border-white/10 text-white/70 hover:text-white hover:bg-zinc-800/80 hover:border-white/15 shadow-sm" 
                      : "bg-muted/80 border-border text-muted-foreground hover:text-foreground hover:bg-muted shadow-sm")}`}
              >
                <div className="flex items-center gap-2.5">
                  {STATUS_ICONS["all"]}
                  <span>Вся база</span>
                </div>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  activeTab === "all"
                    ? "text-indigo-200 bg-indigo-700/50"
                    : (hasWallpaper ? "text-white/60 bg-white/[0.08]" : "text-muted-foreground/80 bg-card border border-border/40")
                }`}>
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
                    className={`w-full h-10 px-3 rounded-xl text-xs font-semibold flex items-center justify-between transition-all border
                      ${isActive
                        ? "bg-indigo-600 text-white border-indigo-500/30 shadow-[0_4px_12px_rgba(99,102,241,0.3)]"
                        : (hasWallpaper 
                          ? "bg-zinc-900/70 border-white/10 text-white/70 hover:text-white hover:bg-zinc-800/80 hover:border-white/15 shadow-sm" 
                          : "bg-muted/80 border-border text-muted-foreground hover:text-foreground hover:bg-muted shadow-sm")}`}
                  >
                    <div className="flex items-center gap-2.5">
                      {STATUS_ICONS[tab]}
                      <span>{label}</span>
                    </div>
                    {count > 0 && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        isActive
                          ? "text-indigo-200 bg-indigo-700/50"
                          : (hasWallpaper ? "text-white/60 bg-white/[0.08]" : "text-muted-foreground/80 bg-card border border-border/40")
                      }`}>
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
              className={`w-full h-10 px-3 rounded-xl transition-all text-xs font-semibold flex items-center gap-2.5 border shadow-sm ${
                hasWallpaper 
                  ? "bg-zinc-900/70 border-white/10 text-white/80 hover:text-white hover:bg-zinc-800/80 hover:border-white/15" 
                  : "bg-muted/80 border-border text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
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
              <h1 className={`text-xl font-bold tracking-tight ${hasWallpaper ? "text-white" : "text-foreground"}`}>CRM Клиенты</h1>
              <div className="flex gap-2.5">
                <button
                  onClick={() => setIsAddDrawerOpen(true)}
                  className={`h-10 px-4 font-semibold rounded-xl flex items-center justify-center  transition-transform shadow-md text-sm gap-2 ${
                    hasWallpaper ? "bg-white text-black hover:bg-zinc-100" : "bg-primary text-primary-foreground hover:bg-primary/90"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Лид
                </button>
                <button
                  onClick={() => setViewMode("gate")}
                  className={`h-10 w-10 rounded-xl flex items-center justify-center  transition-transform border-0 ${
                    hasWallpaper 
                      ? "bg-white/[0.08] backdrop-blur-xl backdrop-brightness-[1.6] backdrop-saturate-[1.3] text-white hover:bg-white/[0.14]" 
                      : "bg-muted text-foreground hover:bg-muted/80"
                  }`}
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="px-5 pb-6 space-y-4">
              <div className="space-y-2.5">
                <h3 className={`text-[10px] font-bold tracking-widest uppercase px-1 ${hasWallpaper ? "text-white/40" : "text-muted-foreground/85"}`}>Основные</h3>
                <div className="flex flex-col gap-2">
                  {(["all", "new", "in_work", "appointment", "call_back", "no_answer", "thinking"] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => { setActiveTab(tab); setMobileViewLevel("leads"); }}
                      className={`w-full p-3.5 rounded-2xl flex items-center justify-between active:scale-[0.98] transition-all shadow-sm border-0 group ${
                        hasWallpaper
                          ? "bg-white/[0.08] backdrop-blur-xl backdrop-brightness-[1.6] backdrop-saturate-[1.3] text-white hover:bg-white/[0.14]"
                          : "bg-card text-foreground hover:bg-muted"
                      }`}
                    >
                      <div className="flex items-center gap-3.5">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
                          tab === 'new' 
                            ? 'bg-blue-500 text-white' 
                            : (hasWallpaper ? 'bg-white/[0.08] text-white' : 'bg-muted text-muted-foreground')
                        }`}>
                          {STATUS_ICONS[tab]}
                        </div>
                        <span className="text-sm font-bold">{tab === "all" ? "Все лиды" : STATUS_LABELS[tab]}</span>
                      </div>
                      <span className={`text-sm font-black px-3 py-1 rounded-full transition-colors ${
                        hasWallpaper ? "text-white/60 bg-white/[0.08] group-hover:bg-white/[0.14]" : "text-muted-foreground bg-muted group-hover:bg-muted/80"
                      }`}>
                        {getTabCount(tab)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2.5 pt-2">
                <h3 className={`text-[10px] font-bold tracking-widest uppercase px-1 ${hasWallpaper ? "text-white/40" : "text-muted-foreground/85"}`}>Завершенные</h3>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => { setActiveTab("won"); setMobileViewLevel("leads"); }}
                    className={`p-3.5 rounded-2xl flex items-center gap-3 active:scale-[0.98] border-0 ${
                      hasWallpaper
                        ? "bg-white/[0.08] backdrop-blur-xl backdrop-brightness-[1.6] backdrop-saturate-[1.3] text-white hover:bg-white/[0.14]"
                        : "bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center shrink-0">
                      {STATUS_ICONS["won"]}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className={`text-[10px] font-bold uppercase truncate ${hasWallpaper ? "text-white/40" : "text-muted-foreground/75"}`}>{STATUS_LABELS["won"]}</div>
                      <div className="text-sm font-black">{getTabCount("won")}</div>
                    </div>
                  </button>
                  <button
                    onClick={() => { setActiveTab("lost"); setMobileViewLevel("leads"); }}
                    className={`p-3.5 rounded-2xl flex items-center gap-3 active:scale-[0.98] border-0 ${
                      hasWallpaper
                        ? "bg-white/[0.08] backdrop-blur-xl backdrop-brightness-[1.6] backdrop-saturate-[1.3] text-white hover:bg-white/[0.14]"
                        : "bg-card text-foreground hover:bg-muted"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                      {STATUS_ICONS["lost"]}
                    </div>
                    <div className="text-left min-w-0 flex-1">
                      <div className={`text-[10px] font-bold uppercase truncate ${hasWallpaper ? "text-white/40" : "text-muted-foreground/75"}`}>{STATUS_LABELS["lost"]}</div>
                      <div className="text-sm font-black">{getTabCount("lost")}</div>
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
                    className="p-2 -ml-2 text-white/60 hover:text-white  transition-all rounded-full hover:bg-white/[0.08]"
                  >
                    <ChevronLeft className="w-6 h-6" />
                  </button>
                  <h1 className={`text-sm font-bold uppercase tracking-wider ${hasWallpaper ? "text-white" : "text-foreground"}`}>
                    {activeTab === "all" ? "Все лиды" : STATUS_LABELS[activeTab]}
                  </h1>
                </div>
                <button
                  onClick={() => setIsAddDrawerOpen(true)}
                  className={`h-8 w-8 rounded-lg flex items-center justify-center  transition-transform shadow-sm ${
                    hasWallpaper ? "bg-white text-black" : "bg-primary text-primary-foreground"
                  }`}
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Строка поиска */}
          <div className="p-4 sm:p-6 border-b border-white/5 shrink-0 flex items-center justify-between">
            <div className="relative flex items-center w-full max-w-md">
              <Search className={`w-4 h-4 absolute left-3 pointer-events-none ${hasWallpaper ? "text-white/40" : "text-muted-foreground"}`} />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Поиск..."
                className={`w-full h-10 pl-9 pr-4 text-xs focus:outline-none transition-all font-medium rounded-xl !border-0 focus:ring-1 ${
                  hasWallpaper
                    ? "!bg-white/[0.08] backdrop-blur-xl backdrop-brightness-[1.6] backdrop-saturate-[1.3] text-white placeholder-white/35 focus:!bg-white/[0.15] focus:ring-white/20"
                    : "!bg-muted text-foreground placeholder-muted-foreground focus:!bg-muted/80 focus:ring-primary/20"
                }`}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className={`absolute right-3 p-1 rounded-full ${hasWallpaper ? "text-white/60 hover:text-white" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="hidden md:flex items-center gap-4">
              {/* Переключатель дат */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    if (viewingDate === null) {
                      setViewingDate(yesterdayStr);
                    } else {
                      setViewingDate(format(subDays(new Date(viewingDate + 'T12:00:00'), 1), "yyyy-MM-dd"));
                    }
                  }}
                  className={`p-1.5 rounded-xl transition-all border ${hasWallpaper ? "text-white/70 hover:text-white bg-white/[0.06] backdrop-blur-xl backdrop-brightness-[1.2] hover:bg-white/[0.12] border-white/10" : "text-muted-foreground hover:text-foreground hover:bg-muted border-border"}`}
                  title="Предыдущий день"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setViewingDate(null)}
                  className={`px-3 py-1.5 rounded-xl text-[10px] uppercase font-bold tracking-wider transition-all border min-w-[130px] text-center ${
                    viewingDate === null
                      ? (hasWallpaper ? "bg-indigo-500/20 text-indigo-200 border-indigo-500/35 shadow-[0_0_12px_rgba(99,102,241,0.15)] font-black backdrop-blur-xl" : "bg-primary/10 text-primary border-primary/20 font-black")
                      : (hasWallpaper ? "bg-white/[0.06] text-white/80 border-white/10 hover:bg-white/[0.12] backdrop-blur-xl" : "bg-muted text-foreground border-border hover:bg-muted/80")
                  }`}
                  title="Показать сегодня и ранее"
                >
                  {viewingDate === null ? "Сегодня и ранее" : 
                   viewingDate === todayStr ? "Сегодня" :
                   viewingDate === yesterdayStr ? "Вчера" :
                   viewingDate === tomorrowStr ? "Завтра" :
                   format(new Date(viewingDate + 'T12:00:00'), "d MMMM", { locale: ru })}
                </button>
                <button
                  onClick={() => {
                    if (viewingDate === null) {
                      setViewingDate(tomorrowStr);
                    } else {
                      setViewingDate(format(addDays(new Date(viewingDate + 'T12:00:00'), 1), "yyyy-MM-dd"));
                    }
                  }}
                  className={`p-1.5 rounded-xl transition-all border ${hasWallpaper ? "text-white/70 hover:text-white bg-white/[0.06] backdrop-blur-xl backdrop-brightness-[1.2] hover:bg-white/[0.12] border-white/10" : "text-muted-foreground hover:text-foreground hover:bg-muted border-border"}`}
                  title="Следующий день"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>

              <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border ${
                hasWallpaper ? "text-indigo-300 bg-indigo-500/15 border-indigo-500/20 backdrop-blur-xl backdrop-brightness-[1.2]" : "text-primary bg-primary/10 border-primary/15"
              }`}>
                {activeTab === "all" ? "Вся база" : STATUS_LABELS[activeTab]}
              </span>
            </div>
          </div>

          {/* Таблица лидов */}
          <div className="flex-1 overflow-auto p-4 sm:p-6 custom-scrollbar">
            {loadingLeads ? (
              <div className="h-[50vh] flex items-center justify-center">
                <RefreshCw className={`w-6 h-6 animate-spin ${hasWallpaper ? "text-white/40" : "text-muted-foreground/50"}`} />
              </div>
            ) : sortedGroupKeys.length === 0 ? (
              <div className={`h-[40vh] border border-dashed rounded-2xl flex flex-col items-center justify-center text-center p-6 ${
                hasWallpaper ? "bg-white/[0.02] border-white/10" : "bg-muted/20 border-border"
              }`}>
                <Inbox className={`w-8 h-8 mb-3 ${hasWallpaper ? "text-white/40" : "text-muted-foreground/60"}`} />
                <h3 className={`text-xs font-semibold ${hasWallpaper ? "text-white/60" : "text-muted-foreground"}`}>Заявок не найдено</h3>
              </div>
            ) : (
              <div className="space-y-8">
                
                <div className={`hidden md:grid grid-cols-[45px_1.1fr_1.4fr_1fr_1.3fr_1.1fr_2fr_1fr] gap-4 px-5 text-[10px] font-bold uppercase tracking-wider select-none shrink-0 border-b pb-2 ${
                  hasWallpaper ? "text-white/95 border-white/10" : "text-muted-foreground border-border"
                }`}>
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
                                  if (window.innerWidth < 768) {
                                    setIsDetailOpen(true);
                                  }
                                }}
                                className={`hidden md:grid grid-cols-[45px_1.1fr_1.4fr_1fr_1.3fr_1.1fr_2fr_1fr] gap-4 items-center px-5 py-3.5 border rounded-xl transition-all duration-150 cursor-pointer shadow-sm ${
                                  selectedLead?.id === lead.id 
                                    ? (hasWallpaper 
                                      ? "bg-indigo-950/75 border-indigo-400/50 ring-1 ring-indigo-400/30 shadow-lg backdrop-blur-xl text-white" 
                                      : "bg-primary/10 ring-1.5 ring-primary/30 text-foreground")
                                    : (hasWallpaper
                                      ? "bg-white/[0.12] hover:bg-white/[0.18] border-white/10 shadow-md backdrop-blur-xl text-white"
                                      : "bg-card hover:bg-muted/70 active:bg-muted/90 text-foreground")
                                }`}
                              >
                                <div className={`flex items-center justify-start pl-1.5 ${hasWallpaper ? "text-white/85" : "text-muted-foreground"}`}>
                                  {getSourceIcon(lead.source || "")}
                                </div>

                                <span className={`text-xs font-extrabold truncate pr-2 ${hasWallpaper ? "text-white" : "text-foreground"}`}>
                                  {lead.name}
                                </span>

                                <span className={`font-mono text-xs tracking-tight whitespace-nowrap ${hasWallpaper ? "text-white" : "text-muted-foreground"}`}>
                                  {lead.phone}
                                </span>

                                <div className="flex items-center gap-1.5 text-xs font-semibold">
                                  <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[lead.status]}`} />
                                  <span className={hasWallpaper ? "text-white" : "text-foreground"}>{STATUS_LABELS[lead.status] === "Новые" ? "Новый" : STATUS_LABELS[lead.status]}</span>
                                </div>

                                <div>
                                  {lead.nextStepDate ? (
                                    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-bold whitespace-nowrap border
                                      ${overdue
                                        ? "bg-red-950/60 text-red-200 border-red-500/40 shadow-sm"
                                        : (hasWallpaper ? "bg-zinc-800/60 text-zinc-200 border-zinc-700/40" : "bg-muted text-foreground border-border")}`}
                                    >
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        {format(new Date(lead.nextStepDate), "d.MM, HH:mm", { locale: ru })}
                                      </span>
                                    </div>
                                  ) : (
                                    <span className={`text-[10px] ${hasWallpaper ? "text-white/30" : "text-muted-foreground/45"}`}>—</span>
                                  )}
                                </div>

                                <span className={`text-xs truncate pr-2 font-semibold ${hasWallpaper ? "text-white" : "text-foreground"}`}>
                                  {lead.car || "—"}
                                </span>

                                <span className={`text-xs truncate max-w-[280px] block font-medium ${hasWallpaper ? "text-white/95" : "text-foreground/90"}`} title={lead.notes}>
                                  {lead.notes || "—"}
                                </span>

                                <span className={`text-[10px] text-right font-medium ${hasWallpaper ? "text-white/80" : "text-muted-foreground/75"}`}>
                                  {format(new Date(lead.createdAt), "d MMM, HH:mm", { locale: ru })}
                                </span>
                              </div>

                              {/* МОБИЛЬНАЯ КАРТОЧКА (Elegant Modern Design) */}
                              <div
                                onClick={() => {
                                  setSelectedLead(lead);
                                  setIsDetailOpen(true);
                                }}
                                className={`md:hidden p-4 rounded-3xl border transition-all flex flex-col gap-4 cursor-pointer relative overflow-hidden group shadow-sm ${
                                  hasWallpaper
                                    ? "bg-white/10 hover:bg-white/[0.15] border-white/20 backdrop-blur-3xl backdrop-brightness-125 text-white"
                                    : "bg-card border-border/40 text-foreground hover:shadow-md"
                                }`}
                              >
                                <div className="flex justify-between items-start gap-3">
                                  <div className="flex items-center gap-3.5 min-w-0">
                                    <div className={`shrink-0 w-11 h-11 rounded-full flex items-center justify-center transition-colors ${
                                      hasWallpaper ? "bg-white/15 border border-white/20 text-white" : "bg-muted text-muted-foreground"
                                    }`}>
                                      {getSourceIcon(lead.source || "")}
                                    </div>
                                    <div className="flex flex-col min-w-0 justify-center">
                                      <span className="text-[16px] font-semibold truncate tracking-tight">
                                        {lead.name}
                                      </span>
                                      <span className={`text-[13px] font-medium tracking-wide mt-0.5 ${hasWallpaper ? "text-white/50" : "text-muted-foreground"}`}>
                                        {lead.phone}
                                      </span>
                                    </div>
                                  </div>

                                  <div className="flex flex-col items-end gap-2 shrink-0">
                                    <div className={`flex items-center gap-1.5 text-[12px] px-3 py-1 rounded-full font-medium ${
                                      hasWallpaper ? "text-white bg-white/20" : "text-foreground bg-muted"
                                    }`}>
                                      <span className={`w-1.5 h-1.5 rounded-full ${STATUS_DOT_COLORS[lead.status]}`} />
                                      <span>{STATUS_LABELS[lead.status]}</span>
                                    </div>
                                    {lead.price ? (
                                      <span className="text-[15px] font-bold tracking-tight">
                                        {lead.price} BYN
                                      </span>
                                    ) : null}
                                  </div>
                                </div>

                                <div className="flex flex-col gap-3">
                                  {(lead.service || lead.car) && (
                                    <div className="flex flex-wrap items-center gap-2">
                                      {lead.service ? (
                                        <span className={`text-[13px] font-medium px-3 py-1 rounded-xl truncate ${
                                          hasWallpaper ? "bg-white/20 text-white" : "bg-primary/10 text-primary"
                                        }`}>
                                          {lead.service}
                                        </span>
                                      ) : null}
                                      {lead.car && (
                                        <span className={`text-[13px] font-medium truncate px-3 py-1 rounded-xl ${
                                          hasWallpaper ? "text-white/90 bg-white/10" : "text-muted-foreground bg-muted"
                                        }`}>
                                          {lead.car}
                                        </span>
                                      )}
                                    </div>
                                  )}

                                  {lead.notes && (
                                    <div className={`px-3 py-2.5 rounded-xl text-[13px] leading-relaxed ${
                                      hasWallpaper 
                                        ? "bg-white/[0.03] text-white/70 border border-white/[0.05]" 
                                        : "bg-muted/30 text-muted-foreground border border-border/50"
                                    }`}>
                                      <p className="line-clamp-2">{lead.notes}</p>
                                    </div>
                                  )}

                                  <div className="flex items-center justify-between mt-1 pt-1">
                                    {lead.nextStepDate ? (
                                      <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[12px] font-semibold
                                        ${overdue
                                          ? (hasWallpaper ? "bg-red-500/15 text-red-200 border border-red-500/20" : "bg-red-50 text-red-600 border border-red-100")
                                          : (hasWallpaper ? "bg-white/5 text-white/80 border border-white/5" : "bg-muted text-muted-foreground border border-border/50")}`}
                                      >
                                        <Clock className="w-3.5 h-3.5 opacity-80" />
                                        <span>
                                          {format(new Date(lead.nextStepDate), "d MMM, HH:mm", { locale: ru })}
                                        </span>
                                      </div>
                                    ) : (
                                      <div />
                                    )}
                                    
                                    <span className={`text-[11px] font-medium self-end mb-1 tracking-wide ${hasWallpaper ? "text-white/30" : "text-muted-foreground/50"}`}>
                                      {format(new Date(lead.createdAt), "d.MM.yy HH:mm", { locale: ru })}
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

        {/* ДЕСКТОПНАЯ ПАНЕЛЬ КЛИЕНТА / СВОДКА */}
        <aside className={`hidden md:flex flex-col shrink-0 h-screen sticky top-0 overflow-hidden border-0 ${
          hasWallpaper 
            ? "bg-zinc-950 text-white" 
            : "bg-card text-foreground"
        }`}>
          {selectedLead && detailForm ? (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Шапка панели клиента */}
              <div className="flex items-center justify-between p-6 pb-4 shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-wider">Информация о клиенте</h3>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleDeleteLead(detailForm.id)}
                    className={`p-1.5 rounded-lg transition-colors border-0  ${
                      hasWallpaper ? "bg-red-950/60 hover:bg-red-900/50 text-red-400" : "bg-red-50 hover:bg-red-100 text-red-600"
                    }`}
                    title="Удалить карточку"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedLead(null);
                      setDetailForm(null);
                    }}
                    className={`p-1.5 rounded-lg ${hasWallpaper ? "bg-zinc-900 hover:bg-zinc-800 text-white/60 hover:text-white" : "bg-muted hover:bg-muted/80 text-foreground/60 hover:text-foreground"} transition-colors`}
                    title="Закрыть и показать сводку"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Прокручиваемое содержимое */}
              <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 space-y-5">

              {/* Форма редактирования */}
              <div className="space-y-3.5">
                <div className="space-y-2.5">
                  
                  {/* Объединенный блок клиента ФИО / Телефон */}
                  <div className={`p-3.5 ${hasWallpaper ? "bg-zinc-900" : "bg-muted"} rounded-xl space-y-2.5 border-0`}>
                    <span className="text-[9px] font-bold text-white/50 uppercase tracking-wider block">Клиент (ФИО и Телефон)</span>
                    <div className="flex flex-col gap-2">
                      <input
                        type="text"
                        placeholder="ФИО клиента"
                        value={detailForm.name}
                        onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                        className={`w-full px-2.5 py-1.5 ${hasWallpaper ? "!bg-zinc-950 text-white placeholder-white/20" : "!bg-background text-foreground placeholder-foreground/30"} !border-0 rounded-md text-xs focus:outline-none transition-colors font-semibold`}
                      />
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="Телефон"
                          value={detailForm.phone}
                          onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, phone: formatBYPhone(e.target.value) }) : null)}
                          maxLength={19}
                          className={`flex-1 min-w-0 px-2.5 py-1.5 ${hasWallpaper ? "!bg-zinc-950 text-white placeholder-white/20" : "!bg-background text-foreground placeholder-foreground/30"} !border-0 rounded-md text-xs font-mono focus:outline-none transition-colors`}
                        />
                        <button
                          type="button"
                          onClick={() => handleCopyPhone(detailForm.phone)}
                          className={`p-1.5 rounded-md ${hasWallpaper ? "bg-zinc-955 hover:bg-zinc-800 text-white/70 hover:text-white" : "bg-background hover:bg-muted text-foreground/75"}  transition-all shrink-0 border-0`}
                          title="Копировать телефон"
                        >
                          <Copy className="w-3.5 h-3.5 shrink-0" />
                        </button>
                        <a
                          href={`tel:${getPhoneDigits(detailForm.phone)}`}
                          className={`p-1.5 rounded-md ${hasWallpaper ? "bg-zinc-955 hover:bg-zinc-800 text-white/70 hover:text-white" : "bg-background hover:bg-muted text-foreground/75"}  transition-all flex items-center justify-center shrink-0 border-0`}
                          title="Позвонить"
                        >
                          <Phone className="w-3.5 h-3.5 text-green-400 shrink-0" />
                        </a>
                      </div>
                    </div>
                  </div>

                  {/* Быстрые мессенджеры */}
                  {detailForm.phone && (
                    <div className="pt-0.5">
                      <span className="text-[9px] text-white/50 block mb-1 uppercase tracking-wider font-bold">Написать в мессенджер:</span>
                      <div className="grid grid-cols-3 gap-2">
                        <a
                          href={getWhatsAppLink(detailForm.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#25D366] hover:bg-[#20ba59] text-white text-[10px] font-bold transition-all  shadow-sm border-0"
                        >
                          <WhatsAppIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>WhatsApp</span>
                        </a>
                        <a
                          href={getTelegramLink(detailForm.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#24A1DE] hover:bg-[#1d8dbf] text-white text-[10px] font-bold transition-all  shadow-sm border-0"
                        >
                          <TelegramIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>Telegram</span>
                        </a>
                        <a
                          href={getViberLink(detailForm.phone)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-[#7360F2] hover:bg-[#5e4cd9] text-white text-[10px] font-bold transition-all  shadow-sm border-0"
                        >
                          <ViberIcon className="w-3.5 h-3.5 shrink-0" />
                          <span>Viber</span>
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Авто и Стоимость side-by-side */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] text-white/50 block mb-0.5 font-semibold">Автомобиль</label>
                      <input
                        type="text"
                        value={detailForm.car || ""}
                        onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, car: e.target.value }) : null)}
                        className={`w-full px-2.5 py-1.5 ${hasWallpaper ? "!bg-zinc-900 text-white placeholder-white/20" : "!bg-muted text-foreground placeholder-foreground/30"} !border-0 rounded-lg text-xs focus:outline-none transition-colors`}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] text-white/50 block mb-0.5 font-semibold">Стоимость (руб.)</label>
                      <input
                        type="number"
                        value={detailForm.price || ""}
                        onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, price: Number(e.target.value) }) : null)}
                        className={`w-full px-2.5 py-1.5 ${hasWallpaper ? "!bg-zinc-900 text-white placeholder-white/20" : "!bg-muted text-foreground placeholder-foreground/30"} !border-0 rounded-lg text-xs focus:outline-none transition-colors font-semibold`}
                      />
                    </div>
                  </div>

                  {/* Название услуги - на всю ширину */}
                  <div>
                    <label className="text-[10px] text-white/50 block mb-0.5 font-semibold">Название услуги</label>
                    <input
                      type="text"
                      value={detailForm.service || ""}
                      onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, service: e.target.value }) : null)}
                      list="service-names-edit-desktop"
                      className={`w-full px-2.5 py-1.5 ${hasWallpaper ? "!bg-zinc-900 text-white placeholder-white/20" : "!bg-muted text-foreground placeholder-foreground/30"} !border-0 rounded-lg text-xs focus:outline-none transition-colors`}
                    />
                    <datalist id="service-names-edit-desktop">
                      {appState.services.map(s => (
                        <option key={s.id} value={s.name} />
                      ))}
                    </datalist>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <CustomSelect
                      label="Статус лида"
                      value={detailForm.status}
                      onChange={(val) => setDetailForm(prev => prev ? ({ ...prev, status: val }) : null)}
                      isCompact={true}
                      hasWallpaper={hasWallpaper}
                      options={(Object.keys(STATUS_LABELS) as CRMLeadStatus[]).map(statusKey => ({
                        value: statusKey,
                        label: STATUS_LABELS[statusKey]
                      }))}
                    />
                    <CustomSelect
                      label="Источник"
                      value={detailForm.source || ""}
                      onChange={(val) => setDetailForm(prev => prev ? ({ ...prev, source: val }) : null)}
                      isCompact={true}
                      hasWallpaper={hasWallpaper}
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
                <div className={`p-3.5 ${hasWallpaper ? "bg-zinc-900" : "bg-muted"} rounded-xl space-y-3 border-0`}>
                  <span className="text-[10px] font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>Следующий шаг визита/звонка</span>
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[9px] text-white/60 block mb-0.5">Дата события</label>
                      <input
                        type="date"
                        value={nextStepDateInput}
                        onChange={(e) => setNextStepDateInput(e.target.value)}
                        className={`w-full px-2.5 py-1.5 ${hasWallpaper ? "!bg-zinc-950 text-white" : "!bg-background text-foreground"} !border-0 rounded-lg text-xs focus:outline-none transition-colors`}
                      />
                    </div>
                    <div>
                      <label className="text-[9px] text-white/60 block mb-0.5">Время события</label>
                      <input
                        type="time"
                        value={nextStepTimeInput}
                        onChange={(e) => setNextStepTimeInput(e.target.value)}
                        className={`w-full px-2.5 py-1.5 ${hasWallpaper ? "!bg-zinc-955 text-white" : "!bg-background text-foreground"} !border-0 rounded-lg text-xs focus:outline-none transition-colors`}
                      />
                    </div>
                  </div>

                  {nextStepDateInput && (
                    <div className={`pt-2 border-t ${hasWallpaper ? "border-zinc-800" : "border-border"} space-y-2`}>
                      <label className="text-[9px] text-white/60 block font-semibold">Напоминания в Telegram:</label>
                      <div className="flex items-center gap-4">
                        {[10, 20, 30].map(minutes => {
                          const checked = detailForm.notifyBefore?.includes(minutes) || false;
                          return (
                            <AnimatedCheckbox
                              key={minutes}
                              checked={checked}
                              onChange={() => handleToggleNotifyBefore(minutes)}
                              label={`За ${minutes} мин.`}
                              textClassName="text-white/80 group-hover:text-white"
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>

              </div>

              <hr className={`border-0 h-[1px] ${hasWallpaper ? "bg-zinc-800" : "bg-border"}`} />

              {/* Поле заметки */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-white/60" />
                  <span>Заметка</span>
                </span>
                <textarea
                  value={detailForm.notes || ""}
                  onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                  placeholder="Введите заметку..."
                  rows={4}
                  className={`w-full px-3 py-2 ${hasWallpaper ? "bg-zinc-900 text-white placeholder-white/20 border border-zinc-800/80" : "bg-muted text-foreground placeholder-foreground/30 border border-border"} rounded-xl text-xs resize-none focus:outline-none transition-colors font-medium`}
                />
              </div>

              <hr className={`border-0 h-[1px] ${hasWallpaper ? "bg-zinc-800" : "bg-border"}`} />

              {/* История изменений */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider flex items-center gap-1.5">
                  <History className="w-4 h-4 text-white/60" />
                  <span>История изменений</span>
                </span>

                <div className={`rounded-xl p-3 space-y-3 custom-scrollbar max-h-[180px] overflow-y-auto border-0 ${hasWallpaper ? "bg-zinc-900" : "bg-muted/40"}`}>
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
                        <div key={entry.id} className="flex gap-2.5 text-[11px] text-white/80">
                          <div className={`w-5 h-5 rounded-full ${hasWallpaper ? "bg-zinc-955" : "bg-background"} flex items-center justify-center shrink-0 mt-0.5 border-0`}>
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

              {/* Кнопка сохранения изменений, появляется только при наличии изменений */}
              {getHasChanges() && (
                <div className={`p-6 border-t shrink-0 ${hasWallpaper ? "bg-zinc-950 border-zinc-800" : "bg-card border-border"}`}>
                  <button
                    type="button"
                    onClick={handleUpdateLead}
                    className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white font-bold rounded-lg active:scale-[0.98] transition-all text-xs shadow-md border-0"
                  >
                    Сохранить изменения
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-5">
              {/* Сводка / Dashboard */}
              <div className="pb-2 shrink-0">
                <h3 className="text-xs font-bold uppercase tracking-wider">Сводка CRM</h3>
              </div>

              {/* Метрики */}
              <div className="grid grid-cols-1 gap-3">
                <div className={`p-3.5 ${hasWallpaper ? "bg-zinc-900" : "bg-muted/60"} rounded-xl flex flex-col gap-0.5 border-0 shadow-sm`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${hasWallpaper ? "text-white/50" : "text-muted-foreground"}`}>Всего лидов</span>
                  <span className="text-xl font-black">{totalLeadsCount}</span>
                </div>
                <div className={`p-3.5 ${hasWallpaper ? "bg-indigo-950/40 text-indigo-200" : "bg-indigo-50 text-indigo-700"} rounded-xl flex flex-col gap-0.5 border-0 shadow-sm`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${hasWallpaper ? "text-indigo-400" : "text-indigo-600/80"}`}>На сегодня</span>
                  <span className="text-xl font-black">{leadsTodayCount}</span>
                </div>
                <div className={`p-3.5 ${
                  overdueLeadsCount > 0 
                    ? (hasWallpaper ? "bg-red-950/40 text-red-200" : "bg-red-50 text-red-700") 
                    : (hasWallpaper ? "bg-zinc-900 text-white" : "bg-muted/60 text-foreground")
                } rounded-xl flex flex-col gap-0.5 border-0 shadow-sm`}>
                  <span className={`text-[9px] font-bold uppercase tracking-wider ${
                    overdueLeadsCount > 0 ? "text-red-400" : (hasWallpaper ? "text-white/50" : "text-muted-foreground")
                  }`}>Просрочено</span>
                  <span className="text-xl font-black">{overdueLeadsCount}</span>
                </div>
              </div>

              {/* Распределение по статусам */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-white/70 uppercase tracking-wider block">Статусы лидов</span>
                <div className="space-y-2.5">
                  {statusStats.map(stat => (
                    <div key={stat.key} className="space-y-1">
                      <div className="flex justify-between text-[10px] font-semibold">
                        <span className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${stat.color}`} />
                          <span>{stat.label}</span>
                        </span>
                        <span className={hasWallpaper ? "text-white/60" : "text-muted-foreground"}>
                          {stat.count} <span className="text-[9px] opacity-70">({Math.round(stat.percentage)}%)</span>
                        </span>
                      </div>
                      <div className={`h-1 w-full ${hasWallpaper ? "bg-zinc-900" : "bg-muted"} rounded-full overflow-hidden`}>
                        <div
                          className={`h-full rounded-full ${stat.color.split(' ')[0]}`}
                          style={{ width: `${stat.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </aside>
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
                className="w-full px-3 py-2 !bg-white/[0.04] text-white placeholder-white/20 !border-0 focus:!bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs focus:outline-none transition-colors"
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
                className="w-full px-3 py-2 !bg-white/[0.04] text-white placeholder-white/20 !border-0 focus:!bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs font-mono focus:outline-none transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] text-white/60 block mb-1">Автомобиль</label>
            <input
              type="text"
              value={newLeadForm.car}
              onChange={(e) => setNewLeadForm(prev => ({ ...prev, car: e.target.value }))}
              className="w-full px-3 py-2 !bg-white/[0.04] text-white placeholder-white/20 !border-0 focus:!bg-white/[0.08] focus:ring-1 focus:ring-white/10 rounded-xl text-xs focus:outline-none transition-colors"
            />
          </div>

          {/* Кастомный селект для Источника */}
          <CustomSelect
            label="Источник"
            value={newLeadForm.source}
            onChange={(val) => setNewLeadForm(prev => ({ ...prev, source: val }))}
            isCompact={true}
            hasWallpaper={true}
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
              <label className="text-[10px] text-white/50 block mb-0.5 font-semibold">Услуга</label>
              <input
                type="text"
                value={newLeadForm.service || ""}
                onChange={(e) => setNewLeadForm(prev => ({ ...prev, service: e.target.value }))}
                list="service-names"
                className="w-full px-2.5 py-1.5 bg-zinc-900 text-white placeholder-white/20 !border-0 rounded-lg text-xs focus:outline-none transition-colors"
              />
              <datalist id="service-names">
                {appState.services.map(s => (
                  <option key={s.id} value={s.name} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-[10px] text-white/50 block mb-0.5 font-semibold">Стоимость (руб.)</label>
              <input
                type="number"
                value={newLeadForm.price || ""}
                onChange={(e) => setNewLeadForm(prev => ({ ...prev, price: Number(e.target.value) }))}
                className="w-full px-2.5 py-1.5 bg-zinc-900 text-white placeholder-white/20 !border-0 rounded-lg text-xs focus:outline-none transition-colors font-semibold"
              />
            </div>
          </div>

          {/* Кастомный селект для статуса */}
          <CustomSelect
            label="Начальный статус"
            value={newLeadForm.status}
            onChange={(val) => setNewLeadForm(prev => ({ ...prev, status: val }))}
            isCompact={true}
            hasWallpaper={true}
            options={(Object.keys(STATUS_LABELS) as CRMLeadStatus[]).map(statusKey => ({
              value: statusKey,
              label: STATUS_LABELS[statusKey]
            }))}
          />

          <div>
            <label className="text-[10px] text-white/50 block mb-0.5 font-semibold">Заметки / Комментарий</label>
            <textarea
              placeholder="Опишите детали запроса клиента..."
              value={newLeadForm.notes}
              onChange={(e) => setNewLeadForm(prev => ({ ...prev, notes: e.target.value }))}
              rows={4}
              className="w-full px-2.5 py-1.5 bg-zinc-900 text-white placeholder-white/20 !border-0 rounded-lg text-xs resize-none focus:outline-none transition-colors"
            />
          </div>

          <div className="flex gap-3 pt-3">
            <button
              type="button"
              onClick={() => setIsAddDrawerOpen(false)}
              className="flex-1 h-10 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-semibold rounded-lg"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="flex-1 h-10 bg-white hover:bg-zinc-200 text-black font-semibold rounded-lg text-xs shadow"
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
        footer={
          detailForm && getHasChanges() ? (
            <button
              type="button"
              onClick={handleUpdateLead}
              className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white font-bold rounded-lg active:scale-[0.98] transition-all text-xs shadow-md border-0"
            >
              Сохранить изменения
            </button>
          ) : null
        }
      >
        {detailForm && (
          <div className="space-y-5">

            <div className="space-y-3.5">
              
              {/* Объединенный блок клиента ФИО / Телефон */}
              <div className="space-y-3">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block pl-1">Контактные данные</span>
                <div className="flex flex-col gap-2.5">
                  <input
                    type="text"
                    placeholder="ФИО клиента"
                    value={detailForm.name}
                    onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, name: e.target.value }) : null)}
                    className="w-full px-3.5 py-3 bg-muted/40 hover:bg-muted/60 text-white placeholder-white/20 border border-border/50 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors font-medium"
                  />
                  <div className="flex items-center gap-2.5">
                    <input
                      type="text"
                      placeholder="Телефон"
                      value={detailForm.phone}
                      onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, phone: formatBYPhone(e.target.value) }) : null)}
                      maxLength={19}
                      className="flex-1 min-w-0 px-3.5 py-3 bg-muted/40 hover:bg-muted/60 text-white placeholder-white/20 border border-border/50 rounded-xl text-sm font-mono focus:outline-none focus:border-primary/50 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => handleCopyPhone(detailForm.phone)}
                      className="w-11 h-11 rounded-xl bg-muted/40 hover:bg-muted/80 text-white/70 hover:text-white transition-all shrink-0 border border-border/50 flex items-center justify-center"
                      title="Копировать телефон"
                    >
                      <Copy className="w-4 h-4 shrink-0" />
                    </button>
                    <a
                      href={`tel:${getPhoneDigits(detailForm.phone)}`}
                      className="w-11 h-11 rounded-xl bg-green-500/10 hover:bg-green-500/20 text-green-500 transition-all flex items-center justify-center shrink-0 border border-green-500/20"
                      title="Позвонить"
                    >
                      <Phone className="w-4 h-4 shrink-0" />
                    </a>
                  </div>
                </div>
              </div>

              {/* Быстрые мессенджеры в мобильном окне */}
              {detailForm.phone && (
                <div className="grid grid-cols-3 gap-2.5">
                  <a
                    href={getWhatsAppLink(detailForm.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] transition-all border border-[#25D366]/20 shadow-sm"
                  >
                    <WhatsAppIcon className="w-5 h-5 shrink-0" />
                    <span className="text-[10px] font-bold">WhatsApp</span>
                  </a>
                  <a
                    href={getTelegramLink(detailForm.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#24A1DE]/10 hover:bg-[#24A1DE]/20 text-[#24A1DE] transition-all border border-[#24A1DE]/20 shadow-sm"
                  >
                    <TelegramIcon className="w-5 h-5 shrink-0" />
                    <span className="text-[10px] font-bold">Telegram</span>
                  </a>
                  <a
                    href={getViberLink(detailForm.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#7360F2]/10 hover:bg-[#7360F2]/20 text-[#7360F2] transition-all border border-[#7360F2]/20 shadow-sm"
                  >
                    <ViberIcon className="w-5 h-5 shrink-0" />
                    <span className="text-[10px] font-bold">Viber</span>
                  </a>
                </div>
              )}

              {/* Детали визита */}
              <div className="space-y-3 pt-3">
                <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block pl-1">Детали визита</label>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    placeholder="Автомобиль"
                    value={detailForm.car || ""}
                    onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, car: e.target.value }) : null)}
                    className="w-full px-3.5 py-3 bg-muted/40 hover:bg-muted/60 text-white placeholder-white/20 border border-border/50 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                  />
                  <div className="relative">
                    <input
                      type="number"
                      placeholder="Стоимость"
                      value={detailForm.price || ""}
                      onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, price: Number(e.target.value) }) : null)}
                      className="w-full px-3.5 py-3 bg-muted/40 hover:bg-muted/60 text-white placeholder-white/20 border border-border/50 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors font-semibold pr-10"
                    />
                    <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[12px] font-bold text-muted-foreground">BYN</span>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="Название услуги"
                  value={detailForm.service || ""}
                  onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, service: e.target.value }) : null)}
                  list="service-names-edit"
                  className="w-full px-3.5 py-3 bg-muted/40 hover:bg-muted/60 text-white placeholder-white/20 border border-border/50 rounded-xl text-sm focus:outline-none focus:border-primary/50 transition-colors"
                />
                <datalist id="service-names-edit">
                  {appState.services.map(s => (
                    <option key={s.id} value={s.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3">
                <CustomSelect
                  label="Статус лида"
                  value={detailForm.status}
                  onChange={(val) => setDetailForm(prev => prev ? ({ ...prev, status: val }) : null)}
                  isCompact={true}
                  hasWallpaper={false}
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
                    isCompact={true}
                    hasWallpaper={false}
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
              <div className="p-4 bg-muted/20 border border-border/50 rounded-2xl space-y-3 mt-4">
                <span className="text-[11px] font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>Следующий шаг визита/звонка</span>
                </span>
                
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="date"
                    value={nextStepDateInput}
                    onChange={(e) => setNextStepDateInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-border/50 rounded-xl text-[13px] text-white focus:outline-none focus:border-primary/50"
                  />
                  <input
                    type="time"
                    value={nextStepTimeInput}
                    onChange={(e) => setNextStepTimeInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-border/50 rounded-xl text-[13px] text-white focus:outline-none focus:border-primary/50"
                  />
                </div>

                {nextStepDateInput && (
                  <div className="pt-3.5 border-t border-border/50 space-y-3">
                    <label className="text-[11px] text-muted-foreground font-semibold uppercase tracking-wider">Напоминания в Telegram</label>
                    <div className="flex items-center gap-4">
                      {[10, 20, 30].map(minutes => {
                        const checked = detailForm.notifyBefore?.includes(minutes) || false;
                        return (
                          <AnimatedCheckbox
                            key={minutes}
                            checked={checked}
                            onChange={() => handleToggleNotifyBefore(minutes)}
                            label={`За ${minutes} мин.`}
                            textClassName="text-white/80 font-medium text-[13px]"
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

            </div>

              {/* Поле заметки */}
              <div className="space-y-2 pt-3">
                <label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>Заметка</span>
                </label>
                <textarea
                  value={detailForm.notes || ""}
                  onChange={(e) => setDetailForm(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                  placeholder="Введите заметку..."
                  rows={3}
                  className="w-full px-3.5 py-3 bg-muted/40 hover:bg-muted/60 text-white placeholder-white/20 border border-border/50 rounded-xl text-sm resize-none focus:outline-none focus:border-primary/50 transition-colors font-medium"
                />
              </div>

              {/* История изменений */}
              <div className="space-y-3 pt-5 pb-4">
                <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider pl-1 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5" />
                  <span>История операций</span>
                </span>

                <div className="space-y-4 px-1 custom-scrollbar max-h-[250px] overflow-y-auto">
                  {detailForm.history && detailForm.history.length > 0 ? (
                    [...detailForm.history].reverse().map((entry) => {
                      let icon = <ChevronLeft className="w-3 h-3 text-muted-foreground" />;
                      if (entry.type === "creation") icon = <Plus className="w-3 h-3 text-green-500" />;
                      else if (entry.type === "status") icon = <Tag className="w-3 h-3 text-blue-500" />;
                      else if (entry.type === "note") icon = <FileText className="w-3 h-3 text-amber-500" />;
                      else if (entry.type === "price" || entry.type === "service") icon = <Coins className="w-3 h-3 text-purple-500" />;

                      const time = new Date(entry.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
                      const date = new Date(entry.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });

                      return (
                        <div key={entry.id} className="flex gap-3 text-[13px]">
                          <div className="w-7 h-7 rounded-full bg-muted border border-border/50 flex items-center justify-center shrink-0">
                            {icon}
                          </div>
                          <div className="flex-1 min-w-0 pt-0.5">
                            <p className="leading-snug text-white/90 font-medium">{entry.text}</p>
                            <span className="text-[10.5px] text-muted-foreground font-medium block mt-1">
                              {date} в {time} {entry.author ? `• ${entry.author.split("@")[0]}` : ""}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-5 text-[12px] text-muted-foreground italic font-medium">
                      История пуста
                    </div>
                  )}
                </div>
              </div>

              {/* Удалить карточку */}
              <div className="flex justify-center pt-6 pb-2">
                <button
                  type="button"
                  onClick={() => handleDeleteLead(detailForm.id)}
                  className="text-[12px] font-bold uppercase tracking-wider flex items-center gap-2 px-5 py-2.5 rounded-xl text-red-500/80 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Удалить карточку клиента</span>
                </button>
              </div>



          </div>
        )}
      </RightDrawer>

    </div>
  );
};

export default CrmPage;
