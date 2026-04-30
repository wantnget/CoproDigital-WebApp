"use client";

import Link from "next/link";
import { ChevronRight, type LucideIcon } from "lucide-react";

/**
 * Componente reutilizable para el "home" del dashboard, tanto admin como
 * usuario. Sigue el mismo patrón visual: un hero a la izquierda (saludo
 * + descripción) y a la derecha grupos temáticos con tarjetas de acceso
 * rápido.
 *
 * Cada rol arma sus propios `sections` y los pasa por props — este
 * componente no decide qué se muestra, solo cómo.
 */

export interface DashboardCard {
    /** Título visible de la tarjeta. Ej: "Bandeja de pendientes". */
    title: string;
    /** Texto de apoyo debajo del título. */
    description: string;
    /** Ruta interna a la que se navega al hacer clic. */
    href: string;
    /** Icono lucide-react opcional. Si no se pasa, no se muestra. */
    icon?: LucideIcon;
    /**
     * Variante visual del icono. Cambia el color del bloque que envuelve
     * al icono dentro de la tarjeta.
     */
    accent?: "amber" | "blue" | "green" | "slate";
}

export interface DashboardSection {
    /** Título del grupo. Ej: "Operación diaria". */
    title: string;
    /** Texto descriptivo opcional debajo del título. */
    description?: string;
    /** Lista de tarjetas de la sección. */
    cards: DashboardCard[];
}

export interface DashboardHomeProps {
    /** Saludo principal del hero. Ej: "¡Hola, Lina!". */
    greetingTitle: string;
    /** Texto largo del hero. */
    greetingDescription: string;
    /** Secciones de tarjetas. */
    sections: DashboardSection[];
}

const ACCENT_BG: Record<NonNullable<DashboardCard["accent"]>, string> = {
    amber: "bg-amber-50 text-amber-700",
    blue: "bg-blue-50 text-blue-700",
    green: "bg-green-50 text-green-700",
    slate: "bg-slate-100 text-slate-700",
};

export function DashboardHome({
    greetingTitle,
    greetingDescription,
    sections,
}: DashboardHomeProps) {
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
            {/* Hero */}
            <div className="rounded-xl border border-[#0D0D0D]/10 bg-white p-8 shadow-sm">
                <h1 className="text-2xl lg:text-3xl font-bold text-[#012340]">
                    {greetingTitle}
                </h1>
                <p className="mt-3 text-sm text-[#0D0D0D]/60 max-w-md">
                    {greetingDescription}
                </p>
                <HeroIllustration />
            </div>

            {/* Columna de secciones */}
            <div className="flex flex-col gap-6">
                {sections.map((section) => (
                    <SectionCard key={section.title} section={section} />
                ))}
            </div>
        </div>
    );
}

function SectionCard({ section }: { section: DashboardSection }) {
    return (
        <div className="rounded-xl border border-[#0D0D0D]/10 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold text-[#012340]">{section.title}</h2>
            {section.description && (
                <p className="mt-1 text-sm text-[#0D0D0D]/60">
                    {section.description}
                </p>
            )}

            <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-3">
                {section.cards.map((card) => (
                    <AccessCard key={card.href} card={card} />
                ))}
            </div>
        </div>
    );
}

function AccessCard({ card }: { card: DashboardCard }) {
    const Icon = card.icon;
    const accent = card.accent ?? "slate";

    return (
        <Link
            href={card.href}
            className="group flex items-center gap-4 rounded-lg border border-[#0D0D0D]/10 bg-white p-4 transition-all hover:border-[#012340]/40 hover:shadow-md"
        >
            {Icon && (
                <div
                    className={`flex h-12 w-12 items-center justify-center rounded-lg ${ACCENT_BG[accent]} flex-shrink-0`}
                >
                    <Icon className="h-6 w-6" />
                </div>
            )}
            <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-[#012340] truncate">
                    {card.title}
                </p>
                <p className="mt-0.5 text-xs text-[#0D0D0D]/60 line-clamp-2">
                    {card.description}
                </p>
            </div>
            <ChevronRight className="h-4 w-4 text-[#0D0D0D]/30 group-hover:text-[#012340] flex-shrink-0 transition-colors" />
        </Link>
    );
}

/**
 * Ilustración decorativa SVG inline del hero. No carga assets externos
 * para mantener el componente autocontenido.
 */
function HeroIllustration() {
    return (
        <div className="mt-8 flex justify-center">
            <svg
                width="220"
                height="180"
                viewBox="0 0 220 180"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
            >
                {/* Líneas de fondo */}
                <rect x="20" y="40" width="60" height="6" rx="3" fill="#E5E7EB" />
                <rect x="20" y="58" width="80" height="6" rx="3" fill="#E5E7EB" />
                <rect x="20" y="76" width="50" height="6" rx="3" fill="#E5E7EB" />
                {/* Check */}
                <circle cx="35" cy="30" r="10" fill="none" stroke="#F29A2E" strokeWidth="2" />
                <path
                    d="M30 30 L34 34 L41 26"
                    stroke="#F29A2E"
                    strokeWidth="2"
                    fill="none"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                {/* Persona simplificada */}
                <circle cx="140" cy="55" r="14" fill="#012340" />
                <path
                    d="M118 95 Q140 80 162 95 L160 145 Q140 150 120 145 Z"
                    fill="#E5E7EB"
                />
                <rect x="125" y="140" width="10" height="30" fill="#1F2937" />
                <rect x="145" y="140" width="10" height="30" fill="#1F2937" />
                {/* Brazo extendido con elemento naranja */}
                <rect
                    x="155"
                    y="100"
                    width="50"
                    height="14"
                    rx="7"
                    fill="#F29A2E"
                    transform="rotate(-10 180 107)"
                />
                {/* Hoja decorativa */}
                <path
                    d="M180 160 Q190 140 200 155 Q195 170 180 160 Z"
                    fill="#E5E7EB"
                />
            </svg>
        </div>
    );
}