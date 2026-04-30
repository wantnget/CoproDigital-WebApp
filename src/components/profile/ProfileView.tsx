"use client";

import { useAuth } from "@/contexts/AuthContext";
import { User, Mail, Shield, CheckCircle2, XCircle, Clock } from "lucide-react";

export function ProfileView() {
    const { profile } = useAuth();

    if (!profile) return null;

    return (
        <div className="w-full flex flex-col gap-10 mt-2">
            {/* Cabecera plana sin card */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pb-8 border-b border-slate-200">
                <div className="h-24 w-24 rounded-full bg-[#012340] text-white flex items-center justify-center text-4xl font-bold flex-shrink-0">
                    {profile.username?.charAt(0).toUpperCase()}
                </div>
                <div>
                    <h2 className="text-3xl font-extrabold text-[#012340]">{profile.username}</h2>
                    <p className="text-lg text-[#0D0D0D]/60 flex items-center gap-2 mt-1 font-medium">
                        <Mail className="h-5 w-5" />
                        {profile.email}
                    </p>
                </div>
            </div>
            
            {/* Contenido principal */}
            <div>
                <h3 className="text-sm font-bold tracking-widest uppercase text-[#0D0D0D]/40 mb-8">
                    Información de la cuenta
                </h3>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12">
                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-[#0D0D0D]/50 flex items-center gap-2">
                            <User className="h-4 w-4" />
                            ID de Usuario
                        </p>
                        <p className="font-mono text-[15px] font-medium text-[#012340] break-all">
                            {profile.id}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-[#0D0D0D]/50 flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            Rol
                        </p>
                        <p className="text-[15px] font-semibold text-[#012340] capitalize">
                            {profile.role}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-[#0D0D0D]/50 flex items-center gap-2">
                            {profile.estado ? <CheckCircle2 className="h-4 w-4 text-green-500" /> : <XCircle className="h-4 w-4 text-red-500" />}
                            Estado
                        </p>
                        <div>
                            {profile.estado ? (
                                <span className="text-green-700 bg-green-50 px-3 py-1 rounded-full text-sm font-bold">Activo</span>
                            ) : (
                                <span className="text-red-700 bg-red-50 px-3 py-1 rounded-full text-sm font-bold">Inactivo</span>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <p className="text-sm font-semibold text-[#0D0D0D]/50 flex items-center gap-2">
                            <Clock className="h-4 w-4" />
                            Fecha de registro
                        </p>
                        <p className="text-[15px] font-semibold text-[#012340]">
                            {profile.created_at ? new Date(profile.created_at).toLocaleDateString("es-CO", {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                            }) : "No disponible"}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
