import { useState, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";
import { useNavigate } from "react-router-dom";
import AnimatedBackground from "@/components/ui/AnimatedBackground";

const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { user, login } = useAuth();
  const navigate = useNavigate();

  // Если пользователь уже авторизован, перенаправляем на главную
  useEffect(() => {
    if (user) {
      navigate("/");
    }
  }, [user, navigate]);

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
      {/* Анимированный фон */}
      <AnimatedBackground />

      <div className="w-full max-w-md relative z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-light text-white tracking-wide drop-shadow-lg">
            Detail Lab
          </h1>
        </div>

        {/* Login Form */}
        <div className="bg-gray-900/30 backdrop-blur-xl rounded-2xl p-8 shadow-2xl border border-white/10">
          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/30 transition-all duration-200 backdrop-blur-sm"
              />
            </div>

            <div>
              <input
                type="password"
                placeholder="Пароль"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 bg-black/30 border border-white/20 rounded-xl text-white placeholder-gray-300 focus:outline-none focus:border-white/40 focus:ring-1 focus:ring-white/30 transition-all duration-200 backdrop-blur-sm"
              />
            </div>

            {error && (
              <div className="text-red-300 text-sm text-center bg-red-900/30 py-2 px-4 rounded-lg border border-red-500/30 backdrop-blur-sm">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-white text-black font-medium rounded-xl hover:bg-gray-100 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-white/50 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loading ? "Вход..." : "Войти"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
