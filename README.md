# Task Manager Desktop (JavaScript + Electron)

Desktop-приложение для задач и заметок.

## Что внутри

- Electron + Vanilla JS
- Локальная файловая БД `task_manager.json`
- Авторизация/регистрация (PBKDF2 hash)
- Папки и вложенные папки
- Заметки, поиск, теги, pin, дедлайн, изображение
- Подсветка просроченных
- Корзина (soft delete)
- Светлая/тёмная тема
- Режимы заметки: просмотр и редактирование
- Горячая клавиша сохранения: `Ctrl/Cmd + S`

## Разработка

```bash
cd /Users/stanislav/Desktop/askar
npm install
npm start
```

## Сборка в .exe

```bash
npm install
npm run build:win
```

Артефакты будут в папке `release/`:
- `TaskManager-<version>-<arch>.exe` (installer NSIS)
- `TaskManager-<version>-<arch>.exe` (portable)

### Важно про сборку на Windows

- Надёжнее всего собирать `.exe` на Windows.
- На macOS/Linux кросс-сборка `.exe` может требовать дополнительную настройку окружения.

## Структура

- `main.js` — окно Electron, IPC
- `preload.js` — bridge API
- `db.js` — слой данных
- `src/index.html` — шаблон
- `src/styles.css` — стили
- `src/renderer.js` — UI и логика
