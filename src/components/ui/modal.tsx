import type React from "react";
import { useEffect, useRef } from "react";
import BottomSheet from "./BottomSheet";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  clickPosition?: { x: number; y: number } | null;
  className?: string;
  title?: string;
  disableScroll?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  children,
  clickPosition = null,
  className = "",
  title,
  disableScroll = false,
}) => {
  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      className={className}
      title={title}
      disableScroll={disableScroll}
    >
      {children}
    </BottomSheet>
  );
};

export default Modal;
