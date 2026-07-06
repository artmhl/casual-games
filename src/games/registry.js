/**
 * РЕЄСТР ІГОР
 * ============
 * Щоб додати нову гру:
 * 1. Створи папку src/games/<slug>/
 * 2. Додай файл src/games/<slug>/index.jsx
 * 3. Додай запис нижче
 *
 * Більше деталей — дивись README_AI.md
 */

import { lazy } from "react";

const games = [
  {
    slug: "spy",
    title: "Шпигун",
    description: "Знайди шпигуна серед гравців! 4 режими, передача телефону, голосування.",
    emoji: "🕵️",
    minPlayers: 3,
    maxPlayers: 10,
    tags: ["компанія", "блеф", "детектив"],
    component: lazy(() => import("./spy/index.jsx")),
  },
];

export default games;
