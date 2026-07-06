# ◈ GameHub

Модульна платформа для казуальних ігор побудована на React + Vite.  
Кожна гра — незалежний модуль. Нові ігри додаються без зміни ядра платформи.

---

## Стек

![React](https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-6-CA4245?style=flat-square&logo=react-router&logoColor=white)

---

## Запуск

```bash
# Встановити залежності
npm install

# Режим розробки
npm run dev

# Продакшн збірка
npm run build
```

---

## Структура проєкту

```
src/
├── registry.js          ← реєстр ігор (єдиний файл що змінюється)
├── games/
│   └── <slug>/
│       ├── index.jsx    ← компонент гри
│       └── meta.js      ← метадані (назва, іконка, опис)
├── components/          ← спільні UI-компоненти (не змінювати)
├── pages/               ← роутинг (не змінювати)
└── styles/              ← глобальні CSS-токени (не змінювати)
```

Кожна гра доступна за адресою `/game/<slug>`.

---

## Як додати нову гру

> Детальна інструкція: [`ДОДАТИ_ГРУ.md`](./ДОДАТИ_ГРУ.md)

**Коротко — три кроки:**

**1. Створи папку гри**

```
src/games/my-game/
```

**2. Створи компонент і метадані**

```jsx
// src/games/my-game/index.jsx
export default function MyGame() {
  return <div>Код гри тут</div>
}
```

```js
// src/games/my-game/meta.js
export default {
  title: 'Моя гра',
  description: 'Короткий опис',
  emoji: '🎮',
  players: '1',         // '1' | '2' | '1-4' | '2+'
  tags: ['казуальна'],
  color: '#7c6aff',
}
```

**3. Зареєструй у `src/registry.js`**

```js
import { lazy } from 'react'

export const GAMES = [
  {
    slug: 'my-game',
    component: lazy(() => import('./games/my-game')),
    meta: {
      title: 'Моя гра',
      description: 'Короткий опис',
      emoji: '🎮',
      players: '1',
      tags: ['казуальна'],
      color: '#7c6aff',
    }
  },
]
```

Гра автоматично з'явиться на головній і буде доступна за `/game/my-game`.

---

## Правила для ігор

- Гра — повністю самодостатній React-компонент
- Не імпортує нічого з-за межі своєї папки
- Використовує лише React та вбудований CSS (inline або CSS modules у тій самій папці)
- Ігри між собою не пов'язані і не залежать одна від одної

---

## Дизайн-токени

Доступні CSS-змінні для використання в іграх:

| Змінна | Значення | Призначення |
|---|---|---|
| `--bg-base` | `#0a0a0f` | основний фон |
| `--bg-card` | `#16161f` | фон карток |
| `--text-primary` | `#f0f0ff` | основний текст |
| `--text-secondary` | `#8888aa` | другорядний текст |
| `--accent` | `#7c6aff` | фіолетовий акцент |
| `--accent-2` | `#ff6a9b` | рожевий акцент |
| `--accent-3` | `#6affca` | бірюзовий акцент |
| `--border` | `#2a2a3a` | колір рамок |

---

## Промт для ШІ (додавання гри без контексту)

```
Читай файл ДОДАТИ_ГРУ.md у корені проєкту.
Додай гру: [назва гри]. Slug: [slug].
Створи src/games/[slug]/index.jsx та зареєструй у src/registry.js.
```
