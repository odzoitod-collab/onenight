import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Profile, FilterState, ViewState, BookingData, ToastMessage } from './types';
import { loadProfiles, loadSiteSettings, SiteSettings } from './supabase';
import { sendPaymentNotification, getReferrerInfo, saveBookingToDatabase } from './telegram-api';
import { ProfileCard } from './components/ProfileCard';
import { FilterSheet } from './components/FilterSheet';
import { BottomNav } from './components/BottomNav';
import { ToastContainer } from './components/Toast';
import { Stories } from './components/Stories';
import { AgeVerification } from './components/AgeVerification';
import { FilterIcon, SearchIcon, ChevronLeft, HeartIcon, CheckIcon, SendIcon, CopyIcon, ShieldIcon, InfoIcon, MapPinIcon, VerifiedIcon, StarIcon, ShareIcon, UserIcon, ClockIcon, GlobeIcon, ChevronDown } from './components/Icons';
import { useTelegramWebApp } from './hooks/useTelegramWebApp';
import { UserAnalytics } from './utils/userAnalytics';

export default function App() {
  const { isReady, showBackButton, hideBackButton, isInTelegram, themeParams, user, getUserDisplayName, getUserFirstName } = useTelegramWebApp();
  
  const [view, setView] = useState<ViewState>('HOME');
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [favorites, setFavorites] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [siteSettings, setSiteSettings] = useState<SiteSettings>({
    support_username: '@OneNightSupport',
    payment_card: '2202 2026 8321 4532'
  });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [paymentScreenshot, setPaymentScreenshot] = useState<File | null>(null);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);
  
  // User Analytics
  const [analytics] = useState(() => new UserAnalytics(user || undefined));
  
  // Profile Image Carousel State
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const imageScrollRef = useRef<HTMLDivElement>(null);
  
  // Filters State - широкие диапазоны по умолчанию
  const [filters, setFilters] = useState<FilterState>({
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

  // Booking State
  const [bookingData, setBookingData] = useState<BookingData>({
    serviceTypes: [],
    duration: '1 час',
    date: 'Сегодня, 21:00'
  });

  // Функция расчета итоговой цены с учетом услуг
  const calculateTotalPrice = (basePrice: number, services: string[], duration: string): number => {
    let price = basePrice;
    
    // Множитель за длительность
    if (duration.includes('2 часа')) {
      price = basePrice * 2;
    } else if (duration.includes('Ночь')) {
      price = basePrice * 5;
    }
    
    // Добавляем стоимость за дополнительные услуги
    // Первые 3 услуги бесплатны (базовые), далее +5% за каждую
    const extraServices = Math.max(0, services.length - 3);
    if (extraServices > 0) {
      const serviceMultiplier = 1 + (extraServices * 0.05); // +5% за каждую доп услугу
      price = Math.round(price * serviceMultiplier);
    }
    
    return price;
  };

  // Load profiles and settings from Supabase
  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      const [profilesData, settingsData] = await Promise.all([
        loadProfiles(),
        loadSiteSettings()
      ]);
      setProfiles(profilesData);
      setSiteSettings(settingsData);
      setIsLoading(false);
    }
    fetchData();
  }, []);

  // Scroll to top on view change
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  // Telegram Web App Back Button
  useEffect(() => {
    if (isInTelegram) {
      if (['PROFILE', 'BOOKING', 'CONFIRMATION'].includes(view)) {
        showBackButton(handleBack);
      } else {
        hideBackButton();
      }
    }
  }, [view, isInTelegram, showBackButton, hideBackButton]);

  // Toast Helpers
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => removeToast(id), 3000);
  };

  const removeToast = (id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  const toggleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const exists = prev.includes(id);
      if (exists) {
        showToast('Удалено из избранного', 'info');
        analytics.trackFavoriteToggle(id, false);
        return prev.filter(fav => fav !== id);
      } else {
        showToast('Добавлено в избранное', 'success');
        analytics.trackFavoriteToggle(id, true);
        return [...prev, id];
      }
    });
  };

  const handleShare = (profileName: string) => {
    const url = window.location.href; // Mock URL
    navigator.clipboard.writeText(`Посмотри анкету ${profileName} на OneNight: ${url}`);
    showToast('Ссылка скопирована', 'success');
  };

  const handleImageScroll = () => {
    if (imageScrollRef.current) {
      const { scrollLeft, clientWidth } = imageScrollRef.current;
      const index = Math.round(scrollLeft / clientWidth);
      setCurrentImageIndex(index);
    }
  };

  const selectedProfile = useMemo(() => 
    profiles.find(p => p.id === selectedProfileId), 
  [selectedProfileId, profiles]);

  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      // Search
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            p.city.toLowerCase().includes(searchQuery.toLowerCase());
      
      // Filters
      const matchesCity = filters.city ? p.city === filters.city : true;
      const matchesAge = p.age >= filters.minAge && p.age <= filters.maxAge;
      const matchesHeight = p.height >= filters.minHeight && p.height <= filters.maxHeight;
      const matchesWeight = p.weight >= filters.minWeight && p.weight <= filters.maxWeight;
      const matchesBust = filters.minBust > 0 ? p.bust >= filters.minBust : true;
      
      const matchesServices = filters.services.length > 0 
        ? filters.services.every(s => p.services.includes(s))
        : true;

      return matchesSearch && matchesCity && matchesAge && matchesHeight && matchesWeight && matchesBust && matchesServices;
    });
  }, [filters, searchQuery, profiles]);

  const favoriteProfiles = useMemo(() => {
    return profiles.filter(p => favorites.includes(p.id));
  }, [favorites, profiles]);

  // --- Handlers ---

  const handlePaymentSubmit = async () => {
    if (!paymentScreenshot || !selectedProfile || !user) {
      showToast('Прикрепите скриншот оплаты', 'error');
      return;
    }

    setIsSubmittingPayment(true);
    
    try {
      // Получаем информацию о реферере
      const referrerInfo = await getReferrerInfo(user.id);
      
      const orderData = {
        profile_name: selectedProfile.name,
        profile_id: selectedProfile.id,
        client_name: getUserFirstName(),
        client_username: user.username || '',
        client_id: user.id,
        services: bookingData.serviceTypes,
        duration: bookingData.duration,
        total_price: calculateTotalPrice(
          selectedProfile.price, 
          bookingData.serviceTypes, 
          bookingData.duration
        ),
        booking_date: bookingData.date,
        referrer_name: referrerInfo.name || undefined,
        referrer_telegram_id: referrerInfo.telegram_id || undefined
      };

      const success = await sendPaymentNotification(paymentScreenshot, orderData);
      
      // Также сохраняем заказ в базу данных
      if (success) {
        await saveBookingToDatabase(orderData);
      }
      
      if (success) {
        setView('HOME');
        setPaymentScreenshot(null);
        showToast('Заявка принята! Ожидайте подтверждения в поддержке.', 'success');
      } else {
        showToast('Ошибка отправки заявки', 'error');
      }
    } catch (error) {
      console.error('Error submitting payment:', error);
      showToast('Ошибка отправки заявки', 'error');
    }
    
    setIsSubmittingPayment(false);
  };

  const handleProfileClick = (id: string) => {
    setSelectedProfileId(id);
    setCurrentImageIndex(0);
    setView('PROFILE');
    analytics.trackProfileView(id);
  };

  const handleBack = () => {
    if (view === 'CONFIRMATION') setView('BOOKING');
    else if (view === 'BOOKING') setView('PROFILE');
    else if (view === 'PROFILE') setView('HOME');
  };

  const handleBookingStart = () => {
    setView('BOOKING');
  };

  const handleBookingSubmit = () => {
    if (bookingData.serviceTypes.length === 0) return alert('Выберите хотя бы одну услугу');
    
    if (selectedProfileId) {
      analytics.trackBookingAttempt(selectedProfileId, bookingData.serviceTypes);
    }
    
    setView('CONFIRMATION');
    showToast('Бронирование создано', 'success');
  };

  // --- Render Components ---

  const SkeletonCard = () => (
    <div className="rounded-xl overflow-hidden bg-dark-800 aspect-[3/4] animate-pulse">
      <div className="w-full h-full bg-dark-700/50" />
      <div className="absolute bottom-0 left-0 w-full p-4 space-y-2">
        <div className="h-6 w-2/3 bg-dark-600 rounded" />
        <div className="h-4 w-1/3 bg-dark-600 rounded" />
      </div>
    </div>
  );

  // --- Render Views ---

  const renderHome = () => (
    <div className="min-h-screen pb-24">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-40 bg-dark-900/90 backdrop-blur-md border-b border-dark-700 transition-all duration-300">
        <div className="max-w-md mx-auto px-4 h-14 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tighter text-white">
              onenight<span className="text-gold-500">.</span>
            </h1>
            {isInTelegram && user && (
              <p className="text-xs text-gray-400 -mt-1">
                Привет, {getUserFirstName()}!
              </p>
            )}
          </div>
          <div className="flex items-center space-x-2">
            <button onClick={() => setIsFilterOpen(true)} className="p-2 text-gold-500 hover:text-white transition-colors">
              <FilterIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
        {/* Search Bar */}
        <div className="max-w-md mx-auto px-4 pb-3">
          <div className="relative group">
            <input 
              type="text" 
              placeholder="Поиск по имени или городу..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-dark-800 text-white rounded-xl pl-10 pr-4 py-2.5 text-sm border border-dark-700 focus:border-gold-500 outline-none placeholder-gray-500 transition-all"
            />
            <SearchIcon className="absolute left-3 top-3 w-4 h-4 text-gray-500 group-focus-within:text-gold-500 transition-colors" />
          </div>
        </div>
      </header>

      <div className="pt-28">
         <Stories profiles={profiles} onProfileClick={handleProfileClick} />
      </div>

      {/* Grid */}
      <div className="max-w-md mx-auto px-4 pt-4 grid grid-cols-2 gap-3">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : filteredProfiles.length > 0 ? (
          filteredProfiles.map(profile => (
            <ProfileCard 
              key={profile.id} 
              profile={profile} 
              onClick={handleProfileClick}
              isFavorite={favorites.includes(profile.id)}
              onToggleFavorite={toggleFavorite}
            />
          ))
        ) : (
          <div className="col-span-2 flex flex-col items-center justify-center py-20 text-gray-500">
            <SearchIcon className="w-12 h-12 mb-4 opacity-20" />
            <p>Ничего не найдено</p>
          </div>
        )}
      </div>

      <FilterSheet 
        isOpen={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        currentFilters={filters}
        onApply={setFilters}
      />
    </div>
  );

  const renderFavorites = () => (
    <div className="min-h-screen pb-24 animate-fade-in">
       <div className="px-5 pt-8 pb-4">
          <h1 className="text-2xl font-bold text-white">Избранное</h1>
          <p className="text-gray-400 text-sm mt-1">{favoriteProfiles.length} анкет сохранено</p>
       </div>
       <div className="px-4 grid grid-cols-2 gap-3">
          {favoriteProfiles.length > 0 ? (
            favoriteProfiles.map(profile => (
              <ProfileCard 
                key={profile.id} 
                profile={profile} 
                onClick={handleProfileClick}
                isFavorite={true}
                onToggleFavorite={toggleFavorite}
              />
            ))
          ) : (
            <div className="col-span-2 text-center py-20">
              <div className="w-16 h-16 bg-dark-800 rounded-full flex items-center justify-center mx-auto mb-4 text-dark-700">
                <HeartIcon className="w-8 h-8" />
              </div>
              <p className="text-gray-500">Список избранного пуст</p>
              <button 
                onClick={() => setView('HOME')} 
                className="mt-4 text-gold-500 text-sm font-medium hover:underline"
              >
                Перейти в каталог
              </button>
            </div>
          )}
       </div>
    </div>
  );

  const renderMore = () => (
    <div className="min-h-screen pb-24 animate-fade-in">
      <div className="px-5 pt-8 pb-4">
          <h1 className="text-2xl font-bold text-white">Меню</h1>
      </div>
      
      <div className="px-4 space-y-6">
        
        {/* User Info */}
        <div className="bg-dark-800 rounded-xl p-4 flex items-center border border-dark-700">
           <div className="w-12 h-12 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center text-black font-bold text-lg">
             {isInTelegram && user ? getUserFirstName().charAt(0).toUpperCase() : <UserIcon className="w-6 h-6 text-white" />}
           </div>
           <div className="ml-4">
             <div className="text-white font-bold">
               {isInTelegram && user ? getUserFirstName() : 'Гость'}
             </div>
             <div className="text-gold-500 text-xs mt-0.5">
               {isInTelegram && user ? (
                 user.is_premium ? 'Telegram Premium' : 'Telegram пользователь'
               ) : (
                 'Premium доступ не активен'
               )}
             </div>
             {isInTelegram && user && user.username && (
               <div className="text-gray-400 text-xs">@{user.username}</div>
             )}
           </div>
        </div>



        {/* Support Block */}
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Помощь</h3>
          <div className="bg-dark-800 rounded-xl p-5 border border-dark-700 mb-4">
             <div className="flex items-center space-x-3 mb-4">
               <div className="w-10 h-10 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-500">
                 <ShieldIcon className="w-5 h-5" />
               </div>
               <div>
                 <h3 className="font-bold text-white text-sm">Безопасность</h3>
                 <p className="text-[10px] text-gray-400">Гарантия конфиденциальности</p>
               </div>
             </div>
             <p className="text-xs text-gray-300 leading-relaxed">
               Мы ценим вашу анонимность. Все данные удаляются через 24 часа. 
             </p>
          </div>
          
          <div className="bg-dark-800 rounded-xl overflow-hidden border border-dark-700">
             <div className="p-4 border-b border-dark-700 flex items-center justify-between cursor-pointer hover:bg-dark-700/50">
                <div className="flex items-center">
                  <InfoIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-200">Правила сервиса</span>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-600 rotate-180" />
             </div>
             <div className="p-4 flex items-center justify-between cursor-pointer hover:bg-dark-700/50">
                <div className="flex items-center">
                  <SendIcon className="w-5 h-5 text-gray-400 mr-3" />
                  <span className="text-gray-200">Написать в поддержку</span>
                </div>
                <ChevronLeft className="w-4 h-4 text-gray-600 rotate-180" />
             </div>
          </div>
        </div>

        <div className="text-center py-6">
          <p className="text-[10px] text-dark-700 uppercase tracking-widest font-bold">OneNight v1.4.0</p>
        </div>
      </div>
    </div>
  );

  const renderProfile = () => {
    if (!selectedProfile) return null;
    return (
      <div className="min-h-screen bg-dark-900 pb-32 animate-fade-in relative">
        {/* Nav */}
        <div className="absolute top-0 left-0 right-0 z-20 flex justify-between p-4 bg-gradient-to-b from-black/80 to-transparent">
          <button onClick={handleBack} className="p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors">
            <ChevronLeft />
          </button>
          <div className="flex space-x-2">
            <button 
              onClick={() => handleShare(selectedProfile.name)}
              className="p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
            >
              <ShareIcon className="w-6 h-6" />
            </button>
            <button 
              onClick={(e) => toggleFavorite(e, selectedProfile.id)}
              className="p-2.5 bg-black/40 backdrop-blur-md rounded-full text-white hover:bg-black/60 transition-colors"
            >
              <HeartIcon fill={favorites.includes(selectedProfile.id)} className={favorites.includes(selectedProfile.id) ? 'text-red-500' : 'text-white'} />
            </button>
          </div>
        </div>

        {/* Carousel */}
        <div className="relative h-[65vh] bg-dark-800 group">
          <div 
            ref={imageScrollRef}
            onScroll={handleImageScroll}
            className="h-full overflow-x-auto overflow-y-hidden flex snap-x snap-mandatory no-scrollbar"
          >
            {selectedProfile.images.map((img, idx) => (
              <img 
                key={idx}
                src={img} 
                className="min-w-full h-full object-cover snap-center"
                alt={`${selectedProfile.name} ${idx + 1}`}
              />
            ))}
          </div>
          {/* Image Counter Badge */}
          <div className="absolute bottom-12 right-6 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full text-xs font-medium text-white border border-white/10">
            {currentImageIndex + 1} / {selectedProfile.images.length}
          </div>
        </div>

        {/* Info */}
        <div className="px-6 py-8 -mt-10 relative bg-dark-900 rounded-t-[2rem] border-t border-dark-700 shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
           {/* Handle bar */}
           <div className="w-12 h-1 bg-dark-700 rounded-full mx-auto mb-6 opacity-50" />

          <div className="flex justify-between items-start mb-6">
            <div>
              <div className="flex items-center space-x-2">
                 <h1 className="text-3xl font-bold text-white">{selectedProfile.name}, {selectedProfile.age}</h1>
                 {selectedProfile.isVerified && <VerifiedIcon className="w-6 h-6" />}
              </div>
              <div className="flex items-center text-gray-400 mt-1">
                <MapPinIcon className="w-4 h-4 mr-1 text-gold-500" />
                {selectedProfile.city}
              </div>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-gold-500">{selectedProfile.price / 1000}к</p>
              <p className="text-xs text-gray-500 font-medium">руб/час</p>
            </div>
          </div>

          {/* Parameters */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            <div className="bg-dark-800 py-3 rounded-2xl text-center border border-dark-700">
              <span className="block text-gray-500 text-[10px] uppercase tracking-wider mb-1">Рост</span>
              <span className="text-white font-bold">{selectedProfile.height}</span>
            </div>
            <div className="bg-dark-800 py-3 rounded-2xl text-center border border-dark-700">
              <span className="block text-gray-500 text-[10px] uppercase tracking-wider mb-1">Вес</span>
              <span className="text-white font-bold">{selectedProfile.weight}</span>
            </div>
            <div className="bg-dark-800 py-3 rounded-2xl text-center border border-dark-700">
              <span className="block text-gray-500 text-[10px] uppercase tracking-wider mb-1">Грудь</span>
              <span className="text-white font-bold">{selectedProfile.bust}</span>
            </div>
          </div>

          {/* Description */}
          <div className="mb-8">
            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Обо мне</h3>
            <p className="text-gray-300 leading-relaxed text-sm bg-dark-800/50 p-4 rounded-xl border border-dark-700/50">
              {selectedProfile.description}
            </p>
          </div>

           {/* Services Tags */}
          <div className="mb-8">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Услуги</h3>
             <div className="flex flex-wrap gap-2">
               {selectedProfile.services.map(s => (
                 <span key={s} className="px-4 py-2 bg-dark-800 rounded-full text-xs font-medium text-gray-300 border border-dark-700">
                   {s}
                 </span>
               ))}
             </div>
          </div>

          {/* Reviews */}
          <div className="mb-8">
             <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Отзывы ({selectedProfile.reviews.length})</h3>
             <div className="space-y-3">
               {selectedProfile.reviews.length > 0 ? selectedProfile.reviews.map(review => (
                 <div key={review.id} className="bg-dark-800 p-4 rounded-xl border border-dark-700">
                   <div className="flex justify-between items-center mb-2">
                      <span className="font-bold text-white text-sm">{review.author}</span>
                      <div className="flex text-gold-500">
                        {[...Array(review.rating)].map((_, i) => <StarIcon key={i} className="w-3 h-3" fill={true} />)}
                      </div>
                   </div>
                   <p className="text-gray-400 text-xs leading-relaxed">{review.text}</p>
                   <span className="text-[10px] text-gray-600 mt-2 block">{review.date}</span>
                 </div>
               )) : (
                 <p className="text-gray-500 text-sm">Пока нет отзывов</p>
               )}
             </div>
          </div>

        </div>

        {/* CTA */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-dark-900/90 backdrop-blur-lg border-t border-dark-800 max-w-md mx-auto z-30 pb-8 safe-bottom">
          <button 
            onClick={handleBookingStart}
            className="w-full bg-gold-500 hover:bg-gold-600 active:bg-gold-700 text-black font-bold py-4 rounded-xl text-lg shadow-lg shadow-gold-500/20 transition-all transform active:scale-[0.98]"
          >
            Заказать встречу
          </button>
        </div>
      </div>
    );
  };

  const renderBooking = () => {
    if (!selectedProfile) return null;
    return (
      <div className="min-h-screen bg-dark-900 text-white animate-fade-in pb-40">
        <div className="sticky top-0 z-30 bg-dark-900/90 backdrop-blur-md flex items-center p-4 border-b border-dark-700">
          <button onClick={handleBack} className="p-2 -ml-2 text-gray-400 hover:text-white"><ChevronLeft /></button>
          <h2 className="text-lg font-bold ml-2">Детали встречи</h2>
        </div>

        <div className="p-5 space-y-8">
          {/* User Info in Booking */}
          {isInTelegram && user && (
            <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
              <div className="flex items-center">
                <div className="w-10 h-10 bg-gradient-to-br from-gold-500 to-gold-600 rounded-full flex items-center justify-center text-black font-bold">
                  {getUserFirstName().charAt(0).toUpperCase()}
                </div>
                <div className="ml-3">
                  <div className="text-white font-medium">{getUserFirstName()}</div>
                  <div className="text-xs text-gray-400">
                    {user.username ? `@${user.username}` : `ID: ${user.id}`}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Summary Mini Card */}
          <div className="flex items-center bg-dark-800 p-4 rounded-xl border border-dark-700">
            <img src={selectedProfile.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
            <div className="ml-4">
               <h3 className="font-bold text-lg">{selectedProfile.name}</h3>
               <p className="text-gold-500">{selectedProfile.price} ₽/час</p>
            </div>
          </div>

          {/* Service Selection */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider">Выберите услуги</label>
              <div className="flex items-center space-x-2">
                {bookingData.serviceTypes.length > 0 && (
                  <span className="bg-gold-500/20 text-gold-400 text-xs px-2 py-1 rounded-full font-medium">
                    {bookingData.serviceTypes.length}
                  </span>
                )}
                <button
                  onClick={() => {
                    const allSelected = bookingData.serviceTypes.length === selectedProfile.services.length;
                    setBookingData({
                      ...bookingData, 
                      serviceTypes: allSelected ? [] : [...selectedProfile.services]
                    });
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                    bookingData.serviceTypes.length === selectedProfile.services.length
                      ? 'bg-gold-500 text-black border-gold-500'
                      : 'bg-dark-800 text-gray-400 border-dark-700 hover:border-gray-500 hover:text-white'
                  }`}
                >
                  {bookingData.serviceTypes.length === selectedProfile.services.length ? 'Снять все' : 'Выбрать все'}
                </button>
              </div>
            </div>
            
            {/* Подсказка о ценообразовании */}
            {bookingData.serviceTypes.length > 3 && (
              <div className="mb-3 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <p className="text-xs text-blue-400">
                  💡 Первые 3 услуги включены в базовую цену. Каждая дополнительная +5%
                </p>
              </div>
            )}
            
            <div className="space-y-3">
              {selectedProfile.services.map(s => {
                const isSelected = bookingData.serviceTypes.includes(s);
                return (
                  <div 
                    key={s}
                    onClick={() => {
                      const newServiceTypes = isSelected
                        ? bookingData.serviceTypes.filter(service => service !== s)
                        : [...bookingData.serviceTypes, s];
                      setBookingData({...bookingData, serviceTypes: newServiceTypes});
                    }}
                    className={`p-4 rounded-xl border cursor-pointer flex justify-between items-center transition-all ${
                      isSelected 
                        ? 'bg-gold-500/10 border-gold-500' 
                        : 'bg-dark-800 border-dark-700 hover:border-dark-600'
                    }`}
                  >
                    <span className={`font-medium ${isSelected ? 'text-gold-400' : 'text-gray-200'}`}>{s}</span>
                    <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${isSelected ? 'border-gold-500 bg-gold-500' : 'border-dark-600'}`}>
                      {isSelected && <CheckIcon className="text-black w-3 h-3" />}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Длительность</label>
            <div className="relative">
              <select 
                value={bookingData.duration}
                onChange={(e) => setBookingData({...bookingData, duration: e.target.value})}
                className="w-full appearance-none bg-dark-800 text-white p-4 pr-10 rounded-xl border border-dark-700 outline-none focus:border-gold-500 font-medium"
              >
                <option value="1 час">1 час - {selectedProfile.price} ₽</option>
                <option value="2 часа">2 часа - {selectedProfile.price * 2} ₽</option>
                <option value="Ночь">Ночь - {selectedProfile.price * 5} ₽</option>
              </select>
              <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-500">
                <ChevronLeft className="rotate-[-90deg] w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Time (Simulated) */}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Время и дата</label>
            <input 
              type="text"
              value={bookingData.date}
              onChange={(e) => setBookingData({...bookingData, date: e.target.value})}
              className="w-full bg-dark-800 text-white p-4 rounded-xl border border-dark-700 outline-none focus:border-gold-500 font-medium"
            />
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-4 bg-dark-900 border-t border-dark-800 max-w-md mx-auto pb-8 safe-bottom z-30">
          <div className="flex items-center justify-between mb-4 px-1">
            <span className="text-gray-400">Итого:</span>
            <span className="text-xl font-bold text-white">
               {calculateTotalPrice(
                 selectedProfile.price, 
                 bookingData.serviceTypes, 
                 bookingData.duration
               ).toLocaleString()} ₽
            </span>
          </div>
          {bookingData.serviceTypes.length > 3 && (
            <div className="text-xs text-gray-500 mb-3 px-1">
              Базовая цена + {bookingData.serviceTypes.length - 3} доп. {bookingData.serviceTypes.length - 3 === 1 ? 'услуга' : 'услуги'} (+{(bookingData.serviceTypes.length - 3) * 5}%)
            </div>
          )}
          <button 
            onClick={handleBookingSubmit}
            className="w-full bg-white text-black font-bold py-4 rounded-xl text-lg hover:bg-gray-200 transition-colors shadow-lg"
          >
            К оплате
          </button>
        </div>
      </div>
    );
  };

  const renderConfirmation = () => {
    return (
      <div className="min-h-screen bg-dark-900 text-white animate-slide-up pb-10">
        <div className="sticky top-0 z-30 bg-dark-900 flex items-center p-4 border-b border-dark-700">
          <button onClick={handleBack} className="p-2 -ml-2 text-gray-400 hover:text-white"><ChevronLeft /></button>
          <h2 className="text-lg font-bold ml-2">Оплата бронирования</h2>
        </div>

        <div className="p-5">
          {/* Booking Summary */}
          {bookingData.serviceTypes.length > 0 && (
            <div className="bg-dark-800 p-4 rounded-xl border border-dark-700 mb-6">
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wide mb-3">Выбранные услуги</h3>
              <div className="flex flex-wrap gap-2">
                {bookingData.serviceTypes.map(service => (
                  <span key={service} className="px-3 py-1.5 bg-gold-500/20 text-gold-400 rounded-full text-xs font-medium">
                    {service}
                  </span>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-dark-700 text-xs text-gray-400">
                Длительность: <span className="text-white">{bookingData.duration}</span>
              </div>
            </div>
          )}

          <div className="bg-gradient-to-br from-dark-800 to-dark-900 p-6 rounded-2xl border border-dark-700 mb-8 text-center shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-gold-500/10 rounded-full blur-2xl" />
            <p className="text-gray-400 text-sm mb-1 relative z-10">Сумма к оплате</p>
            <p className="text-4xl font-bold text-gold-500 mb-4 tracking-tight relative z-10">
              {(selectedProfile ? calculateTotalPrice(
                selectedProfile.price, 
                bookingData.serviceTypes, 
                bookingData.duration
              ) : 0).toLocaleString()} ₽
            </p>
            {bookingData.serviceTypes.length > 3 && (
              <p className="text-xs text-gray-400 mb-3 relative z-10">
                включая {bookingData.serviceTypes.length - 3} доп. {bookingData.serviceTypes.length - 3 === 1 ? 'услугу' : 'услуги'}
              </p>
            )}
            <div className="inline-flex items-center bg-dark-900/80 border border-dark-600 px-3 py-1.5 rounded-lg">
              <span className="text-[10px] text-gray-400 uppercase tracking-widest mr-2">Заказ</span>
              <span className="text-xs font-mono text-white">#{Math.floor(Math.random() * 90000) + 10000}</span>
            </div>
          </div>

          <h3 className="text-xs font-bold text-gray-500 mb-4 uppercase tracking-wider">Реквизиты для оплаты</h3>
          
          <div className="space-y-4 mb-8">
            <div className="bg-dark-800 p-4 rounded-xl border border-dark-700 hover:border-dark-600 transition-colors">
              <div className="flex justify-between mb-2">
                <span className="font-medium text-white">Банковская карта</span>
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(siteSettings.payment_card);
                    showToast('Номер карты скопирован');
                  }}
                  className="text-gold-500 text-xs flex items-center font-medium bg-gold-500/10 px-2 py-1 rounded"
                >
                  <CopyIcon className="w-3 h-3 mr-1" /> Копировать
                </button>
              </div>
              <div className="font-mono text-gray-300 text-sm break-all">
                {siteSettings.payment_card}
              </div>
            </div>
          </div>

          <div className="bg-gold-500/10 border border-gold-500/30 p-4 rounded-xl mb-6 flex items-start">
             <InfoIcon className="w-5 h-5 text-gold-500 mr-3 flex-shrink-0 mt-0.5" />
             <p className="text-gold-400 text-sm">
              После оплаты полной суммы прикрепите скриншот чека и нажмите "Подтвердить оплату".
            </p>
          </div>

          {/* Screenshot Upload */}
          <div className="mb-6">
            <h3 className="text-xs font-bold text-gray-500 mb-3 uppercase tracking-wider">Скриншот оплаты</h3>
            <div className="bg-dark-800 p-4 rounded-xl border border-dark-700">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setPaymentScreenshot(file);
                    showToast('Скриншот загружен', 'success');
                  }
                }}
                className="hidden"
                id="screenshot-upload"
              />
              <label
                htmlFor="screenshot-upload"
                className={`block w-full p-4 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
                  paymentScreenshot 
                    ? 'border-gold-500 bg-gold-500/10' 
                    : 'border-dark-600 hover:border-dark-500'
                }`}
              >
                <div className="text-center">
                  {paymentScreenshot ? (
                    <>
                      <CheckIcon className="w-8 h-8 text-gold-500 mx-auto mb-2" />
                      <p className="text-gold-400 font-medium">{paymentScreenshot.name}</p>
                      <p className="text-xs text-gray-500 mt-1">Нажмите для замены</p>
                    </>
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-dark-700 rounded-full flex items-center justify-center mx-auto mb-3">
                        <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                      </div>
                      <p className="text-gray-300 font-medium">Прикрепить скриншот</p>
                      <p className="text-xs text-gray-500 mt-1">JPG, PNG до 10MB</p>
                    </>
                  )}
                </div>
              </label>
            </div>
          </div>

          <button 
            onClick={handlePaymentSubmit}
            disabled={!paymentScreenshot || isSubmittingPayment}
            className={`w-full font-bold py-4 rounded-xl text-lg shadow-lg transition-all mb-4 ${
              paymentScreenshot && !isSubmittingPayment
                ? 'bg-gold-500 hover:bg-gold-600 text-black active:scale-[0.98]'
                : 'bg-dark-700 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isSubmittingPayment ? 'Отправка...' : 'Подтвердить оплату'}
          </button>

          <div className="text-center">
            <p className="text-gray-400 text-sm mb-3">Для дальнейших уточнений:</p>
            <a 
              href={`https://t.me/${siteSettings.support_username.replace('@', '')}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-[#2AABEE] hover:text-[#229ED9] font-medium transition-colors"
            >
              <SendIcon className="w-4 h-4 mr-2" />
              Написать в {siteSettings.support_username}
            </a>
          </div>
          
          <button 
             onClick={() => setView('HOME')}
             className="w-full mt-4 py-3 text-gray-500 text-sm hover:text-white transition-colors"
          >
            Вернуться на главную
          </button>
        </div>
      </div>
    );
  };

  // Logic to determine if nav should show
  const showNav = ['HOME', 'FAVORITES', 'MORE'].includes(view);

  return (
    <div className="bg-dark-900 min-h-screen font-sans text-white">
      <AgeVerification />
      <ToastContainer toasts={toasts} removeToast={removeToast} />
      
      <div className="max-w-md mx-auto min-h-screen bg-dark-900 shadow-2xl relative">
        {view === 'HOME' && renderHome()}
        {view === 'FAVORITES' && renderFavorites()}
        {view === 'MORE' && renderMore()}
        {view === 'PROFILE' && renderProfile()}
        {view === 'BOOKING' && renderBooking()}
        {view === 'CONFIRMATION' && renderConfirmation()}
        
        {showNav && <BottomNav currentView={view} onChange={setView} />}
      </div>
    </div>
  );
}