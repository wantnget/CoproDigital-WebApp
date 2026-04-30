/**
 * Cliente Supabase del lado del navegador.
 *
 * IMPORTANTE — orden de evaluación:
 *
 *   1. Capturamos el hash de la URL (si parece de auth: invite, recovery,
 *      etc.) ANTES de instanciar el cliente. El SDK tiene
 *      `detectSessionInUrl: true` por defecto y, si lo dejamos correr, consume
 *      el hash automáticamente. Esto rompe nuestro flujo de /set-password
 *      porque, para cuando esa página intenta leer los tokens, ya no están.
 *
 *   2. Limpiamos la URL para que un refresh accidental no reintente con un
 *      token ya usado, y para que el SDK al inicializar no encuentre nada
 *      pendiente que procesar.
 *
 *   3. Recién entonces creamos el cliente.
 *
 * REGLA DE ORO del proyecto:
 *   - En el navegador, importar el cliente SIEMPRE desde "@/lib/supabase".
 *   - NO crear otro `createClient` en código de cliente.
 *   - Para el lado servidor (rutas /api con service role), está
 *     `./server.ts`, que usa otra clave y no toca el navegador.
 */
import { createClient } from "@supabase/supabase-js";

let _capturedHash = "";
if (typeof window !== "undefined") {
    const h = window.location.hash || "";
    if (
        h &&
        (h.includes("access_token") ||
            h.includes("type=invite") ||
            h.includes("type=signup") ||
            h.includes("type=recovery") ||
            h.includes("type=magiclink"))
    ) {
        _capturedHash = h;
        try {
            window.history.replaceState(
                null,
                "",
                window.location.pathname + window.location.search,
            );
        } catch {
            /* replaceState raramente falla; si lo hace seguimos igual */
        }
    }
}

/** Hash de auth capturado al cargar la app, accesible desde cualquier lugar. */
export const CAPTURED_AUTH_HASH = _capturedHash;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Cliente único del lado navegador. NO instanciar otro. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/** Útiles para llamadas REST directas (bypass del SDK cuando hace falta). */
export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_ANON_KEY = supabaseAnonKey;
