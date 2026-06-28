import type React from "react";
import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { Toaster } from "sonner";
import { useOkleykaContext } from "@/lib/context/OkleykaContext";
import {
  House,
  ClipboardText,
  ChartBar,
  Wallet as WalletCardsIcon,
  Warning,
  Gear,
  List,
  X,
  ArrowLeft,
  Calendar,
} from "@phosphor-icons/react";
import { motion, AnimatePresence } from "framer-motion";

// Navigation items
const navItems = [
  { to: "/okleyka", label: "Главная", icon: House, exact: true },
  { to: "/okleyka/orders", label: "Заказы", icon: ClipboardText, exact: false },
  { to: "/okleyka/appointments", label: "Записи", icon: Calendar, exact: false },
  { to: "/okleyka/reports", label: "Отчёты", icon: ChartBar, exact: false },
  { to: "/okleyka/payouts", label: "Выплаты", icon: WalletCardsIcon, exact: false },
  { to: "/okleyka/unpaid", label: "Неоплаченные", icon: Warning, exact: false, badge: true },
  { to: "/okleyka/settings", label: "Настройки", icon: Gear, exact: false },
];

const OkleykaLayout: React.FC = () => {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const navigate = useNavigate();
  const { state } = useOkleykaContext();
  const unpaidCount = state.unpaidWorkersCount;

  return (
    <div className="h-[100dvh] bg-black overflow-hidden relative">
      <div vaul-drawer-wrapper="" className="flex h-full bg-background">

        {/* ── Desktop Sidebar ── */}
        <aside className="hidden md:flex flex-col w-[220px] h-full bg-card border-r border-border/50 flex-shrink-0 py-5 px-3 gap-1">
          {/* Back to desktop */}
          <button
            onClick={() => navigate("/")}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-muted-foreground hover:text-foreground hover:bg-accent text-xs font-medium transition-colors mb-3"
          >
            <ArrowLeft size={14} />
            На рабочий стол
          </button>

          {/* Logo */}
          <div className="px-3 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center flex-shrink-0">
                <span className="text-purple-300 text-[10px] font-bold">ОК</span>
              </div>
              <span className="text-sm font-bold text-foreground">Оклейка</span>
            </div>
          </div>

          {/* Nav links */}
          {navItems.map(({ to, label, icon: Icon, exact, badge }) => (
            <NavLink
              key={to}
              to={to}
              end={exact}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all relative ${
                  isActive
                    ? "bg-purple-500/15 text-purple-400 border border-purple-400/20"
                    : "text-muted-foreground hover:text-foreground hover:bg-accent"
                }`
              }
            >
              <Icon size={18} weight="duotone" />
              <span className="flex-1">{label}</span>
              {badge && unpaidCount > 0 && (
                <span className="absolute right-2 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
                  {unpaidCount > 99 ? "99+" : unpaidCount}
                </span>
              )}
            </NavLink>
          ))}
        </aside>

        {/* ── Main content ── */}
        <main className="flex-1 overflow-auto flex flex-col">
          {/* Mobile header */}
          <div className="md:hidden sticky top-0 bg-background/95 backdrop-blur-sm z-20 border-b border-border/20">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                onClick={() => navigate("/")}
                className="p-2 -ml-1 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft size={20} />
              </button>

              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                  <span className="text-purple-300 text-[9px] font-bold">ОК</span>
                </div>
                <span className="text-sm font-bold text-foreground">Оклейка</span>
              </div>

              <button
                onClick={() => setMobileNavOpen(true)}
                className="p-2 -mr-1 rounded-xl text-muted-foreground hover:text-foreground transition-colors relative"
              >
                <List size={20} />
                {unpaidCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center">
                    {unpaidCount > 9 ? "9+" : unpaidCount}
                  </span>
                )}
              </button>
            </div>
          </div>

          {/* Page content */}
          <div className="flex-1 p-3 sm:p-4 md:p-6">
            <div className="w-full md:max-w-5xl md:mx-auto">
              <Outlet />
            </div>
          </div>
        </main>

        {/* ── Mobile nav drawer ── */}
        <AnimatePresence>
          {mobileNavOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-black/50 md:hidden"
                onClick={() => setMobileNavOpen(false)}
              />
              <motion.div
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="fixed right-0 top-0 bottom-0 w-72 bg-card border-l border-border z-50 flex flex-col py-5 px-3 gap-1 md:hidden"
              >
                <div className="flex items-center justify-between px-2 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/20 border border-purple-400/30 flex items-center justify-center">
                      <span className="text-purple-300 text-[10px] font-bold">ОК</span>
                    </div>
                    <span className="text-sm font-bold text-foreground">Оклейка</span>
                  </div>
                  <button
                    onClick={() => setMobileNavOpen(false)}
                    className="p-1.5 rounded-xl text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X size={18} />
                  </button>
                </div>

                {navItems.map(({ to, label, icon: Icon, exact, badge }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={exact}
                    onClick={() => setMobileNavOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all relative ${
                        isActive
                          ? "bg-purple-500/15 text-purple-400 border border-purple-400/20"
                          : "text-muted-foreground hover:text-foreground hover:bg-accent"
                      }`
                    }
                  >
                    <Icon size={20} weight="duotone" />
                    <span className="flex-1">{label}</span>
                    {badge && unpaidCount > 0 && (
                      <span className="min-w-[20px] h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5 animate-pulse">
                        {unpaidCount > 99 ? "99+" : unpaidCount}
                      </span>
                    )}
                  </NavLink>
                ))}

                <div className="mt-auto pt-4 border-t border-border/50">
                  <button
                    onClick={() => { navigate("/"); setMobileNavOpen(false); }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
                  >
                    <ArrowLeft size={18} />
                    На рабочий стол
                  </button>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        <Toaster position="top-right" richColors />
      </div>
    </div>
  );
};

export default OkleykaLayout;
