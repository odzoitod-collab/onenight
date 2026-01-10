import React from 'react';
import { HomeIcon, HeartIcon, MenuIcon } from './Icons';
import { ViewState } from '../types';

interface Props {
  currentView: ViewState;
  onChange: (view: ViewState) => void;
}

export const BottomNav: React.FC<Props> = ({ currentView, onChange }) => {
  const NavItem = ({ view, icon: Icon, label }: { view: ViewState, icon: any, label: string }) => {
    const isActive = currentView === view;
    return (
      <button 
        onClick={() => onChange(view)}
        className={`flex flex-col items-center justify-center space-y-1 w-full h-full transition-colors duration-200 ${isActive ? 'text-gold-500' : 'text-gray-500 hover:text-gray-300'}`}
      >
        <Icon className="w-6 h-6" fill={isActive} />
        <span className="text-[10px] font-medium tracking-wide">{label}</span>
      </button>
    );
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 h-16 bg-dark-900/90 backdrop-blur-lg border-t border-dark-800 z-50 max-w-md mx-auto">
      <div className="grid grid-cols-3 h-full">
        <NavItem view="HOME" icon={HomeIcon} label="Главная" />
        <NavItem view="FAVORITES" icon={HeartIcon} label="Избранное" />
        <NavItem view="MORE" icon={MenuIcon} label="Меню" />
      </div>
    </div>
  );
};