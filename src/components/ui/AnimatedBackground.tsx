import { motion } from 'framer-motion';

const AnimatedBackground = () => {
  return (
    <div className="absolute inset-0 z-0 overflow-hidden bg-slate-900">

      {/* Blob 1: Purple/Blue - brighter and larger */}
      <motion.div
        className="absolute top-[-10%] left-[-10%] h-[600px] w-[600px] rounded-full bg-purple-500/40 blur-[100px]"
        animate={{
          x: [0, 100, 0],
          y: [0, 50, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />

      {/* Blob 2: Cyan/Teal - brighter */}
      <motion.div
        className="absolute top-[20%] right-[-10%] h-[500px] w-[500px] rounded-full bg-cyan-400/30 blur-[100px]"
        animate={{
          x: [0, -100, 0],
          y: [0, 100, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 2,
        }}
      />

      {/* Blob 3: Rose/Pink - brighter */}
      <motion.div
        className="absolute bottom-[-10%] left-[20%] h-[700px] w-[700px] rounded-full bg-pink-500/30 blur-[120px]"
        animate={{
          x: [0, 50, 0],
          y: [0, -50, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{
          duration: 30,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 4,
        }}
      />

       {/* Blob 4: Indigo (center-ish) - brighter */}
       <motion.div
        className="absolute top-[40%] left-[40%] h-[400px] w-[400px] rounded-full bg-indigo-500/30 blur-[100px]"
        animate={{
          x: [0, -30, 0],
          y: [0, 30, 0],
          scale: [1, 1.4, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: "easeInOut",
          delay: 1,
        }}
      />
    </div>
  );
};

export default AnimatedBackground;
