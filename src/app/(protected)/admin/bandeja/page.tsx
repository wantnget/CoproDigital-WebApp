"use client";

import { useProtectedRoute } from "@/hooks/use-protected-route";
import { LoadingScreen } from "@/components/LoadingScreen";
import { BandejaView } from "@/components/bandeja/BandejaView";

export default function AdminBandejaPage() {
    const { isAuthorized, loading: authLoading } = useProtectedRoute({
        allowedRoles: ["admin"],
    });

    if (authLoading) return <LoadingScreen message="Cargando bandeja..." />;
    if (!isAuthorized) return null;

    // Admin ve TODAS las solicitudes — sin filtro de cédula.
    return <BandejaView mode="admin" />;
}
