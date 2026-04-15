import type React from "react";
import { Drawer } from "vaul";

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  className?: string;
  /** If true, the sheet takes up to 95vh (for large content) */
  fullHeight?: boolean;
  /** Optional title displayed at top with drag handle */
  title?: string;
  /** If true, the outer container won't scroll automatically, letting children manage their own scrolling layout */
  disableScroll?: boolean;
}

const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  children,
  className = "",
  fullHeight = false,
  title,
  disableScroll = false,
}) => {
  return (
    <Drawer.Root
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      shouldScaleBackground
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-md z-50" />
        <Drawer.Content
          className={`bg-card text-card-foreground flex flex-col fixed z-[100] outline-none overflow-hidden
            md:h-fit md:max-h-[85vh]
            bottom-0 left-0 right-0 mx-auto w-[96vw] md:w-full rounded-t-[20px] max-h-[95dvh]
            ${fullHeight ? "h-[95dvh] md:h-fit" : ""}
            ${className}`}
        >
          {/* Drag handle */}
          <div className="flex justify-center pt-2.5 pb-1 shrink-0 md:hidden">
            <div className="w-12 h-1.5 rounded-full bg-foreground/20" />
          </div>

          {/* Title if provided */}
          {title && (
            <div className="px-5 pb-3 pt-4 md:pt-5 shrink-0">
              <Drawer.Title className="text-lg font-bold text-foreground">
                {title}
              </Drawer.Title>
            </div>
          )}

          {/* Content */}
          <div className={`flex flex-col min-h-0 w-full ${disableScroll ? "flex-1 overflow-hidden" : "flex-1 overflow-y-auto overflow-x-hidden p-safe"}`}>
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
};

export default BottomSheet;
