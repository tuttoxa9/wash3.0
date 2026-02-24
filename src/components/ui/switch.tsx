import React from 'react';
import { motion } from 'framer-motion';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  disabled?: boolean;
}

const Switch: React.FC<SwitchProps> = ({ checked, onChange, label, disabled = false }) => {
  return (
    <div
      className={`flex items-center gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      {label && <span className="text-sm font-medium text-foreground">{label}</span>}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        className={`relative w-11 h-6 rounded-full transition-all duration-200 ease-in-out border-2 shadow-inner ${
          checked
            ? 'bg-primary border-primary shadow-primary/20'
            : 'bg-muted border-border'
        }`}
      >
        <motion.div
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full shadow-md transition-colors duration-200 ${
            checked ? 'bg-white' : 'bg-slate-400 dark:bg-slate-500'
          }`}
          initial={false}
          animate={{ x: checked ? 20 : 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
        />
      </button>
    </div>
  );
};

export default Switch;
