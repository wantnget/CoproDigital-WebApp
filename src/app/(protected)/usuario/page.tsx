"use client";

import { useProtectedRoute } from "@/hooks/use-protected-route";
import { LoadingScreen } from "@/components/LoadingScreen";
import {
  Inbox,
  FilePlus2,
  User,
  FileText,
  type LucideIcon,
} from "lucide-react";

type Accent = "amber" | "blue" | "green" | "slate";

type DashboardCard = {
  title: string;
  description: string;
  href: string;
  icon: LucideIcon;
  accent: Accent;
};

type DashboardSection = {
  title: string;
  description: string;
  cards: DashboardCard[];
};

const accentClasses: Record<Accent, string> = {
  amber: "bg-amber-50 text-amber-700",
  blue: "bg-blue-50 text-blue-700",
  green: "bg-green-50 text-green-700",
  slate: "bg-slate-100 text-slate-700",
};

export default function UsuarioDashboardPage() {
  const {
    isAuthorized,
    profile,
    loading: authLoading,
  } = useProtectedRoute({
    allowedRoles: ["user"],
  });

  if (authLoading) return <LoadingScreen message="Cargando tu inicio..." />;
  if (!isAuthorized || !profile) return null;

  const sections: DashboardSection[] = [
    {
      title: "Solicitudes",
      description: "Todo lo relacionado con tus solicitudes.",
      cards: [
        {
          title: "Bandeja de Solicitudes",
          description: "Consulta el estado de tus solicitudes.",
          href: "/usuario/bandeja",
          icon: Inbox,
          accent: "amber",
        },
      ],
    },
  ];

  const nombre = profile.username || "asociado";

  return (
    <div className="px-4 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto max-w-5xl">
        {/* Header con ilustración */}
        <div className="mb-14 flex items-center gap-8 sm:mb-20">
          <div className="flex-1">
            <p className="mb-3 text-xs font-medium uppercase tracking-wider text-slate-500">
              Hola, {nombre}
            </p>
            <h1 className="mb-4 text-3xl font-semibold text-slate-900 sm:text-4xl">
              ¿Qué quieres hacer hoy?
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-slate-600">
              Accede directo a los módulos que usas a diario: revisa el estado
              de tus solicitudes
            </p>
          </div>
          <svg
            viewBox="0 0 220 160"
            className="hidden h-40 w-52 flex-shrink-0 sm:block"
            xmlns="http://www.w3.org/2000/svg"
          >
            <ellipse cx="110" cy="148" rx="80" ry="6" fill="#E6F1FB" />
            <rect
              x="55"
              y="40"
              width="110"
              height="80"
              rx="6"
              fill="#B5D4F4"
              stroke="#185FA5"
              strokeWidth="1.5"
            />
            <rect x="62" y="48" width="96" height="8" rx="2" fill="#378ADD" />
            <rect x="62" y="62" width="60" height="4" rx="1" fill="#85B7EB" />
            <rect x="62" y="72" width="80" height="4" rx="1" fill="#85B7EB" />
            <rect x="62" y="82" width="50" height="4" rx="1" fill="#85B7EB" />
            <circle
              cx="40"
              cy="60"
              r="14"
              fill="#CECBF6"
              stroke="#534AB7"
              strokeWidth="1.5"
            />
            <circle cx="40" cy="60" r="5" fill="#7F77DD" />
            <circle
              cx="180"
              cy="100"
              r="12"
              fill="#9FE1CB"
              stroke="#0F6E56"
              strokeWidth="1.5"
            />
            <path
              d="M175 100 l4 4 l8 -8"
              stroke="#0F6E56"
              strokeWidth="2"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <circle cx="170" cy="50" r="8" fill="#FAC775" />
            <path
              d="M30 110 q10 -10 20 0 q10 10 20 0"
              stroke="#7F77DD"
              strokeWidth="1.5"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Secciones */}
        {sections.map((section) => (
          <section key={section.title} className="mb-14 last:mb-0">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                {section.title}
              </h2>
              <span className="text-xs text-slate-400">
                {section.cards.length}{" "}
                {section.cards.length === 1 ? "módulo" : "módulos"}
              </span>
            </div>
            <p className="mb-6 text-sm text-slate-600">{section.description}</p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {section.cards.map((card) => {
                const Icon = card.icon;
                return (
                  <a
                    key={card.title}
                    href={card.href}
                    className="group flex items-start gap-4 rounded-2xl border border-slate-200 p-7 transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md"
                  >
                    <div
                      className={`flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl ${accentClasses[card.accent]}`}
                    >
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1.5 text-base font-medium text-slate-900">
                        {card.title}
                      </p>
                      <p className="text-sm leading-relaxed text-slate-600">
                        {card.description}
                      </p>
                    </div>
                    <span className="text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-slate-700">
                      →
                    </span>
                  </a>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
