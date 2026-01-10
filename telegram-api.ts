// Функция для отправки уведомлений в Telegram канал
// Используется на фронтенде для отправки данных о заказе

const BOT_TOKEN = '8154688370:AAF4OWe9hvpvXyQA5_nryDHMFBpVG26MB1Y';
const CHANNEL_ID = '-1003524505350';

interface OrderData {
  profile_name: string;
  profile_id: string;
  client_name: string;
  client_username: string;
  client_id: number;
  services: string[];
  duration: string;
  total_price: number;
  booking_date: string;
  referrer_name?: string;
  referrer_telegram_id?: number;
}

export async function sendPaymentNotification(screenshot: File, orderData: OrderData): Promise<boolean> {
  try {
    // Создаем сообщение для канала
    const channelCaption = `
🆕 НОВЫЙ ЗАКАЗ

👤 Клиент: ${orderData.client_name}
${orderData.client_username ? `@${orderData.client_username}` : `ID: ${orderData.client_id}`}
${orderData.referrer_name ? `👥 Привел: ${orderData.referrer_name}` : ''}

💃 Модель: ${orderData.profile_name}
🔧 Услуги: ${orderData.services.join(', ')}
⏰ Длительность: ${orderData.duration}
📅 Дата: ${orderData.booking_date}
💰 Сумма: ${orderData.total_price.toLocaleString()} ₽

📸 Скриншот оплаты прикреплен
    `.trim();

    // Отправляем в канал
    const channelFormData = new FormData();
    channelFormData.append('chat_id', CHANNEL_ID);
    channelFormData.append('photo', screenshot);
    channelFormData.append('caption', channelCaption);
    channelFormData.append('parse_mode', 'HTML');

    const channelResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: channelFormData,
    });

    if (!channelResponse.ok) {
      console.error('Channel notification failed');
    }

    // Отправляем уведомление воркеру (если есть)
    if (orderData.referrer_telegram_id) {
      const workerMessage = `
🎉 <b>Ваш клиент оплатил заказ!</b>

👤 Клиент: ${orderData.client_name}
💃 Модель: ${orderData.profile_name}
💰 Сумма: ${orderData.total_price.toLocaleString()} ₽

Заказ отправлен на проверку администратору.
      `.trim();

      const workerFormData = new FormData();
      workerFormData.append('chat_id', orderData.referrer_telegram_id.toString());
      workerFormData.append('text', workerMessage);
      workerFormData.append('parse_mode', 'HTML');

      const workerResponse = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        body: workerFormData,
      });

      if (!workerResponse.ok) {
        console.error('Worker notification failed');
      }
    }

    return true;
  } catch (error) {
    console.error('Error sending payment notification:', error);
    return false;
  }
}

// Функция для сохранения заказа в Supabase (вызывается с фронтенда)
export async function saveBookingToDatabase(orderData: OrderData): Promise<boolean> {
  try {
    const { supabase } = await import('./supabase');
    
    // Сохраняем заказ в таблицу bookings
    const { error } = await supabase
      .from('bookings')
      .insert({
        profile_id: parseInt(orderData.profile_id),
        client_telegram_id: orderData.client_id,
        client_username: orderData.client_username,
        client_first_name: orderData.client_name,
        services: orderData.services,
        duration: orderData.duration,
        booking_date: orderData.booking_date,
        total_price: orderData.total_price,
        status: 'pending',
        payment_method: 'card'
      });

    if (error) {
      console.error('Error saving booking:', error);
      return false;
    }

    return true;
  } catch (error) {
    console.error('Error saving booking to database:', error);
    return false;
  }
}
export async function getReferrerInfo(clientTelegramId: number): Promise<{name: string | null, telegram_id: number | null}> {
  try {
    const { supabase } = await import('./supabase');
    
    // Ищем клиента в таблице worker_clients
    const { data: clientData } = await supabase
      .from('worker_clients')
      .select(`
        worker_id,
        workers!inner(telegram_id, first_name, username)
      `)
      .eq('telegram_id', clientTelegramId)
      .single();

    if (clientData?.workers) {
      const worker = clientData.workers as any;
      return {
        name: worker.first_name || worker.username || null,
        telegram_id: worker.telegram_id || null
      };
    }

    return { name: null, telegram_id: null };
  } catch (error) {
    console.error('Error getting referrer info:', error);
    return { name: null, telegram_id: null };
  }
}