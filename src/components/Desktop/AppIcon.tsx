import { motion } from "framer-motion";
import type React from "react";

interface AppIconProps {
  icon: React.ReactNode;
  label: string;
  color: string; // Tailwind gradient classes for icon glow
  onClick: () => void;
  disabled?: boolean;
}

const AppIcon: React.FC<AppIconProps> = ({ icon, label, color, onClick, disabled }) => {
  return (
    <motion.div
      className="flex flex-col items-center gap-2.5 cursor-pointer select-none group"
      onClick={onClick}
      whileHover={{ scale: disabled ? 1 : 1.06 }}
      whileTap={{ scale: disabled ? 1 : 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      role="button"
      aria-label={label}
    >
      {/* Icon card */}
      <div className="relative">
        {/* Glow behind icon */}
        <div
          className={`absolute inset-0 rounded-[22px] blur-[18px] opacity-0 group-hover:opacity-70 transition-opacity duration-300 ${color}`}
        />
        {/* Glass card */}
        <div
          className="relative w-[88px] h-[88px] rounded-[22px] flex items-center justify-center
            bg-white/[0.07] backdrop-blur-[16px]
            border border-white/[0.12]
            shadow-[0_8px_32px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.08)]
            group-hover:bg-white/[0.11] group-hover:border-white/[0.2]
            group-hover:shadow-[0_12px_40px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.12)]
            transition-all duration-300"
        >
          {/* Top shine */}
          <div className="absolute top-0 left-0 right-0 h-[45%] rounded-t-[22px] bg-gradient-to-b from-white/[0.07] to-transparent pointer-events-none" />
          <div className="relative z-10 flex items-center justify-center">
            {icon}
          </div>
        </div>
      </div>

      {/* Label */}
      <span
        className="text-[11px] font-medium text-white/80 group-hover:text-white transition-colors duration-200
          px-2 py-0.5 rounded-md
          drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]"
        style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
      >
        {label}
      </span>
    </motion.div>
  );
};

export default AppIcon;
