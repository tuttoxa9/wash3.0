import { type Variants, motion, useInView } from "framer-motion";
import { useRef } from "react";

interface BlurFadeProps {
  children: React.ReactNode;
  className?: string;
  variant?: {
    hidden: { y: number };
    visible: { y: number };
  };
  duration?: number;
  delay?: number;
  yOffset?: number;
  inView?: boolean;
  inViewMargin?: string;
  blur?: string;
  scale?: number;
}

export default function BlurFade({
  children,
  className,
  variant,
  duration = 0.5,
  delay = 0,
  yOffset = 10,
  inView = false,
  inViewMargin = "-50px",
  blur = "10px",
  scale = 0.95,
}: BlurFadeProps) {
  const ref = useRef(null);
  const inViewResult = useInView(ref, {
    once: true,
    margin: inViewMargin as any,
  });
  const isInView = !inView || inViewResult;
  const defaultVariants: Variants = {
    hidden: { y: yOffset, opacity: 0, filter: `blur(${blur})`, scale },
    visible: { y: 0, opacity: 1, filter: "blur(0px)", scale: 1 },
  };
  const combinedVariants = variant || defaultVariants;
  return (
    <motion.div
      ref={ref}
      initial="hidden"
      animate={isInView ? "visible" : "hidden"}
      exit="hidden"
      variants={combinedVariants}
      transition={{
        delay: 0.04 + delay,
        duration,
        ease: [0.16, 1, 0.3, 1], // iOS-like spring easing
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
