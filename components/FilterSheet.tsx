import React, { useState, useEffect } from 'react';
import { FilterState } from '../types';
import { CITIES, SERVICES_LIST, POPULAR_SERVICES, PREMIUM_SERVICES } from '../constants';
import { XIcon, ChevronDown, CheckIcon } from './Icons';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onApply: (filters: FilterState) => void;
  currentFilters: FilterState;
}

export const FilterSheet: React.FC<Props> = ({ isOpen, onClose, onApply, currentFilters }) => {
  const [localFilters, setLocalFilters] = useState<FilterState>(currentFilters);
  const [isCityExpanded, setIsCityExpanded] = useState(false);

  // Lock body scroll when filters are open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Also lock HTML for iOS momentum scrolling issues in some cases
      document.documentElement.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const toggleService = (service: string) => {
    const services = localFilters.services.includes(service)
      ? localFilters.services.filter(s => s !== service)
      : [...localFilters.services, service];
    setLocalFilters({ ...localFilters, services });
  };

  const selectServiceGroup = (serviceGroup: string[]) => {
    const allGroupSelected = serviceGroup.every(service => localFilters.services.includes(service));
    if (allGroupSelected) {
      // Убираем все услуги из группы
      const services = localFilters.services.filter(s => !serviceGroup.includes(s));
      setLocalFilters({ ...localFilters, services });
    } else {
      // Добавляем все услуги из группы
      const newServices = [...new Set([...localFilters.services, ...serviceGroup])];
      setLocalFilters({ ...localFilters, services: newServices });
    }
  };

  const handleCitySelect = (city: string) => {
    setLocalFilters({ ...localFilters, city });
    setIsCityExpanded(false);
  };

  const NumberInput = ({ label, value, onChange, placeholder }: { label?: string, value: number, onChange: (val: number) => void, placeholder: string }) => (
    <div className="flex-1 bg-dark-800 rounded-2xl border border-dark-700 focus-within:border-gold-500 focus-within:ring-1 focus-within:ring-gold-500/50 transition-all relative">
      <input 
        type="number" 
        value={value || ''}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full bg-transparent text-white text-center text-lg py-4 outline-none placeholder-gray-600"
        placeholder={placeholder}
      />
      {label && <span className="absolute top-1 left-0 right-0 text-center text-[10px] text-gray-500 uppercase font-bold">{label}</span>}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-dark-900 animate-slide-up overflow-hidden">
      <style>{`
        /* Remove default arrow for number inputs */
        input[type=number]::-webkit-inner-spin-button, 
        input[type=number]::-webkit-outer-spin-button { 
          -webkit-appearance: none; 
          margin: 0; 
        }
        input[type=number] {
          -moz-appearance: textfield;
        }
      `}</style>

      {/* Header */}
      <div className="flex-none flex items-center justify-between p-5 border-b border-dark-700 bg-dark-800">
        <h2 className="text-xl font-bold text-white tracking-wide">Фильтры</h2>
        <button 
          onClick={onClose} 
          className="p-2 -mr-2 text-gray-400 hover:text-white transition-colors"
        >
          <XIcon className="w-6 h-6" />
        </button>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto no-scrollbar bg-dark-900 p-5 space-y-8 pb-10">
        
        {/* City Selector */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Город</label>
          <div className="bg-dark-800 rounded-2xl border border-dark-700 overflow-hidden">
            <button 
              onClick={() => setIsCityExpanded(!isCityExpanded)}
              className="w-full px-4 py-4 flex items-center justify-between hover:bg-dark-700/50 transition-colors"
            >
              <span className={`text-lg ${localFilters.city ? 'text-white' : 'text-gray-400'}`}>
                {localFilters.city || "Любой город"}
              </span>
              <ChevronDown className={`w-5 h-5 text-gray-500 transition-transform duration-300 ${isCityExpanded ? 'rotate-180' : ''}`} />
            </button>
            
            <div className={`overflow-hidden transition-all duration-300 ease-in-out ${isCityExpanded ? 'max-h-[60vh] border-t border-dark-700' : 'max-h-0'}`}>
              <div className="overflow-y-auto max-h-[60vh] bg-dark-800">
                <div 
                  onClick={() => handleCitySelect("")}
                  className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-dark-700 border-b border-dark-700/50 last:border-0"
                >
                  <span className="text-gray-300">Любой город</span>
                  {localFilters.city === "" && <CheckIcon className="w-5 h-5 text-gold-500" />}
                </div>
                {CITIES.map(city => (
                  <div 
                    key={city}
                    onClick={() => handleCitySelect(city)}
                    className="px-4 py-3 flex items-center justify-between cursor-pointer hover:bg-dark-700 border-b border-dark-700/50 last:border-0"
                  >
                    <span className={localFilters.city === city ? 'text-white font-medium' : 'text-gray-300'}>
                      {city}
                    </span>
                    {localFilters.city === city && <CheckIcon className="w-5 h-5 text-gold-500" />}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Age */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Возраст</label>
          <div className="flex items-center space-x-3">
             <NumberInput value={localFilters.minAge} onChange={v => setLocalFilters({...localFilters, minAge: v})} placeholder="18" label="От" />
             <span className="text-gray-600 font-medium">-</span>
             <NumberInput value={localFilters.maxAge} onChange={v => setLocalFilters({...localFilters, maxAge: v})} placeholder="60" label="До" />
          </div>
        </div>

        {/* Appearance Group */}
        <div>
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Параметры</label>
          <div className="space-y-4">
             {/* Height */}
             <div className="flex items-center space-x-3">
                <span className="text-gray-400 text-sm w-12">Рост</span>
                <NumberInput value={localFilters.minHeight} onChange={v => setLocalFilters({...localFilters, minHeight: v})} placeholder="140" label="От" />
                <NumberInput value={localFilters.maxHeight} onChange={v => setLocalFilters({...localFilters, maxHeight: v})} placeholder="210" label="До" />
             </div>
             {/* Weight */}
             <div className="flex items-center space-x-3">
                <span className="text-gray-400 text-sm w-12">Вес</span>
                <NumberInput value={localFilters.minWeight} onChange={v => setLocalFilters({...localFilters, minWeight: v})} placeholder="35" label="От" />
                <NumberInput value={localFilters.maxWeight} onChange={v => setLocalFilters({...localFilters, maxWeight: v})} placeholder="120" label="До" />
             </div>
             {/* Bust */}
             <div className="flex items-center space-x-3">
                <span className="text-gray-400 text-sm w-12">Грудь</span>
                <div className="flex-1 flex space-x-2 overflow-x-auto no-scrollbar">
                   {[1, 2, 3, 4, 5].map(size => (
                     <button
                        key={size}
                        onClick={() => setLocalFilters({...localFilters, minBust: localFilters.minBust === size ? 0 : size})}
                        className={`flex-1 min-w-[50px] py-3 rounded-xl font-bold border ${
                          localFilters.minBust === size 
                            ? 'bg-gold-500 border-gold-500 text-black' 
                            : 'bg-dark-800 border-dark-700 text-gray-400'
                        }`}
                     >
                       {size}+
                     </button>
                   ))}
                </div>
             </div>
          </div>
        </div>

        {/* Services Chips */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Услуги и пожелания</label>
              {localFilters.services.length > 0 && (
                <span className="bg-gold-500/20 text-gold-400 text-xs px-2 py-1 rounded-full font-medium">
                  {localFilters.services.length}
                </span>
              )}
            </div>
            <button
              onClick={() => {
                const allSelected = localFilters.services.length === SERVICES_LIST.length;
                setLocalFilters({
                  ...localFilters, 
                  services: allSelected ? [] : [...SERVICES_LIST]
                });
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                localFilters.services.length === SERVICES_LIST.length
                  ? 'bg-gold-500 text-black border-gold-500'
                  : 'bg-dark-800 text-gray-400 border-dark-700 hover:border-gray-500 hover:text-white'
              }`}
            >
              {localFilters.services.length === SERVICES_LIST.length ? 'Снять все' : 'Выбрать все'}
            </button>
          </div>
          
          {/* Quick Selection Buttons */}
          <div className="flex space-x-2 mb-4">
            <button
              onClick={() => selectServiceGroup(POPULAR_SERVICES)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                POPULAR_SERVICES.every(service => localFilters.services.includes(service))
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-dark-800 text-gray-400 border-dark-700 hover:border-blue-500 hover:text-blue-400'
              }`}
            >
              Популярные
            </button>
            <button
              onClick={() => selectServiceGroup(PREMIUM_SERVICES)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition-all duration-200 border ${
                PREMIUM_SERVICES.every(service => localFilters.services.includes(service))
                  ? 'bg-purple-500 text-white border-purple-500'
                  : 'bg-dark-800 text-gray-400 border-dark-700 hover:border-purple-500 hover:text-purple-400'
              }`}
            >
              Премиум
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {SERVICES_LIST.map(service => {
              const isActive = localFilters.services.includes(service);
              return (
                <button
                  key={service}
                  onClick={() => toggleService(service)}
                  className={`px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 border ${
                    isActive
                      ? 'bg-gold-500 text-black border-gold-500 shadow-lg shadow-gold-500/20 scale-[1.02]'
                      : 'bg-dark-800 text-gray-400 border-dark-700 hover:border-gray-500'
                  }`}
                >
                  {service}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex-none p-5 bg-dark-900 border-t border-dark-800 pb-8 safe-bottom">
        <div className="flex space-x-3">
          <button 
            onClick={() => {
               setLocalFilters({
                 city: '',
                 minAge: 18,
                 maxAge: 60,
                 minHeight: 140,
                 maxHeight: 210,
                 minWeight: 35,
                 maxWeight: 120,
                 minBust: 0,
                 services: []
               });
            }}
            className="px-6 py-4 bg-dark-800 text-gray-400 font-bold rounded-xl hover:text-white transition-colors"
          >
            Сбросить
          </button>
          <button 
            onClick={() => {
              onApply(localFilters);
              onClose();
            }}
            className="flex-1 bg-gradient-to-r from-gold-400 to-gold-600 text-black font-bold py-4 rounded-xl text-lg shadow-lg shadow-gold-500/20 active:scale-[0.98] transition-transform"
          >
            Применить
          </button>
        </div>
      </div>
    </div>
  );
};