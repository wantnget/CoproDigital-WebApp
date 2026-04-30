import {
    LayoutDashboard,
    Users,
    FileText,
    Settings,
    CreditCard,
    Inbox,
    User,
    type LucideIcon,
} from "lucide-react";

export interface NavItem {
    label: string;
    href: string;
    icon: LucideIcon;
}

export interface NavSection {
    title?: string;
    items: NavItem[];
}

export const adminNavigation: NavSection[] = [
    {
        title: "General",
        items: [
            { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
            { label: "Bandeja", href: "/admin/bandeja", icon: Inbox },
        ],
    },
    {
        title: "Administración",
        items: [
            { label: "Usuarios", href: "/admin/usuarios", icon: Users },
            { label: "Mi Perfil", href: "/admin/perfil", icon: User },
        ],
    },
];

export const userNavigation: NavSection[] = [
    {
        items: [
            { label: "Mi Crédito", href: "/usuario", icon: CreditCard },
            { label: "Bandeja", href: "/usuario/bandeja", icon: Inbox },
            { label: "Mi Perfil", href: "/usuario/perfil", icon: User },
        ],
    },
];

export function getNavigationByRole(role: "admin" | "user"): NavSection[] {
    return role === "admin" ? adminNavigation : userNavigation;
}