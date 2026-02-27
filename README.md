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

## Своя иконка приложения

Конфиг уже подключен в `package.json`:
- `build.win.icon`
- `build.nsis.installerIcon`
- `build.nsis.uninstallerIcon`

### Куда положить иконку

Положите файл:
- `build/icons/icon.ico`

В проекте уже создана папка:
- `build/icons/`

### Требования к иконке для Windows

- Формат: `.ico`
- Желательно включить размеры: `16x16`, `32x32`, `48x48`, `64x64`, `128x128`, `256x256`
- Рекомендуется квадратный исходник (например `1024x1024`) без мелких деталей

### Если у вас PNG/JPG, как сделать ICO

Через онлайн-конвертер:
- `png` -> `ico` и сохранить как `build/icons/icon.ico`

Через ImageMagick (локально):

```bash
magick icon.png -define icon:auto-resize=256,128,64,48,32,16 build/icons/icon.ico
```

### Сборка после замены иконки

```bash
npm run build:win
```

Готовые `.exe` будут в папке `release/`.

## Структура

- `main.js` — окно Electron, IPC
- `preload.js` — bridge API
- `db.js` — слой данных
- `src/index.html` — шаблон
- `src/styles.css` — стили
- `src/renderer.js` — UI и логика
