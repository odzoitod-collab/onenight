import { createClient } from '@supabase/supabase-js';
import { Profile } from './types';

const SUPABASE_URL = "https://xasyfblbgagkmtpxoiqp.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhhc3lmYmxiZ2Fna210cHhvaXFwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5NTg0NjYsImV4cCI6MjA4MjUzNDQ2Nn0.kaT10SR7idYYZIQc1Gp8JsHXcxfmcbtz6JZqNM7UPZE";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  }
});

// Интерфейс для настроек сайта
export interface SiteSettings {
  support_username: string;
  payment_card: string;
}

// Функция для загрузки настроек сайта из Supabase
export async function loadSiteSettings(): Promise<SiteSettings> {
  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('*')
      .eq('id', 1)
      .single();

    if (error) {
      console.error('Error loading site settings:', error);
      return {
        support_username: '@OneNightSupport',
        payment_card: '2202 2026 8321 4532'
      };
    }

    return {
      support_username: data.support_username || '@OneNightSupport',
      payment_card: data.payment_card || '2202 2026 8321 4532'
    };
  } catch (error) {
    console.error('Error loading site settings:', error);
    return {
      support_username: '@OneNightSupport',
      payment_card: '2202 2026 8321 4532'
    };
  }
}

// Функция для загрузки профилей из Supabase
export async function loadProfiles(): Promise<Profile[]> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading profiles:', error);
      return [];
    }

    // Преобразуем данные из Supabase в формат приложения
    return data.map(profile => ({
      id: profile.id.toString(),
      name: profile.name,
      age: profile.age,
      city: profile.city,
      height: profile.height,
      weight: profile.weight,
      bust: profile.bust,
      price: profile.price,
      isTop: profile.isTop || false,
      isVerified: profile.isVerified || false,
      description: profile.description,
      services: profile.services || [],
      images: profile.images || [],
      reviews: generateRandomReviews(profile.id.toString(), Math.floor(Math.random() * 5) + 2)
    }));
  } catch (error) {
    console.error('Error loading profiles:', error);
    return [];
  }
}

// Генерация случайных отзывов (копируем логику из constants.ts)
const REVIEW_AUTHORS = [
  'Александр', 'Дмитрий', 'Максим', 'Сергей', 'Андрей', 'Владимир', 
  'Игорь', 'Алексей', 'Михаил', 'Евгений', 'Роман', 'Павел', 'Николай',
  'Артём', 'Денис', 'Константин', 'Олег', 'Виктор', 'Иван', 'Антон'
];

const REVIEW_TEXTS = [
  'Потрясающая девушка, вечер прошел великолепно. Очень интеллигентная.',
  'Все соответствует фото. Рекомендую.',
  'Приятная в общении, но опоздала на 5 минут.',
  'Превзошла все ожидания! Обязательно встретимся снова.',
  'Очень красивая и ухоженная. Время пролетело незаметно.',
  'Отличный сервис, профессиональный подход. Спасибо за вечер!',
  'Замечательная девушка, приятная во всех отношениях.',
  'Всё на высшем уровне. Буду рекомендовать друзьям.',
  'Очень милая и общительная. Встреча прошла отлично.',
  'Красивая, умная, интересная собеседница. 10 из 10!',
  'Фото не передают всей красоты. В реальности ещё лучше!',
  'Профессионал своего дела. Всё было идеально.',
  'Приятно удивлён уровнем сервиса. Однозначно рекомендую.',
  'Отличная девушка, знает своё дело. Остался очень доволен.',
  'Всё прошло замечательно, атмосфера была непринуждённой.',
  'Очень позитивная и жизнерадостная. Поднимает настроение!',
  'Красивая фигура, приятная внешность. Всё понравилось.',
  'Встреча оставила только положительные эмоции.',
  'Отзывчивая и внимательная. Учитывает все пожелания.',
  'Прекрасный вечер в приятной компании. Спасибо!',
];

const REVIEW_DATES = [
  '1 день назад', '2 дня назад', '3 дня назад', '5 дней назад',
  '1 неделю назад', '2 недели назад', '3 недели назад', '1 месяц назад'
];

function generateRandomReviews(profileId: string, count: number) {
  const reviews = [];
  const usedTexts = new Set<string>();
  
  for (let i = 0; i < count; i++) {
    let text: string;
    do {
      text = REVIEW_TEXTS[Math.floor(Math.random() * REVIEW_TEXTS.length)];
    } while (usedTexts.has(text) && usedTexts.size < REVIEW_TEXTS.length);
    
    usedTexts.add(text);
    
    const rating = Math.random() > 0.3 ? 5 : 4;
    
    reviews.push({
      id: `${profileId}-review-${i}`,
      author: REVIEW_AUTHORS[Math.floor(Math.random() * REVIEW_AUTHORS.length)],
      text,
      rating,
      date: REVIEW_DATES[Math.floor(Math.random() * REVIEW_DATES.length)]
    });
  }
  
  return reviews;
}
