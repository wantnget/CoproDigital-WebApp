"use client";

import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    icon: LucideIcon;
    error?: boolean;
    rightSlot?: React.ReactNode;
}

export function IconInput({
    icon: Icon,
    error = false,
    rightSlot,
    className,
    ...props
}: IconInputProps) {
    return (
        <div className="relative">
            <Icon
                className={cn(
                    "pointer-events-none absolute top-1/2 left-3.5 h-5 w-5 -translate-y-1/2 transition",
                    error ? "text-red-500" : "text-[#0D0D0D]/40"
                )}
            />
            <input
                {...props}
                className={cn(
                    "w-full h-12 rounded-[10px] border-[1.2px] bg-white pl-11 pr-11 text-base shadow-sm outline-none transition",
                    error
                        ? "border-red-500 bg-red-50 focus:border-red-600 focus:ring-2 focus:ring-red-200"
                        : "border-[#0D0D0D]/15 focus:border-[#F29A2E] focus:ring-2 focus:ring-[#F29A2E]/30",
                    className
                )}
            />
            {rightSlot && (
                <div className="absolute top-1/2 right-3.5 -translate-y-1/2">
                    {rightSlot}
                </div>
            )}
        </div>
    );
}