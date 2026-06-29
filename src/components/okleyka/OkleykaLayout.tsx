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
        <aside className="hidden md:flex sidebar w-64 min-w-[16rem] h-[100dvh] bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] p-4 border-r border-border/40 shadow-xl overflow-hidden transition-all duration-300 z-0">
          <div className="flex flex-col h-full relative w-full">
            {/* Logo header */}
            <div className="flex items-center justify-between mb-6 sm:mb-8 md:px-3 md:mt-2 relative">
              <div className="flex items-center justify-start relative group">
                <div className="absolute inset-0 bg-blue-500/10 dark:bg-blue-500/30 black:bg-blue-500/50 blur-[25px] rounded-full scale-[1.3] md:scale-[1.6] z-[-1] pointer-events-none translate-y-1 md:translate-y-2 opacity-100 dark:opacity-40 transition-opacity duration-1000 ease-in"></div>
                <div className="bg-transparent dark:bg-transparent black:bg-zinc-950 px-3 py-1.5 rounded-xl shadow-sm dark:shadow-none border border-transparent dark:border-transparent black:border-zinc-800/50 transition-colors select-none pointer-events-none relative z-10">
                  <img src="/logo.png" alt="Detail Lab" className="h-6 md:h-7 w-auto object-contain select-none pointer-events-none" draggable="false" />
                </div>
              </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-2 overflow-y-auto overflow-x-hidden min-h-0 custom-scrollbar pr-1">
              <button
                onClick={() => navigate("/")}
                className="sidebar-link w-full text-left"
              >
                <ArrowLeft className="w-5 h-5" />
                <span>На рабочий стол</span>
              </button>

              {navItems.map(({ to, label, icon: Icon, exact, badge }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={exact}
                  className={({ isActive }) =>
                    `sidebar-link ${isActive ? "active" : ""}`
                  }
                >
                  <Icon className="w-5 h-5" weight="duotone" />
                  <span className="flex-1">{label}</span>
                  {badge && unpaidCount > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
                      {unpaidCount > 99 ? "99+" : unpaidCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
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

              <div className="absolute left-1/2 -translate-x-1/2 flex items-center justify-center group">
                <div className="bg-transparent px-3 py-1.5 rounded-xl transition-colors select-none pointer-events-none relative z-10">
                  <img src="/logo.png" alt="Detail Lab" className="h-5 w-auto object-contain select-none pointer-events-none" draggable="false" />
                </div>
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
            <div className="w-full md:max-w-6xl md:mx-auto">
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
                className="fixed right-0 top-0 bottom-0 w-72 bg-[hsl(var(--sidebar-background))] text-[hsl(var(--sidebar-foreground))] border-l border-border z-50 flex flex-col py-5 px-3 gap-1 md:hidden shadow-xl"
              >
                <div className="flex items-center justify-between px-2 mb-4">
                  <div className="bg-transparent px-3 py-1.5 select-none pointer-events-none">
                    <img src="/logo.png" alt="Detail Lab" className="h-5 w-auto object-contain" draggable="false" />
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
                      `sidebar-link ${isActive ? "active" : ""}`
                    }
                  >
                    <Icon className="w-5 h-5" weight="duotone" />
                    <span className="flex-1">{label}</span>
                    {badge && unpaidCount > 0 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 min-w-[18px] h-[18px] rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1 animate-pulse">
                        {unpaidCount > 99 ? "99+" : unpaidCount}
                      </span>
                    )}
                  </NavLink>
                ))}

                <div className="mt-auto pt-4 border-t border-border/50">
                  <button
                    onClick={() => { navigate("/"); setMobileNavOpen(false); }}
                    className="sidebar-link w-full text-left"
                  >
                    <ArrowLeft className="w-5 h-5" />
                    <span>На рабочий стол</span>
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
