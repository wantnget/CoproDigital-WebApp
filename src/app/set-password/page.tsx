"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { auth, CAPTURED_AUTH_HASH, profiles } from "@/lib/supabase";
import { LoadingScreen } from "@/components/LoadingScreen";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, Loader2, CheckCircle } from "lucide-react";

/**
 * Set-password — pagina a la que llega el usuario tras el email de invitacion.
 *
 * Flujo:
 *   1. Al cargar la app, lib/supabase/client capturo el hash en
 *      CAPTURED_AUTH_HASH y limpio la URL (antes de que el SDK lo consumiera).
 *   2. Aqui leemos esos tokens, cerramos cualquier sesion previa (admin
 *      logueado en el mismo navegador, etc), y establecemos la sesion del
 *      invitado con setSession.
 *   3. Mostramos formulario. Al guardar, llamamos a auth.updatePassword
 *      (que internamente usa REST directo para evitar deadlock).
 *   4. Cerramos sesion y mandamos a /login para que entre con su nueva
 *      contrasena, dejando el navegador limpio.
 */
export default function SetPasswordPage() {
    const router = useRouter();
    const [ready, setReady] = useState(false);
    const [hasSession, setHasSession] = useState(false);
    const [password, setPassword] = useState("");
    const [confirm, setConfirm] = useState("");
    const [showPass, setShowPass] = useState(false);
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);
    const [error, setError] = useState("");

    const accessTokenRef = useRef<string | null>(null);
    const userIdRef = useRef<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        const finish = (errMsg?: string, sessionOk = false) => {
            if (cancelled) return;
            if (errMsg) setError(errMsg);
            if (sessionOk) setHasSession(true);
            setReady(true);
        };

        (async () => {
            const hash = CAPTURED_AUTH_HASH.startsWith("#")
                ? CAPTURED_AUTH_HASH.slice(1)
                : CAPTURED_AUTH_HASH;
            const params = new URLSearchParams(hash);
            const access_token = params.get("access_token");
            const refresh_token = params.get("refresh_token");

            // Caso A: tokens del email de invitacion.
            if (access_token && refresh_token) {
                accessTokenRef.current = access_token;

                // Cerrar cualquier sesion previa (no afecta otros dispositivos).
                await auth.signOut("local");
                if (cancelled) return;

                const r = await auth.setSessionFromTokens(
                    access_token,
                    refresh_token,
                );
                if (cancelled) return;

                if (!r.ok) {
                    finish(
                        "No se pudo verificar la invitacion: " + r.error.message,
                    );
                    return;
                }
                
                if (r.data?.user) userIdRef.current = r.data.user.id;
                
                finish(undefined, true);
                return;
            }

            // Caso B: sin tokens. Quiza ya hay sesion (refresh tras procesar).
            const session = await auth.getSession();
            if (cancelled) return;

            if (session.ok && session.data?.user) {
                accessTokenRef.current = session.data.access_token;
                userIdRef.current = session.data.user.id;
                finish(undefined, true);
                return;
            }

            finish(
                "Token de invitacion invalido o expirado. Solicita una nueva invitacion.",
            );
        })();

        return () => {
            cancelled = true;
        };
    }, []);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (password.length < 6) {
            setError("La contrasena debe tener al menos 6 caracteres.");
            return;
        }
        if (password !== confirm) {
            setError("Las contrasenas no coinciden.");
            return;
        }

        const token = accessTokenRef.current;
        if (!token) {
            setError(
                "No se encontro el token de la invitacion. Por favor, abre el enlace del correo nuevamente.",
            );
            return;
        }

        setLoading(true);
        const r = await auth.updatePassword(password, token);

        if (!r.ok) {
            setError(r.error.message);
            setLoading(false);
            return;
        }
        
        // Actualizamos el estado del perfil a true
        if (userIdRef.current) {
            await profiles.updateProfile(userIdRef.current, { estado: true });
        }
        
        setLoading(false);
        setDone(true);
        setTimeout(async () => {
            await auth.signOut("local");
            router.replace("/login");
        }, 2000);
    };

    if (!ready) return <LoadingScreen message="Verificando tu invitacion..." />;

    if (!hasSession) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
                <div className="w-full max-w-md p-8 bg-white shadow-xl">
                    <div className="mb-6">
                        <p className="text-xs font-bold tracking-widest text-[#F29A2E] uppercase mb-1">
                            Invitacion
                        </p>
                        <h1 className="text-2xl font-bold text-[#012340]">
                            No pudimos verificar tu invitacion
                        </h1>
                    </div>
                    <p className="text-sm text-red-600 font-medium mb-6">
                        {error || "Token de invitacion invalido o expirado."}
                    </p>
                    <Button
                        onClick={() => router.replace("/login")}
                        className="rounded-none bg-[#012340] hover:bg-[#012340]/90 text-white h-11 font-bold tracking-widest text-xs w-full"
                    >
                        VOLVER AL INICIO DE SESION
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA]">
            <div className="w-full max-w-md p-8 bg-white shadow-xl">
                <div className="mb-8">
                    <p className="text-xs font-bold tracking-widest text-[#F29A2E] uppercase mb-1">
                        Bienvenido
                    </p>
                    <h1 className="text-2xl font-bold text-[#012340]">
                        Crea tu contrasena
                    </h1>
                    <p className="text-sm text-[#0D0D0D]/50 mt-1">
                        Define una contrasena segura para acceder a tu cuenta.
                    </p>
                </div>

                {done ? (
                    <div className="flex items-center justify-center gap-2 py-8 text-sm font-medium text-green-600">
                        <CheckCircle className="h-5 w-5" />
                        Contraseña creada. Redirigiendo...
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[#0D0D0D]/60 uppercase tracking-wider">
                                Nueva contrasena
                            </label>
                            <div className="relative">
                                <Input
                                    type={showPass ? "text" : "password"}
                                    placeholder="Minimo 6 caracteres"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="rounded-none border-[#0D0D0D]/20 pr-10 focus-visible:ring-0 focus-visible:border-[#012340]"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPass((v) => !v)}
                                    className="absolute right-3 top-2.5 text-[#0D0D0D]/40 hover:text-[#0D0D0D] transition-colors"
                                >
                                    {showPass ? (
                                        <EyeOff className="h-4 w-4" />
                                    ) : (
                                        <Eye className="h-4 w-4" />
                                    )}
                                </button>
                            </div>
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-semibold text-[#0D0D0D]/60 uppercase tracking-wider">
                                Confirmar contrasena
                            </label>
                            <Input
                                type={showPass ? "text" : "password"}
                                placeholder="Repite tu contrasena"
                                value={confirm}
                                onChange={(e) => setConfirm(e.target.value)}
                                required
                                className="rounded-none border-[#0D0D0D]/20 focus-visible:ring-0 focus-visible:border-[#012340]"
                            />
                        </div>

                        {error && (
                            <p className="text-sm text-red-600 font-medium">
                                {error}
                            </p>
                        )}

                        <Button
                            type="submit"
                            disabled={loading}
                            className="rounded-none bg-[#012340] hover:bg-[#012340]/90 text-white h-11 font-bold tracking-widest text-xs mt-2"
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                                    Guardando...
                                </>
                            ) : (
                                "CONFIRMAR CONTRASENA"
                            )}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}
