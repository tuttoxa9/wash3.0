import { motion } from 'framer-motion';

interface GlowingLogoProps {
  className?: string;
}

export const GlowingLogo = ({ className }: GlowingLogoProps) => {
  return (
    <div className="relative flex items-center justify-center py-2 px-4 overflow-hidden rounded-xl">
      {/* 1. Rotating "Rays" (Conic Gradient) - subtle background effect */}
      <motion.div
        className="absolute inset-[-50%] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0deg,rgba(59,130,246,0.1)_60deg,transparent_120deg,rgba(139,92,246,0.1)_180deg,transparent_240deg,rgba(59,130,246,0.1)_300deg,transparent_360deg)] blur-xl"
        animate={{ rotate: 360 }}
        transition={{
          duration: 10,
          repeat: Number.POSITIVE_INFINITY,
          ease: "linear"
        }}
      />

      {/* 2. Moving Glow "Beam" (Left to Right) - brighter highlight */}
      <motion.div
        className="absolute -inset-full top-0 block h-full w-1/2 -skew-x-12 bg-gradient-to-r from-transparent to-white opacity-20 blur-md"
        initial={{ left: '-100%' }}
        animate={{ left: '200%' }}
        transition={{
          duration: 3,
          repeat: Number.POSITIVE_INFINITY,
          ease: "easeInOut",
          repeatDelay: 2
        }}
      />

      {/* 3. Pulse behind text */}
      <motion.div
         className="absolute inset-0 bg-blue-500/10 blur-xl rounded-full"
         animate={{ opacity: [0.3, 0.6, 0.3], scale: [0.9, 1.1, 0.9] }}
         transition={{
            duration: 4,
            repeat: Number.POSITIVE_INFINITY,
            ease: "easeInOut"
         }}
      />

      {/* 4. The Text itself */}
      <h1 className={`relative z-10 font-bold gradient-heading truncate tracking-wide drop-shadow-sm ${className || 'text-lg sm:text-xl'}`}>
        Detail Lab
      </h1>
    </div>
  );
};

export default GlowingLogo;
