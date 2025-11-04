import type React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Clipboard, BarChart, Settings } from 'lucide-react';

const Dockbar: React.FC = () => {
  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-background border-t border-border/40 shadow-lg z-50">
      <nav className="flex justify-around items-center h-16">
        <NavLink
          to="/"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`
          }
          end
        >
          <Home className="w-5 h-5 mb-1" />
          <span>Главная</span>
        </NavLink>
        <NavLink
          to="/records"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`
          }
        >
          <Clipboard className="w-5 h-5 mb-1" />
          <span>Записи</span>
        </NavLink>
        <NavLink
          to="/reports"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`
          }
        >
          <BarChart className="w-5 h-5 mb-1" />
          <span>Отчеты</span>
        </NavLink>
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `flex flex-col items-center justify-center w-full h-full text-xs font-medium transition-colors ${
              isActive ? 'text-primary' : 'text-muted-foreground'
            }`
          }
        >
          <Settings className="w-5 h-5 mb-1" />
          <span>Настройки</span>
        </NavLink>
      </nav>
    </div>
  );
};

export default Dockbar;
