"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Car, User, Wallet, History, Radio, Sparkles } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();
  const { user, loginAsRider, loginAsDriver } = useAuth();

  const navLinks = [
    { name: "Rider App", href: "/rider", icon: User },
    { name: "Driver App", href: "/driver", icon: Car },
    { name: "Live Showcase", href: "/demo", icon: Radio, highlight: true },
    { name: "Ride History", href: "/history", icon: History },
    { name: "Wallet & Promos", href: "/wallet", icon: Wallet },
  ];

  return (
    <header className="sticky top-0 z-50 bg-slate-900 border-b border-slate-800 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-xl bg-amber-400 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-amber-400/20 group-hover:scale-105 transition-transform">
            🚕
          </div>
          <div>
            <div className="font-extrabold tracking-tight text-lg text-white flex items-center gap-1.5">
              SwiftCab <span className="text-xs px-2 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-medium">Python Stack</span>
            </div>
            <div className="text-[10px] text-slate-400">FastAPI • WebSockets • Next.js</div>
          </div>
        </Link>

        {/* Navigation Tabs */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-amber-400 text-slate-950 shadow-sm"
                    : link.highlight
                    ? "bg-amber-400/10 text-amber-300 hover:bg-amber-400/20 border border-amber-400/30"
                    : "text-slate-300 hover:text-white hover:bg-slate-800"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{link.name}</span>
                {link.highlight && (
                  <span className="flex h-2 w-2 relative">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Role Badge & Quick Switcher */}
        <div className="flex items-center space-x-3">
          {user && (
            <div className="hidden sm:flex items-center gap-2 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700 text-xs">
              <span className="text-slate-400">Wallet:</span>
              <span className="font-bold text-amber-400">₹{user.wallet_balance.toFixed(2)}</span>
            </div>
          )}

          <div className="flex items-center bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              onClick={loginAsRider}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                user?.role === "rider"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Switch session to Demo Rider"
            >
              Rider
            </button>
            <button
              onClick={loginAsDriver}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md transition-all ${
                user?.role === "driver"
                  ? "bg-amber-400 text-slate-950 shadow-sm"
                  : "text-slate-400 hover:text-white"
              }`}
              title="Switch session to Demo Driver"
            >
              Driver
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
