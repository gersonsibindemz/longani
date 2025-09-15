
import React from 'react';
import { SunIcon, MoonIcon } from './Icons';
import type { Theme } from '../App';

interface ThemeSwitcherProps {
  setTheme: (theme: Theme) => void;
  isEffectivelyDark: boolean;
}

export const ThemeSwitcher: React.FC<ThemeSwitcherProps> = ({ setTheme, isEffectivelyDark }) => {
  const handleThemeChange = () => {
    // This button will now only toggle between light and dark modes.
    // It will override the 'system' preference if it was active.
    setTheme(isEffectivelyDark ? 'light' : 'dark');
  };
  
  const { icon, label } = isEffectivelyDark
    ? { icon: <MoonIcon className="w-5 h-5" />, label: 'Mudar para modo Claro' }
    : { icon: <SunIcon className="w-5 h-5" />, label: 'Mudar para modo Escuro' };

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
