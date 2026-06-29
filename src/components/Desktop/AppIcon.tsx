import { motion } from "framer-motion";
import type React from "react";

interface AppIconProps {
  icon: React.ReactNode;
  label: string;
  gradient: string; // Tailwind gradient classes e.g. "from-blue-400 to-blue-600"
  onClick: () => void;
  disabled?: boolean;
}

const AppIcon: React.FC<AppIconProps> = ({ icon, label, gradient, onClick, disabled }) => {
  return (
    <motion.div
      className="flex flex-col items-center gap-2 cursor-pointer select-none group"
      onClick={onClick}
      whileHover={{ scale: disabled ? 1 : 1.08 }}
      whileTap={{ scale: disabled ? 1 : 0.93 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      role="button"
      aria-label={label}
    >
      <div className="relative">
        {/* Solid icon background */}
        <div
          className={`relative w-[88px] h-[88px] rounded-[22px] bg-gradient-to-br ${gradient} flex items-center justify-center
            shadow-[0_6px_24px_rgba(0,0,0,0.35),0_2px_6px_rgba(0,0,0,0.2)]`}
        >
          {/* Top highlight */}
          <div className="absolute top-0 left-0 right-0 h-[50%] rounded-t-[22px] bg-gradient-to-b from-white/30 to-transparent pointer-events-none" />
          <div className="relative z-10">{icon}</div>
        </div>
      </div>

      {/* Label */}
      <span
        className="text-[12px] font-semibold text-white"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9), 0 2px 8px rgba(0,0,0,0.6)" }}
      >
        {label}
      </span>
    </motion.div>
  );
};

export default AppIcon;
