"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { User, LogOut, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export function UserMenu() {
    const { profile, user, logout } = useAuth();
    const router = useRouter();
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, []);

    const handleLogout = async () => {
        setOpen(false);
        await logout();
        router.replace("/login");
    };



    const initial = profile?.username?.[0]?.toUpperCase() || "?";
    const roleLabel = profile?.role === "admin" ? "Administrador" : "Usuario";

    return (
        <div ref={ref} className="relative">
            <button
                onClick={() => setOpen((v) => !v)}
                className="group flex items-center gap-3 rounded-xl p-1.5 transition-all outline-none hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-[#F29A2E] active:scale-[0.98]"
            >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#F29A2E] to-[#d87c14] text-sm font-bold text-white shadow-sm ring-2 ring-white transition-all group-hover:shadow-md">
                    {initial}
                </div>
                <div className="hidden flex-col items-start text-left sm:flex">
                    <span className="text-sm font-semibold tracking-tight text-[#012340]">
                        {profile?.username || user?.email?.split("@")[0] || "Usuario"}
                    </span>
                    <span className="text-xs font-medium text-[#0D0D0D]/50">{roleLabel}</span>
                </div>
                <ChevronDown
                    className={cn(
                        "ml-1 h-4 w-4 text-[#0D0D0D]/40 transition-transform duration-200 group-hover:text-[#012340]",
                        open && "rotate-180 text-[#012340]",
                    )}
                />
            </button>

            {open && (
                <div className="absolute right-0 top-[calc(100%+8px)] z-50 w-64 origin-top-right overflow-hidden rounded-xl border border-[#0D0D0D]/10 bg-white/95 backdrop-blur-md shadow-xl transition-all animate-in fade-in zoom-in-95">
                    <div className="border-b border-[#0D0D0D]/10 px-4 py-4 bg-black/5">
                        <p className="truncate text-sm font-bold text-[#012340]">
                            {profile?.username || user?.email?.split("@")[0] || "Usuario"}
                        </p>
                        <p className="truncate text-xs font-medium text-[#0D0D0D]/60 mt-0.5">
                            {user?.email}
                        </p>
                    </div>

                    <div className="p-2 space-y-1">
                        <button
                            onClick={handleLogout}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 transition-all hover:bg-red-50 hover:text-red-700"
                        >
                            <LogOut className="h-4 w-4" />
                            Cerrar sesión
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}