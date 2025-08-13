import React, { useState } from 'react';
import { X, HelpCircle } from 'lucide-react';

interface TooltipModalProps {
  title: string;
  content: string;
  children?: React.ReactNode;
  className?: string;
}

const TooltipModal: React.FC<TooltipModalProps> = ({ title, content, children, className = "" }) => {
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
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop с блюром */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          />

          {/* Модальное окно */}
          <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 p-6 m-4 max-w-md w-full max-h-[80vh] overflow-y-auto">
            {/* Заголовок */}
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 pr-4">
                {title}
              </h3>
              <button
                onClick={() => setIsOpen(false)}
                className="flex-shrink-0 p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Контент */}
            <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed space-y-3">
              {content.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
              {children}
            </div>

            {/* Кнопка закрытия */}
            <div className="mt-6 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
              >
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default TooltipModal;
