import { useEffect, useState } from 'react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  themeParams: {
    bg_color: string;
    text_color: string;
    hint_color: string;
    link_color: string;
    button_color: string;
    button_text_color: string;
  };
  colorScheme: 'light' | 'dark';
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  initData: string;
  initDataUnsafe: {
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
    [key: string]: any;
  };
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export const useTelegramWebApp = () => {
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [user, setUser] = useState<TelegramUser | null>(null);

  useEffect(() => {
    const app = window.Telegram?.WebApp;
    
    if (app) {
      app.ready();
      app.expand();
      
      // Получаем данные пользователя
      if (app.initDataUnsafe?.user) {
        setUser(app.initDataUnsafe.user);
        console.log('Telegram User:', app.initDataUnsafe.user);
      }
      
      // Настройка темы
      if (app.themeParams.bg_color) {
        document.body.style.backgroundColor = app.themeParams.bg_color;
      }
      
      setWebApp(app);
      setIsReady(true);
    } else {
      // Если не в Telegram, все равно помечаем как готово
      setIsReady(true);
    }
  }, []);

  const showMainButton = (text: string, onClick: () => void) => {
    if (webApp?.MainButton) {
      webApp.MainButton.text = text;
      webApp.MainButton.onClick(onClick);
      webApp.MainButton.show();
    }
  };

  const hideMainButton = () => {
    if (webApp?.MainButton) {
      webApp.MainButton.hide();
    }
  };

  const showBackButton = (onClick: () => void) => {
    if (webApp?.BackButton) {
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    }
  };

  const hideBackButton = () => {
    if (webApp?.BackButton) {
      webApp.BackButton.hide();
    }
  };

  const close = () => {
    if (webApp) {
      webApp.close();
    }
  };

  // Функция для получения отображаемого имени пользователя
  const getUserDisplayName = (): string => {
    if (!user) return 'Гость';
    
    if (user.username) {
      return `@${user.username}`;
    }
    
    const fullName = [user.first_name, user.last_name].filter(Boolean).join(' ');
    return fullName || `Пользователь #${user.id}`;
  };

  const getUserFirstName = (): string => {
    return user?.first_name || 'Гость';
  };

  return {
    webApp,
    isReady,
    user,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    close,
    isInTelegram: !!webApp,
    themeParams: webApp?.themeParams,
    colorScheme: webApp?.colorScheme || 'dark',
    getUserDisplayName,
    getUserFirstName
  };
};