-- ============================================
-- Исправление RLS политик для OneNight
-- ============================================

-- Отключаем RLS для таблиц, которые используются ботом
-- (бот работает с anon key, поэтому нужны открытые политики)

-- Вариант 1: Полностью отключить RLS (проще для разработки)
ALTER TABLE workers DISABLE ROW LEVEL SECURITY;
ALTER TABLE worker_clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE favorites DISABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings DISABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views DISABLE ROW LEVEL SECURITY;

-- ИЛИ Вариант 2: Создать открытые политики (если хотите оставить RLS включенным)
-- Раскомментируйте ниже если выбрали вариант 2:

/*
-- Удаляем старые политики
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON profiles;
DROP POLICY IF EXISTS "Profiles are insertable by authenticated users" ON profiles;
DROP POLICY IF EXISTS "Profiles are updatable by owner" ON profiles;
DROP POLICY IF EXISTS "Site settings are viewable by everyone" ON site_settings;

-- Workers - полный доступ
CREATE POLICY "Workers full access" ON workers FOR ALL USING (true) WITH CHECK (true);

-- Worker clients - полный доступ
CREATE POLICY "Worker clients full access" ON worker_clients FOR ALL USING (true) WITH CHECK (true);

-- Profiles - полный доступ
CREATE POLICY "Profiles full access" ON profiles FOR ALL USING (true) WITH CHECK (true);

-- Bookings - полный доступ
CREATE POLICY "Bookings full access" ON bookings FOR ALL USING (true) WITH CHECK (true);

-- Reviews - полный доступ
CREATE POLICY "Reviews full access" ON reviews FOR ALL USING (true) WITH CHECK (true);

-- Favorites - полный доступ
CREATE POLICY "Favorites full access" ON favorites FOR ALL USING (true) WITH CHECK (true);

-- Site settings - полный доступ
CREATE POLICY "Site settings full access" ON site_settings FOR ALL USING (true) WITH CHECK (true);

-- Profile views - полный доступ
CREATE POLICY "Profile views full access" ON profile_views FOR ALL USING (true) WITH CHECK (true);
*/

-- Готово!
