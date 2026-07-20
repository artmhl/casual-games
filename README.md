# ◈ GameHub

Модульна платформа для казуальних ігор побудована на React + Vite.  
Підтримує як ігри для одного екрану (Локальні), так і **Онлайн Мультиплеєр** (через Supabase).
Кожна гра — незалежний модуль. Нові ігри додаються без зміни ядра платформи.

---

## Стек

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?style=flat-square&logo=supabase&logoColor=white)

---

## Швидкий старт

### 1. Змінні середовища (Мультиплеєр)
Для роботи мультиплеєрних ігор потрібен безкоштовний проєкт на [Supabase](https://supabase.com/).
Скопіюйте файл `.env.example` у `.env` та вкажіть ваші ключі:
```env
VITE_SUPABASE_URL=ваша_url_адреса
VITE_SUPABASE_ANON_KEY=ваш_секретний_ключ
```
*(При розгортанні на Vercel не забудьте додати ці змінні в налаштуваннях проєкту)*

### 2. Запуск локально
```bash
npm install
npm run dev
```

---

## Структура проєкту

```
src/
├── games/
│   ├── registry.js      ← реєстр ігор та їх метадані (єдиний файл, що змінюється)
│   └── <slug>/
│       └── index.jsx    ← компонент вашої гри
├── components/          ← спільні UI-компоненти (Головне меню тощо)
└── index.css            ← глобальні стилі
```

Кожна гра доступна за адресою `/games/<slug>`.

---

## Як додати нову гру

**1. Створи папку гри та компонент:**
```jsx
// src/games/my-game/index.jsx
export default function MyGame() {
  return <div>Код гри тут</div>
}
```

**2. Зареєструй у `src/games/registry.js`:**
```js
import { lazy } from 'react'

const games = [
  {
    slug: "my-game",
    title: "Моя гра",
    description: "Короткий опис",
    emoji: "🎮",
    minPlayers: 2,
    maxPlayers: 10,
    tags: ["мультиплеєр", "казуальна"], // Тег "мультиплеєр" переносить гру в онлайн-блок
    component: lazy(() => import("./my-game/index.jsx")),
  }
]
export default games;
```

Гра автоматично з'явиться на головній сторінці.

---

## Правила для ігор

- Гра — повністю самодостатній React-компонент.
- Не імпортує нічого з інших ігор.
- Ігри між собою не пов'язані і не залежать одна від одної.
- Якщо гра потребує мультиплеєру, вона використовує спільний клієнт `import { supabase } from "../../lib/supabase"`.
