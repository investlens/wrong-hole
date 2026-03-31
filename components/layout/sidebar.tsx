"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/shared/logo";
import {
  LayoutDashboard,
  Gamepad2,
  Pickaxe,
  Gift,
  Trophy,
  Wallet,
} from "lucide-react";

const items = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard },
  { href: "/app/play", label: "Play", icon: Gamepad2 },
  { href: "/app/mine", label: "Lab", icon: Pickaxe },
  { href: "/app/rewards", label: "Rewards", icon: Gift },
  { href: "/app/leaderboard", label: "Leaderboard", icon: Trophy },
  { href: "/app/wallet", label: "Wallet", icon: Wallet },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-72 border-r border-white/10 bg-black/30 backdrop-blur-xl lg:block">
      <div className="rounded-3xl bg-white/5 p-5">
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <div className="text-sm text-pink-300">Wrong Hole</div>
            <div className="text-xs text-white/50">$SPRM Portal</div>
          </div>
        </div>
      </div>

      <nav className="mt-6 space-y-2 px-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition-all ${
                active
                  ? "bg-gradient-to-r from-fuchsia-500 to-pink-500 text-white shadow-lg"
                  : "bg-white/5 text-white/70 hover:bg-white/10 hover:scale-[1.02]"
              }`}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}