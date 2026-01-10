import React from 'react';
import { Profile } from '../types';

interface Props {
  profiles: Profile[];
  onProfileClick: (id: string) => void;
}

export const Stories: React.FC<Props> = ({ profiles, onProfileClick }) => {
  const topProfiles = profiles.filter(p => p.isTop || p.isVerified).slice(0, 10);

  return (
    <div className="w-full overflow-x-auto no-scrollbar py-4 pl-4 space-x-4 flex">
      <div className="flex flex-col items-center space-y-1 cursor-pointer min-w-[64px]">
        <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-gold-400 to-red-500">
           <div className="w-full h-full rounded-full bg-dark-900 border-2 border-dark-900 flex items-center justify-center">
             <span className="text-2xl">🔥</span>
           </div>
        </div>
        <span className="text-[10px] text-white font-medium text-center">Горячее</span>
      </div>

      {topProfiles.map(profile => (
        <div 
          key={profile.id} 
          onClick={() => onProfileClick(profile.id)}
          className="flex flex-col items-center space-y-1 cursor-pointer min-w-[64px] group"
        >
          <div className="w-16 h-16 rounded-full p-[2px] bg-gradient-to-tr from-gold-400 to-transparent group-hover:from-gold-300 transition-all">
            <img 
              src={profile.images[0]} 
              alt={profile.name} 
              className="w-full h-full rounded-full object-cover border-2 border-dark-900"
            />
          </div>
          <span className="text-[10px] text-gray-300 group-hover:text-white transition-colors font-medium text-center truncate w-16">
            {profile.name}
          </span>
        </div>
      ))}
    </div>
  );
};