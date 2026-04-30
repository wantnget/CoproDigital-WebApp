"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

type Role = "admin" | "user";

interface UseProtectedRouteOptions {
    allowedRoles?: Role[];
}

export function useProtectedRoute({ allowedRoles }: UseProtectedRouteOptions = {}) {
    const { user, profile, loading, error, refreshProfile } = useAuth();
    const router = useRouter();

    useEffect(() => {
        if (loading) return;

        if (!user) {
            router.push("/login");
            return;
        }

        if (error) {
            router.push("/login");
            return;
        }

        if (user && !profile) {
            refreshProfile();
            return;
        }

        if (profile && profile.estado !== true) {
            router.push("/login");
            return;
        }

        if (allowedRoles && profile && !allowedRoles.includes(profile.role)) {
            if (profile.role === "admin") {
                router.push("/admin");
            } else {
                router.push("/usuario");
            }
        }
    }, [user, profile, loading, allowedRoles, router, refreshProfile, error]);

    const isAuthorized =
        !loading &&
        !!user &&
        !!profile &&
        (!allowedRoles || allowedRoles.includes(profile.role));

    return { user, profile, loading, isAuthorized };
}