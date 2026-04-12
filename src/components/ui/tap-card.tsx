import { motion } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";

interface TapCardProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  className?: string;
  scaleDown?: number;
}

export default function TapCard({
  children,
  className,
  scaleDown = 0.97,
  ...props
}: TapCardProps) {
  return (
    <motion.div
      whileTap={{ scale: scaleDown }}
      transition={{
        type: "spring",
        stiffness: 400,
        damping: 25,
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
}
