import { HelpCircle, X } from "lucide-react";
import type React from "react";
import { useState } from "react";
import BottomSheet from "./BottomSheet";

interface TooltipModalProps {
  title: string;
  content: string;
  children?: React.ReactNode;
  className?: string;
}

const TooltipModal: React.FC<TooltipModalProps> = ({
  title,
  content,
  children,
  className = "",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Иконка-триггер */}
      <button
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center justify-center w-4 h-4 rounded-full bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-800/40 text-blue-600 dark:text-blue-400 transition-colors ml-1 ${className}`}
        title="Как рассчитывается этот показатель?"
      >
        <HelpCircle className="w-3 h-3" />
      </button>

      {/* Модальное окно */}
      <BottomSheet isOpen={isOpen} onClose={() => setIsOpen(false)} title={title}>
        <div className="px-5 pb-6">
          {/* Контент */}
          <div className="text-sm text-foreground/80 leading-relaxed space-y-3">
            {content.split("\n\n").map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
            {children}
          </div>

          {/* Кнопка закрытия */}
          <div className="mt-6 text-center">
            <button
              onClick={() => setIsOpen(false)}
              className="px-6 py-2.5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors text-sm font-medium w-full"
            >
              Понятно
            </button>
          </div>
        </div>
      </BottomSheet>
    </>
  );
};

export default TooltipModal;
