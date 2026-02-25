# Task Manager Desktop (JavaScript + Electron)

Desktop-приложение для задач и заметок.

## Что внутри

- Electron + Vanilla JS
- Файловая БД: `task_manager.json` (без нативных модулей)
- Авторизация/регистрация (PBKDF2 hash)
- Папки и вложенные папки
- Заметки, поиск, теги, pin, дедлайн, изображение
- Подсветка просроченных
- Корзина (soft delete)
- Светлая/тёмная тема
- Режимы заметки: просмотр и редактирование
- Сохранение заметки с возвратом в просмотр
- Горячая клавиша сохранения: `Ctrl/Cmd + S`

## Запуск

```bash
cd /Users/stanislav/Desktop/askar
npm install
npm start
```

Если хотите полностью чистую переустановку зависимостей:

```bash
rm -rf node_modules package-lock.json
npm install
```

## Структура

- `main.js` — окно Electron, IPC
- `preload.js` — bridge API
- `db.js` — слой данных
- `src/index.html` — шаблон
- `src/styles.css` — стили
- `src/renderer.js` — UI и логика
