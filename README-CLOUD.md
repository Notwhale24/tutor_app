**Версия: 2.0.4**

# Tutor Manager — облачная версия

Эта версия переводит хранение Tutor Manager из одного браузера в Supabase и добавляет вход по паролю через Supabase Auth. Интерфейс и локальная версия приложения сохраняются.

## 1. Переменные окружения

Создайте `.env.local` в корне проекта:

```env
VITE_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
VITE_APP_LOGIN_EMAIL=your-login-email@example.com
```

Используйте только Publishable key. Secret/service_role key не помещайте в `.env.local` клиентского приложения.

## 2. Установка

```powershell
npm.cmd install
```

## 3. Запуск

```powershell
npm.cmd run dev -- --host 0.0.0.0
```

Откройте адрес Vite, обычно `http://localhost:5173/`.

## 4. Первый вход

Используйте пароль пользователя, созданного в Supabase → Authentication → Users.

Если в базе Supabase ещё нет записей, приложение один раз переносит текущие локальные данные из localStorage в облако. После этого изменения синхронизируются обратно в Supabase.

## 5. SQL

Перед запуском приложения в Supabase должен быть выполнен SQL-схем Tutor Manager, который создал таблицы `students`, `lessons`, `homework`, `homework_files`, `payments`, `settings`, RLS и bucket `homework-files`.
