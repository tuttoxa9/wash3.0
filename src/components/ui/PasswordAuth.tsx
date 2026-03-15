import { Loader2, Lock } from "lucide-react";
import type React from "react";
import { useState } from "react";

// Компонент для ввода пароля
const PasswordAuth: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    setTimeout(() => {
      if (password === import.meta.env.VITE_SETTINGS_PASSWORD) {
        setError("");
        onSuccess();
      } else {
        setError("Неверный пароль. Попробуйте еще раз.");
      }
      setIsLoading(false);
    }, 500);
  };

  return (
    <div className="max-w-md mx-auto mt-12 bg-card rounded-2xl border border-border/50 shadow-sm p-6 sm:p-8 animate-in fade-in zoom-in-95 duration-300">
      <div className="text-center mb-6">
        <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Lock className="w-6 h-6 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Доступ к разделу</h2>
        <p className="text-muted-foreground mt-2 text-sm">
          Введите пароль для доступа к информации
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="mb-5">
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Введите пароль"
            className="w-full px-4 py-2.5 bg-background border border-input rounded-xl focus:outline-none focus:ring-1 focus:ring-primary text-sm transition-colors"
            autoFocus
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
        </div>
        <button
          type="submit"
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-xl hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 text-sm font-medium"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Проверка...
            </>
          ) : (
            <>Войти</>
          )}
        </button>
      </form>
    </div>
  );
};

export default PasswordAuth;
