import AnimatedBackground from "@/components/ui/AnimatedBackground";
import { useAuth } from "@/lib/context/AuthContext";
import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Refs for seamless mobile background video cross-fading
  const videoARef = useRef<HTMLVideoElement>(null);
  const videoBRef = useRef<HTMLVideoElement>(null);
  const isFirstPlay = useRef(true);

  // Если пользователь уже авторизован, перенаправляем на главную
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

  const handleTimeUpdateA = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoA = e.currentTarget;
    const videoB = videoBRef.current;
    if (!videoB) return;
    
    const duration = videoA.duration;
    const currentTime = videoA.currentTime;
    if (!duration) return;
    
    const crossFadeDuration = 1.5;
    const maxOpacity = 0.25;
    
    // First time load: fade in from 0
    if (isFirstPlay.current && currentTime < 1.0) {
      videoA.style.opacity = ((currentTime / 1.0) * maxOpacity).toString();
      return;
    } else if (isFirstPlay.current && currentTime >= 1.0) {
      isFirstPlay.current = false;
      videoA.style.opacity = maxOpacity.toString();
    }
    
    // Near the end of video A: start playing B and cross-fade
    if (currentTime > duration - crossFadeDuration) {
      if (videoB.paused) {
        videoB.currentTime = 0;
        videoB.play().catch(() => {});
      }
      const progress = (currentTime - (duration - crossFadeDuration)) / crossFadeDuration;
      videoA.style.opacity = (maxOpacity * (1 - progress)).toString();
      videoB.style.opacity = (maxOpacity * progress).toString();
    }
  };

  const handleEndedA = () => {
    const videoA = videoARef.current;
    const videoB = videoBRef.current;
    if (!videoA || !videoB) return;
    
    videoA.pause();
    videoA.currentTime = 0;
    videoA.style.opacity = "0";
    videoB.style.opacity = "0.25";
  };

  const handleTimeUpdateB = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const videoB = e.currentTarget;
    const videoA = videoARef.current;
    if (!videoA) return;
    
    const duration = videoB.duration;
    const currentTime = videoB.currentTime;
    if (!duration) return;
    
    const crossFadeDuration = 1.5;
    const maxOpacity = 0.25;
    
    // Near the end of video B: start playing A and cross-fade
    if (currentTime > duration - crossFadeDuration) {
      if (videoA.paused) {
        videoA.currentTime = 0;
        videoA.play().catch(() => {});
      }
      const progress = (currentTime - (duration - crossFadeDuration)) / crossFadeDuration;
      videoB.style.opacity = (maxOpacity * (1 - progress)).toString();
      videoA.style.opacity = (maxOpacity * progress).toString();
    }
  };

  const handleEndedB = () => {
    const videoB = videoBRef.current;
    const videoA = videoARef.current;
    if (!videoB || !videoA) return;
    
    videoB.pause();
    videoB.currentTime = 0;
    videoB.style.opacity = "0";
    videoA.style.opacity = "0.25";
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const { error } = await login({ email, password });
      if (error) throw error;
      navigate("/");
    } catch (error: any) {
      setError("Неверный email или пароль");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background video A for mobile only */}
      <video
        ref={videoARef}
        src="/main.mp4"
        autoPlay
        muted
        playsInline
        onTimeUpdate={handleTimeUpdateA}
        onEnded={handleEndedA}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 block md:hidden transition-opacity duration-300"
        style={{ opacity: 0 }}
      />

      {/* Background video B for mobile only */}
      <video
        ref={videoBRef}
        src="/main.mp4"
        muted
        playsInline
        onTimeUpdate={handleTimeUpdateB}
        onEnded={handleEndedB}
        className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 block md:hidden transition-opacity duration-300"
        style={{ opacity: 0 }}
      />
      
      {/* Dark overlay for mobile video background */}
      <div className="absolute inset-0 bg-black/30 pointer-events-none z-[1] block md:hidden" />

      {/* Анимированный фон для десктопа */}
      <div className="hidden md:block">
        <AnimatedBackground />
      </div>

      <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-500/10 black:bg-blue-500/15 blur-[60px] rounded-full scale-[1.2] z-[-1] pointer-events-none"></div>

      <div className="w-full max-w-[280px] bg-white/[0.03] dark:bg-black/25 backdrop-blur-[32px] rounded-3xl p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.5)] relative z-10 border-0 text-white flex flex-col gap-4">
        {/* Logo */}
        <div className="text-center flex flex-col items-center gap-1 mb-1">
          <img src="/logo.png" alt="Detail Lab" className="h-10 w-auto object-contain drop-shadow-md select-none pointer-events-none" draggable="false" />
          <p className="text-[9px] text-white/40 mt-1">Авторизация</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-3">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3.5 py-2 bg-white/[0.04] dark:bg-black/35 backdrop-blur-[12px] rounded-2xl text-white placeholder-white/20 text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all border-0"
          />

          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3.5 py-2 bg-white/[0.04] dark:bg-black/35 backdrop-blur-[12px] rounded-2xl text-white placeholder-white/20 text-xs focus:outline-none focus:ring-1 focus:ring-white/10 transition-all border-0"
          />

          {error && (
            <div className="text-red-350 text-[10px] text-center bg-red-950/20 py-2 px-3 rounded-2xl border-0">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 mt-1 bg-white/[0.14] hover:bg-white/[0.22] active:bg-white/[0.28] active:scale-[0.97] backdrop-blur-[8px] transition-all text-xs font-bold rounded-2xl text-white shadow-[inset_0_1px_0_0_rgba(255,255,255,0.15),0_4px_15px_rgba(0,0,0,0.2)] border-0"
          >
            {loading ? "Вход..." : "Войти"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
