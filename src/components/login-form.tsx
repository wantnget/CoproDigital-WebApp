"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Mail, ShieldCheck, Eye, EyeOff, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";

export function LoginForm({
    className,
    ...props
}: React.ComponentProps<"div">) {
    const { login, user, profile, error, loading } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);
    const [hasAuthError, setHasAuthError] = useState(false);

    useEffect(() => {
        if (user && profile) {
            if (profile.role === "admin") {
                router.replace("/admin");
            } else {
                router.replace("/usuario");
            }
        }
    }, [user, profile, router]);

    useEffect(() => {
        if (error) setHasAuthError(true);
    }, [error]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setHasAuthError(false);

        if (!email || !password) {
            setFormError("Email y contraseña son obligatorios");
            return;
        }

        await login(email, password);
    };

    const errorMessage =
        formError || (hasAuthError ? error || "Correo o contraseña incorrectos." : null);
    const showErrorState = !!errorMessage;

    const inputBase =
        "w-full h-12 rounded-[10px] border-[1.2px] bg-white pl-11 pr-11 text-base shadow-sm outline-none transition";
    const inputNormal =
        "border-[#0D0D0D]/15 focus:border-[#F29A2E] focus:ring-2 focus:ring-[#F29A2E]/30";
    const inputError =
        "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200";

    return (
        <div
            className={cn(
                "flex h-[100dvh] w-full items-center justify-center bg-white p-[10px]",
                className,
            )}
            {...props}
        >
            <div className="flex w-full max-w-[384px] flex-col gap-6 px-[16px]">
                {/* Logo de Want siempre arriba */}
                <div className="flex w-full justify-center">
                    <img
                        src="https://i.imgur.com/kBwQizJ.jpeg"
                        alt="Want logo"
                        className="h-20 w-20"
                    />
                </div>

                {/* Encabezado */}
                <div className="flex flex-col gap-1">
                    <h1 className="text-left text-2xl font-semibold tracking-tight text-[#012340]">
                        Inicia sesión en WANT N' GET
                    </h1>

                    <p className="text-left text-base font-medium text-[#0D0D0D]/60">
                        Continúa para acceder a la plataforma
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                    {/* Email */}
                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="email"
                            className="text-sm font-semibold text-[#012340]"
                        >
                            Correo electrónico
                        </label>
                        <div className="relative">
                            <Mail
                                className={cn(
                                    "pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 transition",
                                    showErrorState ? "text-red-500" : "text-[#0D0D0D]/40",
                                )}
                            />
                            <input
                                id="email"
                                type="email"
                                placeholder="Ingresa tu correo"
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (showErrorState) setHasAuthError(false);
                                }}
                                required
                                className={cn(
                                    inputBase,
                                    showErrorState ? inputError : inputNormal,
                                )}
                            />
                            {email && (
                                <button
                                    type="button"
                                    onClick={() => setEmail("")}
                                    className="absolute top-1/2 right-3.5 -translate-y-1/2 text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70 transition"
                                    aria-label="Limpiar email"
                                >
                                    <X className="h-5 w-5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Contraseña */}
                    <div className="flex flex-col gap-2">
                        <label
                            htmlFor="password"
                            className="text-sm font-semibold text-[#012340]"
                        >
                            Contraseña
                        </label>
                        <div className="relative">
                            <ShieldCheck
                                className={cn(
                                    "pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 transition",
                                    showErrorState ? "text-red-500" : "text-[#0D0D0D]/40",
                                )}
                            />
                            <input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Ingresa tu contraseña"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (showErrorState) setHasAuthError(false);
                                }}
                                required
                                className={cn(
                                    inputBase,
                                    showErrorState ? inputError : inputNormal,
                                )}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword((v) => !v)}
                                className={cn(
                                    "absolute top-1/2 right-3.5 -translate-y-1/2 transition",
                                    showErrorState
                                        ? "text-red-500 hover:text-red-700"
                                        : "text-[#0D0D0D]/40 hover:text-[#0D0D0D]/70",
                                )}
                                aria-label={
                                    showPassword ? "Ocultar contraseña" : "Mostrar contraseña"
                                }
                            >
                                {showPassword ? (
                                    <EyeOff className="h-5 w-5" />
                                ) : (
                                    <Eye className="h-5 w-5" />
                                )}
                            </button>
                        </div>

                        {/* Mensaje de error */}
                        {showErrorState && (
                            <p className="mt-1 text-sm font-medium text-red-600">
                                {errorMessage}
                            </p>
                        )}
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="h-12 w-full rounded-[10px] bg-[#F29A2E] text-base font-semibold text-[#0D0D0D] shadow-sm transition hover:bg-[#F28A2E] disabled:opacity-50"
                    >
                        {loading ? "Iniciando sesión..." : "Iniciar sesión"}
                    </Button>
                </form>

                <div className="text-center">
                    <a
                        href="/forgot-password"
                        className="text-sm font-medium text-[#F28A2E] hover:underline"
                    >
                        Olvidé mi contraseña
                    </a>
                </div>
            </div>
        </div>
    );
}
