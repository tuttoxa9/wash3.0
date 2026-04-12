import { AnimatePresence, motion } from "framer-motion";
import type React from "react";
import { useEffect, useRef, useState } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  clickPosition?: { x: number; y: number } | null;
  className?: string;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  clickPosition = null,
  className = "",
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState({ x: "50%", y: "50%" });

  // Устанавливаем точку начала анимации на основе позиции клика
  useEffect(() => {
    if (clickPosition) {
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      // Преобразуем абсолютную позицию клика в проценты относительно вьюпорта
      const originX = `${(clickPosition.x / viewportWidth) * 100}%`;
      const originY = `${(clickPosition.y / viewportHeight) * 100}%`;

      setOrigin({ x: originX, y: originY });
    } else {
      setOrigin({ x: "50%", y: "50%" });
    }
  }, [clickPosition]);

  // Блокировка скролла
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  // Закрытие модального окна по клику вне его области
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        modalRef.current &&
        !modalRef.current.contains(event.target as Node)
      ) {
        onClose();
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    // Добавляем обработчик только когда открыто модальное окно
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Обработка Ctrl+Enter для отправки форм
  useEffect(() => {
    function handleGlobalKeyDown(event: KeyboardEvent) {
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
        if (!isOpen) return;
        const submitButton = modalRef.current?.querySelector(
          'button[type="submit"]',
        ) as HTMLButtonElement;
        if (submitButton && !submitButton.disabled) {
          submitButton.click();
        }
      }
    }

    if (isOpen) {
      document.addEventListener("keydown", handleGlobalKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleGlobalKeyDown);
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-transparent"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {/* Фоновое затемнение с постепенным блюром */}
          <motion.div
            className="absolute inset-0 bg-black/40 dark:bg-black/60 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          />

          {/* Контент модального окна с анимацией появления из точки клика */}
          <motion.div
            ref={modalRef}
            className={`mobile-modal relative z-10 bg-card/90 dark:bg-card/80 backdrop-blur-xl border border-white/20 dark:border-white/10 text-card-foreground rounded-[32px] shadow-2xl w-full max-w-lg sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${className}`}
            style={{
              originX: origin.x,
              originY: origin.y,
            }}
            initial={{
              opacity: 0,
              scale: 0.85,
              y: 20,
            }}
            animate={{
              opacity: 1,
              scale: 1,
              y: 0,
            }}
            exit={{
              opacity: 0,
              scale: 0.95,
              y: 10,
            }}
            transition={{
              type: "spring",
              damping: 25,
              stiffness: 350,
              mass: 0.8,
            }}
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Modal;
