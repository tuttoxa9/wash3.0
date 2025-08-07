import type React from 'react';
import { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

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
  className = ""
}) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState({ x: '50%', y: '50%' });

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
      setOrigin({ x: '50%', y: '50%' });
    }
  }, [clickPosition]);

  // Закрытие модального окна по клику вне его области
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    }

    // Добавляем обработчик только когда открыто модальное окно
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

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
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            animate={{ opacity: 1, backdropFilter: 'blur(4px)' }}
            exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
            transition={{ duration: 0.3 }}
          />

          {/* Контент модального окна с анимацией появления из точки клика */}
          <motion.div
            ref={modalRef}
            className={`mobile-modal relative z-10 bg-card text-card-foreground rounded-2xl shadow-lg w-full max-w-lg sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${className}`}
            style={{
              originX: origin.x,
              originY: origin.y
            }}
            initial={{
              opacity: 0,
              scale: 0.5
            }}
            animate={{
              opacity: 1,
              scale: 1
            }}
            exit={{
              opacity: 0,
              scale: 0.75
            }}
            transition={{
              type: "spring",
              damping: 20,
              stiffness: 300
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
