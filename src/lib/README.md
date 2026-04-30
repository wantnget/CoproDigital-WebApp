# `src/lib/` — guía de uso

Esta carpeta concentra toda la integración con servicios externos. **Toda
nueva llamada a Supabase o a un servicio externo debe pasar por estos
módulos**, no usar el cliente directo desde un componente.

## Estructura

```
src/lib/
├── supabase/      ← Supabase: auth, perfiles, helpers
│   ├── client.ts        # cliente del navegador (singleton)
│   ├── server.ts        # cliente con service role (solo server)
│   ├── safe-call.ts     # envoltura con timeout + formato uniforme
│   ├── auth.ts          # signIn, signOut, updatePassword, etc.
│   ├── profiles.ts      # getProfile, listProfiles
│   ├── types.ts         # SafeResult, SafeError, Profile
│   └── index.ts         # barrel
│
├── email/         ← envío de correo (Resend)
│   ├── resend.ts        # adaptador Resend
│   ├── templates.ts     # plantillas HTML
│   ├── types.ts
│   └── index.ts
│
└── api/           ← orquestación server-side
    └── invitations.ts   # crear usuario + enviar email de invitación
```

## Reglas de oro

### 1. Cliente Supabase: uno solo

En el navegador, importar siempre desde `@/lib/supabase`. **No instanciar otro
`createClient`** en código de cliente.

```ts
import { supabase, auth, profiles } from "@/lib/supabase";
```

En código server (rutas `/api`, server actions), usar `getSupabaseAdmin()` de
`@/lib/supabase/server`.

### 2. Toda llamada pasa por `safeCall` (o por un helper de `auth`/`profiles`)

```ts
// ❌ Mal — sin timeout, sin formato uniforme:
const { data, error } = await supabase.from("foo").select("*");

// ✓ Bien — usando un helper existente:
const r = await profiles.listProfiles();
if (!r.ok) {
    showToast(r.error.message);
    return;
}
console.log(r.data);

// ✓ Bien — para una consulta nueva sin helper, envolver en safeCall:
import { safeCall, supabase } from "@/lib/supabase";

const r = await safeCall(
    () => supabase.from("solicitudes").select("*").eq("user_id", userId),
    { label: "solicitudes.listMine" },
);
```

### 3. `SafeResult<T>` siempre

Todas las helpers devuelven `SafeResult<T> = { ok: true, data: T } | { ok: false, error: SafeError }`.

```ts
const r = await auth.signIn(email, password);
if (!r.ok) {
    if (r.error.code === "auth") setError("Credenciales inválidas");
    else if (r.error.code === "timeout") setError("Sin conexión");
    else setError(r.error.message);
    return;
}
// r.data está tipado y disponible
```

### 4. NUNCA `await` directo dentro de `onAuthStateChange`

El SDK mantiene un lock interno mientras el callback corre. Si dentro del
callback haces otra llamada al cliente, se produce un **deadlock que cuelga
operaciones futuras** (ej. `updateUser` no resuelve nunca).

Forma correcta:

```ts
supabase.auth.onAuthStateChange((event, session) => {
    setUser(session?.user ?? null);          // sync OK
    if (session?.user) {
        setTimeout(() => {                    // diferir async
            fetchProfile(session.user.id);
        }, 0);
    }
});
```

`AuthContext.tsx` ya implementa este patrón.

## Por qué tantos cuidados

Los problemas que se prevenían:

- **Hash consumido por el SDK antes de tiempo**: `detectSessionInUrl: true`
  lee tokens del hash automáticamente al cargar. Si la página `/set-password`
  intenta leer el hash después, ya no está. Solución: `client.ts` captura el
  hash en `CAPTURED_AUTH_HASH` ANTES de que el SDK se inicialice y limpia la URL.

- **Deadlock en `updateUser`**: documentado por Supabase, ocurre cuando algún
  listener de `onAuthStateChange` ejecuta `await` dentro del callback.
  Solución: `auth.updatePassword` usa fetch directo al endpoint REST, inmune
  al lock; y `AuthContext` difiere todo `await` con `setTimeout(0)`.

- **UI colgada**: cualquier petición a Supabase puede quedar sin resolver
  (red caída, deadlock, bug del SDK). Solución: `safeCall` aplica timeout
  duro, así la UI siempre desbloquea con un error claro en máximo 15 segundos.

- **Mezcla de sesiones**: si el admin invita y abre el link en su propio
  navegador, la sesión activa antes del clic interfiere. Solución:
  `set-password` hace `signOut("local")` antes de `setSession` con los
  tokens del invitado.

## Cómo agregar una nueva entidad

Ejemplo: `solicitudes`. Crear `src/lib/supabase/solicitudes.ts`:

```ts
import { supabase } from "./client";
import { safeCall } from "./safe-call";
import type { SafeResult } from "./types";

export interface Solicitud {
    id: string;
    user_id: string;
    estado: string;
    monto: number;
    created_at: string;
}

export async function listMine(userId: string): Promise<SafeResult<Solicitud[]>> {
    return safeCall(
        async () => {
            const { data, error } = await supabase
                .from("solicitudes")
                .select("*")
                .eq("user_id", userId)
                .order("created_at", { ascending: false });
            return { data: (data ?? []) as Solicitud[], error };
        },
        { label: "solicitudes.listMine" },
    );
}

export async function create(input: Omit<Solicitud, "id" | "created_at">) {
    return safeCall(
        async () => {
            const { data, error } = await supabase
                .from("solicitudes")
                .insert(input)
                .select()
                .single();
            return { data: data as Solicitud | null, error };
        },
        { label: "solicitudes.create" },
    );
}
```

Y en `index.ts`:

```ts
export * as solicitudes from "./solicitudes";
```

Listo. Ya tienes timeout, errores tipados y formato consistente en toda la app.

## Joins entre tablas (ejemplo: bandeja)

Cuando una pantalla necesita unir varias tablas relacionadas (como
`motor_process` + `valida1_requests` + `motor_data` + `identity_validations`
unidas por `radicado`), el patrón es:

1. Trae la tabla "principal" (la que define el universo de filas).
2. Con los IDs/radicados de esa tabla, trae las demás en paralelo con
   `Promise.all` y un `.in("radicado", radicados)`.
3. Indexa cada resultado por la clave en un `Map` y arma el shape final
   en memoria.

Implementación de referencia: `src/lib/supabase/bandeja.ts`. Las consultas
secundarias (`valida1_requests`, etc) que fallen no rompen la pantalla:
se loguea el error y la solicitud aparece con la info que sí se pudo
obtener.

## Email

Para enviar un email desde una ruta `/api`:

```ts
import { sendEmail, renderInvitationEmail } from "@/lib/email";

const tpl = renderInvitationEmail({ ... });
const r = await sendEmail({
    to: "alguien@correo.com",
    subject: tpl.subject,
    html: tpl.html,
    text: tpl.text,
});
if (!r.ok) console.error(r.error);
```

Cambiar de proveedor (Mailgun, Postmark, SES) es solo crear otro adaptador con
la misma firma `(SendEmailParams) => Promise<EmailResult>` y cambiar la
exportación en `email/index.ts`. El resto de la app no se entera.
