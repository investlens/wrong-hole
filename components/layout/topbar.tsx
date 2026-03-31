"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/shared/logo";
import {
  LayoutDashboard,
  Gamepad2,
  Pickaxe,
  Gift,
  Wallet,
} from "lucide-react";

const mobileItems = [
  { href: "/app", label: "Home", icon: LayoutDashboard },
  { href: "/app/play", label: "Play", icon: Gamepad2 },
  { href: "/app/mine", label: "Lab", icon: Pickaxe },
  { href: "/app/rewards", label: "Rewards", icon: Gift },
  { href: "/app/wallet", label: "Wallet", icon: Wallet },
];

export default function Topbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-neutral-950/85 backdrop-blur">
      <div className="flex flex-col">
        {/* Top section */}
        <div className="flex items-center justify-between gap-3 px-4 py-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            {/* Mobile logo */}
            <div className="lg:hidden">
              <Logo size={28} />
            </div>

            <div className="min-w-0">
              <div className="truncate text-xs text-white/40">
                Early Access
              </div>
              <div className="truncate text-base font-bold text-white md:text-lg">
                Wrong Hole Lab
              </div>
            </div>
          </div>

          {/* Desktop stats */}
          <div className="hidden items-center gap-3 md:flex">
            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
              Status: <span className="font-bold text-fuchsia-300">Live</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/80">
              Token: <span className="font-bold">Pre-launch</span>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <div className="scrollbar-hide flex gap-2 overflow-x-auto px-3 pb-3 lg:hidden">
          {mobileItems.map((item) => {
            const Icon = item.icon;

            const active =
              pathname === item.href ||
              (item.href !== "/app" && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-2 text-sm transition ${
                  active
                    ? "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-md"
                    : "bg-white/5 text-white/70 hover:bg-white/10"
                }`}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>
    </header>
  );
}