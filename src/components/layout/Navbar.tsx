"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { UserMenu } from "./UserMenu";
import { getNavigationByRole } from "@/app/config/navigation";
import { cn } from "@/lib/utils";

interface NavbarProps {
  role: "admin" | "user";
  title?: string;
  subtitle?: string;
}

export function Navbar({ role, title, subtitle }: NavbarProps) {
  const pathname = usePathname();
  const now = new Date();
  const sessionLabel = now.toLocaleString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const sections = getNavigationByRole(role);
  const allItems = sections.flatMap((s) => s.items);

  return (
    <header className="sticky top-0 z-30 bg-white shadow-[0_4px_20px_-10px_rgba(0,0,0,0.1)] border-b border-slate-200">
      <div className="flex h-[72px] items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <div className="flex items-center">
            <img
              src="/Imagen1.png"
              alt="Logo"
              className="h-10 w-auto object-contain sm:h-11"
            />
          </div>
          {(title || subtitle) && (
            <div className="hidden sm:flex flex-col justify-center gap-0.5 border-l-2 pl-4 ml-2 border-slate-100">
              {title && (
                <p className="text-[11px] font-bold tracking-widest uppercase text-[#0D0D0D]/40">
                  {title}
                </p>
              )}
              {subtitle && (
                <h1 className="text-base font-extrabold text-[#012340] sm:text-lg">
                  {subtitle}
                </h1>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-6">
          <div className="hidden text-right md:block">
            <p className="text-[10px] font-bold tracking-wider uppercase text-[#0D0D0D]/40">
              Sesión activa
            </p>
            <p className="text-xs font-semibold text-[#012340]">
              {sessionLabel}
            </p>
          </div>
          <UserMenu />
        </div>
      </div>

      <div className="px-4 sm:px-6 lg:px-8 overflow-x-auto bg-[#FAFAFA] border-t border-slate-100">
        <nav className="flex w-full items-center justify-center gap-2 sm:gap-6 min-w-max">
          {allItems.map((item) => {
            const Icon = item.icon;
            const isDashboardOrHome =
              item.href === "/admin" || item.href === "/usuario";
            const isActive = isDashboardOrHome
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center justify-center gap-2 border-b-[3px] py-3.5 px-3 text-sm font-bold transition-all",
                  isActive
                    ? "border-[#F29A2E] text-[#012340]"
                    : "border-transparent text-[#0D0D0D]/50 hover:text-[#012340] hover:bg-black/5",
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isActive
                      ? "text-[#F29A2E]"
                      : "text-[#0D0D0D]/40 group-hover:text-[#012340]/60",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
