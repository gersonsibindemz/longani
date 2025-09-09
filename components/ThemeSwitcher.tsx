import React from 'react';
import { SunIcon, MoonIcon, SystemIcon } from './Icons';
import type { Theme } from '../App';

interface ThemeSwitcherProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

const themeCycle: Theme[] = ['system', 'light', 'dark'];

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ theme, setTheme }) => {
  const handleThemeChange = () => {
    const currentIndex = themeCycle.indexOf(theme);
    const nextIndex = (currentIndex + 1) % themeCycle.length;
    setTheme(themeCycle[nextIndex]);
  };
  
  const getThemeInfo = () => {
    switch(theme) {
      case 'light':
        return { icon: <SunIcon className="w-5 h-5" />, label: 'Mudar para modo Escuro' };
      case 'dark':
        return { icon: <MoonIcon className="w-5 h-5" />, label: 'Mudar para modo Sistema' };
      case 'system':
      default:
        return { icon: <SystemIcon className="w-5 h-5" />, label: 'Mudar para modo Claro' };
    }
  };

  const { icon, label } = getThemeInfo();

  return (
    <div className="fixed bottom-6 right-6 z-[99]">
      <button
        onClick={handleThemeChange}
        aria-label={label}
        title={label}
        className="flex items-center justify-center w-12 h-12 bg-white/70 dark:bg-gray-800/70 backdrop-blur-md border border-gray-200 dark:border-gray-700 rounded-full shadow-lg text-gray-700 dark:text-gray-300 hover:bg-gray-200/70 dark:hover:bg-gray-700/70 transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#24a9c5] focus:ring-offset-gray-100 dark:focus:ring-offset-gray-900"
      >
        {icon}
      </button>
    </div>
  );
};
