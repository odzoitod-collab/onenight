interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

interface UserSession {
  telegramUser?: TelegramUser;
  sessionStart: Date;
  lastActivity: Date;
  viewsCount: number;
  favoritesCount: number;
}

class UserAnalytics {
  private session: UserSession;

  constructor(telegramUser?: TelegramUser) {
    this.session = {
      telegramUser,
      sessionStart: new Date(),
      lastActivity: new Date(),
      viewsCount: 0,
      favoritesCount: 0
    };

    // Логируем начало сессии
    if (telegramUser) {
      console.log('🔥 OneNight Session Started:', {
        user: telegramUser.username || telegramUser.first_name,
        id: telegramUser.id,
        premium: telegramUser.is_premium,
        language: telegramUser.language_code
      });
    }
  }

  trackProfileView(profileId: string) {
    this.session.viewsCount++;
    this.session.lastActivity = new Date();
    
    if (this.session.telegramUser) {
      console.log('👀 Profile View:', {
        user: this.session.telegramUser.username || this.session.telegramUser.first_name,
        profileId,
        totalViews: this.session.viewsCount
      });
    }
  }

  trackFavoriteToggle(profileId: string, isAdded: boolean) {
    if (isAdded) {
      this.session.favoritesCount++;
    } else {
      this.session.favoritesCount = Math.max(0, this.session.favoritesCount - 1);
    }
    
    this.session.lastActivity = new Date();
    
    if (this.session.telegramUser) {
      console.log('❤️ Favorite Toggle:', {
        user: this.session.telegramUser.username || this.session.telegramUser.first_name,
        profileId,
        action: isAdded ? 'added' : 'removed',
        totalFavorites: this.session.favoritesCount
      });
    }
  }

  trackBookingAttempt(profileId: string, services: string[]) {
    this.session.lastActivity = new Date();
    
    if (this.session.telegramUser) {
      console.log('💰 Booking Attempt:', {
        user: this.session.telegramUser.username || this.session.telegramUser.first_name,
        profileId,
        services,
        sessionDuration: Date.now() - this.session.sessionStart.getTime()
      });
    }
  }

  getSessionSummary() {
    return {
      ...this.session,
      sessionDuration: Date.now() - this.session.sessionStart.getTime()
    };
  }
}

export { UserAnalytics, type TelegramUser, type UserSession };