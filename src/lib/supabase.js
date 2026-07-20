/**
 * SUPABASE CLIENT
 * ================
 * Singleton-клієнт для всіх мультиплеєр-ігор порталу.
 *
 * Використання в грі:
 *   import { supabase } from "../../lib/supabase";
 *
 * Налаштування:
 *   Створи .env файл (або додай у Vercel → Settings → Environment Variables):
 *     VITE_SUPABASE_URL=https://xxxx.supabase.co
 *     VITE_SUPABASE_ANON_KEY=eyJ...
 */

import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "[Supabase] Відсутні змінні середовища VITE_SUPABASE_URL або VITE_SUPABASE_ANON_KEY.\n" +
    "Створи .env файл або додай змінні у Vercel Dashboard."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
