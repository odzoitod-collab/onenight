import React from 'react';
import { Profile } from '../types';
import { MapPinIcon, HeartIcon, VerifiedIcon } from './Icons';

interface Props {
  profile: Profile;
  onClick: (id: string) => void;
  isFavorite: boolean;
  onToggleFavorite: (e: React.MouseEvent, id: string) => void;
}

export const ProfileCard: React.FC<Props> = ({ profile, onClick, isFavorite, onToggleFavorite }) => {
  return (
    <div 
      onClick={() => onClick(profile.id)}
      className="relative group rounded-xl overflow-hidden bg-dark-800 shadow-lg cursor-pointer transform transition-all active:scale-[0.98] duration-300"
    >
      <div className="aspect-[3/4] w-full relative">
        <img 
          src={profile.images[0]} 
          alt={profile.name} 
          className="w-full h-full object-cover"
          loading="lazy"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-900/90 via-transparent to-transparent opacity-80" />
        
        {/* Top Badges */}
        <div className="absolute top-0 left-0 w-full p-2 flex justify-between items-start">
           <div className="flex space-x-1">
             {profile.isTop && (
              <div className="bg-gold-500/90 backdrop-blur-sm text-black text-[10px] font-bold px-2 py-1 rounded shadow-sm uppercase tracking-wider">
                TOP
              </div>
             )}
           </div>
          
          <button 
            onClick={(e) => onToggleFavorite(e, profile.id)}
            className="p-2 rounded-full bg-black/20 backdrop-blur-md hover:bg-black/40 transition-colors"
          >
            <HeartIcon className={`w-5 h-5 ${isFavorite ? 'text-red-500' : 'text-white'}`} fill={isFavorite} />
          </button>
        </div>

        <div className="absolute bottom-0 left-0 w-full p-3">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center space-x-1">
                <h3 className="text-lg font-bold text-white leading-tight">
                  {profile.name}, <span className="text-gold-400">{profile.age}</span>
                </h3>
                {profile.isVerified && <VerifiedIcon className="w-4 h-4" />}
              </div>
              <div className="flex items-center text-gray-300 text-xs mt-1">
                <MapPinIcon className="w-3 h-3 mr-1" />
                {profile.city}
              </div>
            </div>
            <div className="text-right">
              <span className="block text-white font-semibold text-base">{profile.price / 1000}к</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};