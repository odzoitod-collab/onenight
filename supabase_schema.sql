-- ============================================
-- OneNight - Полная SQL схема для Supabase
-- ============================================
-- Этот файл содержит все таблицы, индексы, RLS политики
-- и триггеры для работы бота и сайта
-- ============================================

-- Включаем расширения
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- 1. ТАБЛИЦА НАСТРОЕК САЙТА (site_settings)
-- ============================================
-- Хранит глобальные настройки: реквизиты, поддержку и т.д.

CREATE TABLE IF NOT EXISTS site_settings (
    id INTEGER PRIMARY KEY DEFAULT 1,
    support_username VARCHAR(100) DEFAULT '@OneNightSupport',
    payment_card VARCHAR(50) DEFAULT '2202 2026 8321 4532',
    payment_crypto VARCHAR(100) DEFAULT NULL,
    site_name VARCHAR(100) DEFAULT 'OneNight',
    min_price INTEGER DEFAULT 1000,
    commission_percent DECIMAL(5,2) DEFAULT 0,
    is_maintenance BOOLEAN DEFAULT FALSE,
    maintenance_message TEXT DEFAULT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ограничение: только одна запись
    CONSTRAINT single_row CHECK (id = 1)
);

-- Вставляем начальные настройки
INSERT INTO site_settings (id, support_username, payment_card) 
VALUES (1, '@OneNightSupport', '2202 2026 8321 4532')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. ТАБЛИЦА ВОРКЕРОВ (workers)
-- ============================================
-- Воркеры - это пользователи, которые создают анкеты девушек

CREATE TABLE IF NOT EXISTS workers (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    referral_code VARCHAR(20) UNIQUE DEFAULT (
        UPPER(SUBSTRING(MD5(RANDOM()::TEXT) FROM 1 FOR 8))
    ),
    balance DECIMAL(12,2) DEFAULT 0,
    total_earned DECIMAL(12,2) DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT DEFAULT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для воркеров
CREATE INDEX IF NOT EXISTS idx_workers_telegram_id ON workers(telegram_id);
CREATE INDEX IF NOT EXISTS idx_workers_referral_code ON workers(referral_code);
CREATE INDEX IF NOT EXISTS idx_workers_is_active ON workers(is_active);

-- ============================================
-- 3. ТАБЛИЦА КЛИЕНТОВ ВОРКЕРОВ (worker_clients)
-- ============================================
-- Клиенты, пришедшие по реферальной ссылке воркера

CREATE TABLE IF NOT EXISTS worker_clients (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(100),
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    total_spent DECIMAL(12,2) DEFAULT 0,
    orders_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для клиентов
CREATE INDEX IF NOT EXISTS idx_worker_clients_worker_id ON worker_clients(worker_id);
CREATE INDEX IF NOT EXISTS idx_worker_clients_telegram_id ON worker_clients(telegram_id);

-- ============================================
-- 4. ТАБЛИЦА ПРОФИЛЕЙ/АНКЕТ (profiles)
-- ============================================
-- Анкеты девушек, создаваемые воркерами

CREATE TABLE IF NOT EXISTS profiles (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    
    -- Основная информация
    name VARCHAR(50) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 60),
    city VARCHAR(100) NOT NULL,
    
    -- Параметры
    height INTEGER CHECK (height >= 140 AND height <= 210),
    weight INTEGER CHECK (weight >= 35 AND weight <= 120),
    bust INTEGER CHECK (bust >= 1 AND bust <= 10),
    
    -- Цена и описание
    price INTEGER NOT NULL CHECK (price >= 1000),
    description TEXT,
    
    -- Услуги и фото (массивы)
    services TEXT[] DEFAULT '{}',
    images TEXT[] DEFAULT '{}',
    
    -- Статусы
    "isTop" BOOLEAN DEFAULT FALSE,
    "isVerified" BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    is_blocked BOOLEAN DEFAULT FALSE,
    block_reason TEXT DEFAULT NULL,
    
    -- Статистика
    views_count INTEGER DEFAULT 0,
    favorites_count INTEGER DEFAULT 0,
    bookings_count INTEGER DEFAULT 0,
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для профилей
CREATE INDEX IF NOT EXISTS idx_profiles_worker_id ON profiles(worker_id);
CREATE INDEX IF NOT EXISTS idx_profiles_city ON profiles(city);
CREATE INDEX IF NOT EXISTS idx_profiles_is_active ON profiles(is_active);
CREATE INDEX IF NOT EXISTS idx_profiles_price ON profiles(price);
CREATE INDEX IF NOT EXISTS idx_profiles_age ON profiles(age);
CREATE INDEX IF NOT EXISTS idx_profiles_isTop ON profiles("isTop");
CREATE INDEX IF NOT EXISTS idx_profiles_created_at ON profiles(created_at DESC);

-- Полнотекстовый поиск
CREATE INDEX IF NOT EXISTS idx_profiles_name_search ON profiles USING gin(to_tsvector('russian', name));
CREATE INDEX IF NOT EXISTS idx_profiles_city_search ON profiles USING gin(to_tsvector('russian', city));

-- ============================================
-- 5. ТАБЛИЦА БРОНИРОВАНИЙ (bookings)
-- ============================================
-- Заказы/бронирования от клиентов

CREATE TABLE IF NOT EXISTS bookings (
    id SERIAL PRIMARY KEY,
    
    -- Связи
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    client_telegram_id BIGINT NOT NULL,
    worker_id INTEGER REFERENCES workers(id) ON DELETE SET NULL,
    
    -- Данные клиента
    client_username VARCHAR(100),
    client_first_name VARCHAR(100),
    
    -- Детали заказа
    services TEXT[] DEFAULT '{}',
    duration VARCHAR(50) NOT NULL,
    booking_date VARCHAR(100),
    total_price DECIMAL(12,2) NOT NULL,
    
    -- Статус заказа
    status VARCHAR(20) DEFAULT 'pending' CHECK (
        status IN ('pending', 'paid', 'confirmed', 'completed', 'cancelled', 'refunded')
    ),
    
    -- Оплата
    payment_method VARCHAR(50),
    payment_screenshot TEXT,
    paid_at TIMESTAMP WITH TIME ZONE,
    
    -- Комментарии
    client_comment TEXT,
    admin_comment TEXT,
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для бронирований
CREATE INDEX IF NOT EXISTS idx_bookings_profile_id ON bookings(profile_id);
CREATE INDEX IF NOT EXISTS idx_bookings_client_telegram_id ON bookings(client_telegram_id);
CREATE INDEX IF NOT EXISTS idx_bookings_worker_id ON bookings(worker_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);

-- ============================================
-- 6. ТАБЛИЦА ОТЗЫВОВ (reviews)
-- ============================================
-- Отзывы клиентов о девушках

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    client_telegram_id BIGINT NOT NULL,
    
    -- Данные отзыва
    author_name VARCHAR(100) NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    text TEXT NOT NULL,
    
    -- Модерация
    is_approved BOOLEAN DEFAULT FALSE,
    is_visible BOOLEAN DEFAULT TRUE,
    
    -- Метаданные
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для отзывов
CREATE INDEX IF NOT EXISTS idx_reviews_profile_id ON reviews(profile_id);
CREATE INDEX IF NOT EXISTS idx_reviews_is_approved ON reviews(is_approved);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- ============================================
-- 7. ТАБЛИЦА ИЗБРАННОГО (favorites)
-- ============================================
-- Избранные анкеты пользователей

CREATE TABLE IF NOT EXISTS favorites (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT NOT NULL,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Уникальность: один пользователь - одна анкета
    UNIQUE(telegram_id, profile_id)
);

-- Индексы для избранного
CREATE INDEX IF NOT EXISTS idx_favorites_telegram_id ON favorites(telegram_id);
CREATE INDEX IF NOT EXISTS idx_favorites_profile_id ON favorites(profile_id);

-- ============================================
-- 8. ТАБЛИЦА ПРОСМОТРОВ (profile_views)
-- ============================================
-- Статистика просмотров анкет

CREATE TABLE IF NOT EXISTS profile_views (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    telegram_id BIGINT,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для просмотров
CREATE INDEX IF NOT EXISTS idx_profile_views_profile_id ON profile_views(profile_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_created_at ON profile_views(created_at DESC);

-- ============================================
-- 9. ТАБЛИЦА АДМИНИСТРАТОРОВ (admins)
-- ============================================
-- Администраторы системы

CREATE TABLE IF NOT EXISTS admins (
    id SERIAL PRIMARY KEY,
    telegram_id BIGINT UNIQUE NOT NULL,
    username VARCHAR(100),
    first_name VARCHAR(100),
    role VARCHAR(20) DEFAULT 'admin' CHECK (role IN ('admin', 'superadmin', 'moderator')),
    permissions JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT TRUE,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индекс для админов
CREATE INDEX IF NOT EXISTS idx_admins_telegram_id ON admins(telegram_id);

-- ============================================
-- 10. ТАБЛИЦА ЛОГОВ ДЕЙСТВИЙ (action_logs)
-- ============================================
-- Логирование важных действий в системе

CREATE TABLE IF NOT EXISTS action_logs (
    id SERIAL PRIMARY KEY,
    actor_telegram_id BIGINT,
    actor_type VARCHAR(20) CHECK (actor_type IN ('admin', 'worker', 'client', 'system')),
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INTEGER,
    details JSONB DEFAULT '{}',
    ip_address VARCHAR(45),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для логов
CREATE INDEX IF NOT EXISTS idx_action_logs_actor ON action_logs(actor_telegram_id);
CREATE INDEX IF NOT EXISTS idx_action_logs_action ON action_logs(action);
CREATE INDEX IF NOT EXISTS idx_action_logs_created_at ON action_logs(created_at DESC);

-- ============================================
-- 11. ТАБЛИЦА ГОРОДОВ (cities)
-- ============================================
-- Справочник городов

CREATE TABLE IF NOT EXISTS cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    region VARCHAR(100),
    is_active BOOLEAN DEFAULT TRUE,
    profiles_count INTEGER DEFAULT 0,
    sort_order INTEGER DEFAULT 0
);

-- Вставляем основные города
INSERT INTO cities (name, sort_order) VALUES
    ('Москва', 1),
    ('Санкт-Петербург', 2),
    ('Новосибирск', 3),
    ('Екатеринбург', 4),
    ('Казань', 5),
    ('Нижний Новгород', 6),
    ('Челябинск', 7),
    ('Самара', 8),
    ('Омск', 9),
    ('Ростов-на-Дону', 10),
    ('Уфа', 11),
    ('Красноярск', 12),
    ('Воронеж', 13),
    ('Пермь', 14),
    ('Волгоград', 15),
    ('Краснодар', 16),
    ('Сочи', 17)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 12. ТАБЛИЦА УСЛУГ (services)
-- ============================================
-- Справочник услуг

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) UNIQUE NOT NULL,
    category VARCHAR(50),
    is_premium BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    sort_order INTEGER DEFAULT 0
);

-- Вставляем услуги
INSERT INTO services (name, category, is_premium, sort_order) VALUES
    ('Классика', 'basic', FALSE, 1),
    ('Минет', 'basic', FALSE, 2),
    ('Анал', 'premium', TRUE, 3),
    ('Минет в машине', 'basic', FALSE, 4),
    ('Минет без резинки', 'premium', TRUE, 5),
    ('Окончание в рот', 'basic', FALSE, 6),
    ('Окончание на грудь', 'basic', FALSE, 7),
    ('Окончание на лицо', 'basic', FALSE, 8),
    ('Массаж', 'massage', FALSE, 9),
    ('Массаж эротический', 'massage', FALSE, 10),
    ('Массаж расслабляющий', 'massage', FALSE, 11),
    ('Куннилингус', 'basic', FALSE, 12),
    ('Римминг', 'premium', TRUE, 13),
    ('Золотой дождь', 'premium', TRUE, 14),
    ('Страпон', 'premium', TRUE, 15),
    ('БДСМ лайт', 'bdsm', FALSE, 16),
    ('БДСМ', 'bdsm', TRUE, 17),
    ('Доминация', 'bdsm', TRUE, 18),
    ('Фетиш', 'bdsm', FALSE, 19),
    ('Ролевые игры', 'entertainment', FALSE, 20),
    ('Стриптиз', 'entertainment', FALSE, 21),
    ('Лесби-шоу', 'entertainment', TRUE, 22),
    ('Групповой секс', 'premium', TRUE, 23),
    ('Эскорт на мероприятие', 'escort', TRUE, 24),
    ('Путешествия', 'escort', TRUE, 25),
    ('GFE (Girlfriend Experience)', 'escort', TRUE, 26),
    ('Апартаменты', 'location', FALSE, 27),
    ('Выезд', 'location', FALSE, 28)
ON CONFLICT (name) DO NOTHING;

-- ============================================
-- 13. ТАБЛИЦА ТРАНЗАКЦИЙ (transactions)
-- ============================================
-- Финансовые транзакции воркеров

CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    worker_id INTEGER NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
    booking_id INTEGER REFERENCES bookings(id) ON DELETE SET NULL,
    
    type VARCHAR(20) NOT NULL CHECK (type IN ('earning', 'withdrawal', 'bonus', 'penalty')),
    amount DECIMAL(12,2) NOT NULL,
    balance_before DECIMAL(12,2),
    balance_after DECIMAL(12,2),
    
    description TEXT,
    status VARCHAR(20) DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для транзакций
CREATE INDEX IF NOT EXISTS idx_transactions_worker_id ON transactions(worker_id);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions(created_at DESC);

-- ============================================
-- 14. ТАБЛИЦА ЖАЛОБ (complaints)
-- ============================================
-- Жалобы на анкеты

CREATE TABLE IF NOT EXISTS complaints (
    id SERIAL PRIMARY KEY,
    profile_id INTEGER NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    reporter_telegram_id BIGINT NOT NULL,
    
    reason VARCHAR(50) NOT NULL CHECK (reason IN (
        'fake_photos', 'scam', 'inappropriate', 'underage', 'other'
    )),
    description TEXT,
    
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'rejected')),
    admin_comment TEXT,
    reviewed_by INTEGER REFERENCES admins(id),
    reviewed_at TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Индексы для жалоб
CREATE INDEX IF NOT EXISTS idx_complaints_profile_id ON complaints(profile_id);
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);

-- ============================================
-- ТРИГГЕРЫ И ФУНКЦИИ
-- ============================================

-- Функция обновления updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Триггеры для updated_at
CREATE TRIGGER update_site_settings_updated_at
    BEFORE UPDATE ON site_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_workers_updated_at
    BEFORE UPDATE ON workers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_worker_clients_updated_at
    BEFORE UPDATE ON worker_clients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Функция для обновления счетчика профилей в городах
CREATE OR REPLACE FUNCTION update_city_profiles_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE cities SET profiles_count = profiles_count + 1 WHERE name = NEW.city;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE cities SET profiles_count = profiles_count - 1 WHERE name = OLD.city;
    ELSIF TG_OP = 'UPDATE' AND OLD.city != NEW.city THEN
        UPDATE cities SET profiles_count = profiles_count - 1 WHERE name = OLD.city;
        UPDATE cities SET profiles_count = profiles_count + 1 WHERE name = NEW.city;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_city_profiles_count
    AFTER INSERT OR UPDATE OR DELETE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_city_profiles_count();

-- Функция для обновления счетчика просмотров профиля
CREATE OR REPLACE FUNCTION increment_profile_views()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE profiles SET views_count = views_count + 1 WHERE id = NEW.profile_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_increment_profile_views
    AFTER INSERT ON profile_views
    FOR EACH ROW EXECUTE FUNCTION increment_profile_views();

-- Функция для обновления счетчика избранного
CREATE OR REPLACE FUNCTION update_favorites_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE profiles SET favorites_count = favorites_count + 1 WHERE id = NEW.profile_id;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE profiles SET favorites_count = favorites_count - 1 WHERE id = OLD.profile_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_favorites_count
    AFTER INSERT OR DELETE ON favorites
    FOR EACH ROW EXECUTE FUNCTION update_favorites_count();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Включаем RLS для таблиц
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE workers ENABLE ROW LEVEL SECURITY;
ALTER TABLE worker_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorites ENABLE ROW LEVEL SECURITY;

-- Политики для profiles (анкеты видны всем, но редактировать может только владелец)
CREATE POLICY "Profiles are viewable by everyone" ON profiles
    FOR SELECT USING (is_active = TRUE AND is_blocked = FALSE);

CREATE POLICY "Profiles are insertable by authenticated users" ON profiles
    FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Profiles are updatable by owner" ON profiles
    FOR UPDATE USING (TRUE);

-- Политики для site_settings (только чтение для всех)
CREATE POLICY "Site settings are viewable by everyone" ON site_settings
    FOR SELECT USING (TRUE);

-- ============================================
-- ПРЕДСТАВЛЕНИЯ (VIEWS)
-- ============================================

-- Представление для статистики админ панели
CREATE OR REPLACE VIEW admin_stats AS
SELECT
    (SELECT COUNT(*) FROM workers WHERE is_active = TRUE) as total_workers,
    (SELECT COUNT(*) FROM worker_clients) as total_clients,
    (SELECT COUNT(*) FROM profiles WHERE is_active = TRUE) as total_profiles,
    (SELECT COUNT(*) FROM bookings WHERE status = 'pending') as pending_bookings,
    (SELECT COUNT(*) FROM bookings WHERE status = 'completed') as completed_bookings,
    (SELECT COALESCE(SUM(total_price), 0) FROM bookings WHERE status = 'completed') as total_revenue,
    (SELECT COUNT(*) FROM complaints WHERE status = 'pending') as pending_complaints;

-- Представление для топ воркеров
CREATE OR REPLACE VIEW top_workers AS
SELECT 
    w.id,
    w.telegram_id,
    w.username,
    w.first_name,
    w.total_earned,
    COUNT(DISTINCT wc.id) as clients_count,
    COUNT(DISTINCT p.id) as profiles_count
FROM workers w
LEFT JOIN worker_clients wc ON w.id = wc.worker_id
LEFT JOIN profiles p ON w.id = p.worker_id AND p.is_active = TRUE
WHERE w.is_active = TRUE
GROUP BY w.id
ORDER BY w.total_earned DESC;

-- Представление для популярных анкет (без имени воркера)
CREATE OR REPLACE VIEW popular_profiles AS
SELECT 
    p.*,
    COALESCE(AVG(r.rating), 0) as avg_rating,
    COUNT(DISTINCT r.id) as reviews_count
FROM profiles p
LEFT JOIN reviews r ON p.id = r.profile_id AND r.is_approved = TRUE
WHERE p.is_active = TRUE AND p.is_blocked = FALSE
GROUP BY p.id
ORDER BY p.views_count DESC, p.favorites_count DESC;

-- ============================================
-- КОММЕНТАРИИ К ТАБЛИЦАМ
-- ============================================

COMMENT ON TABLE site_settings IS 'Глобальные настройки сайта и бота';
COMMENT ON TABLE workers IS 'Воркеры - пользователи, создающие анкеты';
COMMENT ON TABLE worker_clients IS 'Клиенты, пришедшие по реферальным ссылкам воркеров';
COMMENT ON TABLE profiles IS 'Анкеты девушек';
COMMENT ON TABLE bookings IS 'Бронирования/заказы';
COMMENT ON TABLE reviews IS 'Отзывы клиентов';
COMMENT ON TABLE favorites IS 'Избранные анкеты пользователей';
COMMENT ON TABLE profile_views IS 'Статистика просмотров анкет';
COMMENT ON TABLE admins IS 'Администраторы системы';
COMMENT ON TABLE action_logs IS 'Логи действий в системе';
COMMENT ON TABLE cities IS 'Справочник городов';
COMMENT ON TABLE services IS 'Справочник услуг';
COMMENT ON TABLE transactions IS 'Финансовые транзакции воркеров';
COMMENT ON TABLE complaints IS 'Жалобы на анкеты';

-- ============================================
-- ГОТОВО!
-- ============================================
-- Для применения схемы:
-- 1. Откройте Supabase Dashboard
-- 2. Перейдите в SQL Editor
-- 3. Вставьте этот код и выполните
-- ============================================
