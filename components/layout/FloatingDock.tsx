"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function FloatingDock() {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Calculator", icon: "⚡" },
    { href: "/invoice", label: "Invoice Studio", icon: "📄" },
    { href: "/tracer", label: "Wire Tracer", icon: "🌐" },
    { href: "/w8ben", label: "Tax & W-8BEN", icon: "⚖️" },
  ];

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-slate-900/80 backdrop-blur-2xl border border-slate-700/60 rounded-full px-5 py-2.5 shadow-2xl flex items-center gap-4">
      {links.map((link) => {
        // Handle exact match or trailing slash variations
        const isActive = pathname === link.href || pathname === link.href + "/";
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium transition-all duration-300 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${
              isActive ? "text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            <span>{link.icon}</span>
            <span className="hidden sm:inline-block">{link.label}</span>
            {isActive && (
              <div className="absolute inset-0 bg-white/10 rounded-full -z-10 animate-fade-in-up" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
