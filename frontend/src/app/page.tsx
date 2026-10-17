"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import {
  Car, User, Radio, FileText, Wallet, Sparkles, CheckCircle2,
  ArrowRight, ShieldCheck, Zap, Navigation
} from "lucide-react";
import { useRouter } from "next/dist/client/components/navigation";

export default function HomePage() {
  const { user, loading } = useAuth();
const router = useRouter();
  const [backendStatus, setBackendStatus] = useState<"checking" | "online" | "offline">("checking");
  const [activePromos, setActivePromos] = useState<any[]>([]);

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("http://127.0.0.1:8000/health");
        if (res.ok) setBackendStatus("online");
        else setBackendStatus("offline");
      } catch {
        setBackendStatus("offline");
      }
    }
    async function loadPromos() {
      try {
        const promos = await api.getActivePromos();
        setActivePromos(promos);
      } catch (e) {}
    }
    checkHealth();
    loadPromos();
  }, []);

  // Login check yahan add karo
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/auth");
    }
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="p-10 text-center">
        Please wait...
      </div>
    );
  }
  return (
    <div className="space-y-10 py-4">
      {/* Hero Header */}
      <div className="relative rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-sky-950 p-8 md:p-12 text-white overflow-hidden shadow-2xl border border-slate-800">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-400 via-sky-500 to-transparent pointer-events-none"></div>

        <div className="relative z-10 max-w-2xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-semibold border border-amber-400/30">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Ready-to-Submit Full-Stack Project</span>
          </div>

          <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight">
            Cab Booking Platform <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-sky-300">
              Python + Next.js Stack
            </span>
          </h1>

          <p className="text-slate-300 text-sm md:text-base leading-relaxed">
            High-performance ride-hailing architecture featuring FastAPI async backend, real-time WebSockets,
            geospatial driver matching, Stripe payments, automated ReportLab PDF invoices, and interactive Leaflet maps.
          </p>

          <div className="pt-3 flex flex-wrap gap-4 items-center">
            <Link
              href="/demo"
              className="px-6 py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-amber-400/25 transition-all transform hover:-translate-y-0.5"
            >
              <Radio className="w-4 h-4 animate-pulse" />
              Launch Split-Screen Live Demo
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              href="/rider"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all"
            >
              Rider Portal
            </Link>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-xs">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === "online" ? "bg-emerald-400 animate-pulse" : "bg-amber-400"
                }`}
              ></span>
              <span className="text-slate-300">
                FastAPI Server: <b className="text-white capitalize">{backendStatus}</b>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Featured Portals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Rider Portal Card */}
        <Link
          href="/rider"
          className="group p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
              <User className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-sky-600 transition-colors">
                Rider Portal
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Pin pickup and drop-off locations, compare tiered fares (Economy, Comfort, XL), apply promo codes, and watch the driver car glide on the map.
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-sky-600 group-hover:translate-x-1 transition-transform">
            Book a Ride &rarr;
          </div>
        </Link>

        {/* Driver Dashboard Card */}
        <Link
          href="/driver"
          className="group p-6 rounded-2xl bg-white border border-slate-200 shadow-sm hover:shadow-xl hover:border-amber-400 transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform">
              <Car className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                Driver Dashboard
              </h3>
              <p className="text-slate-500 text-xs mt-1">
                Toggle online status, receive instant audio/visual ride dispatch alerts via WebSockets, accept requests, and step through the trip milestones.
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center text-xs font-semibold text-amber-600 group-hover:translate-x-1 transition-transform">
            Open Driver Cockpit &rarr;
          </div>
        </Link>

        {/* Dual-Screen Demo Card */}
        <Link
          href="/demo"
          className="group p-6 rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-300 shadow-md hover:shadow-xl transition-all flex flex-col justify-between"
        >
          <div className="space-y-4">
            <div className="w-12 h-12 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-xl group-hover:scale-110 transition-transform shadow-md">
              <Radio className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="inline-block px-2 py-0.5 rounded bg-amber-200 text-amber-900 text-[10px] font-bold uppercase mb-1">
                Academic Showcase
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Split-Screen Live Showcase
              </h3>
              <p className="text-slate-600 text-xs mt-1">
                Simultaneously view Rider & Driver in a single window to easily showcase the entire WebSocket lifecycle and real-time car tracking.
              </p>
            </div>
          </div>
          <div className="pt-4 flex items-center text-xs font-bold text-amber-800 group-hover:translate-x-1 transition-transform">
            Open Dual Showcase &rarr;
          </div>
        </Link>
      </div>

      {/* Feature & Architecture Checklist */}
      <div className="rounded-2xl bg-white border border-slate-200 p-6 md:p-8 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900 mb-6 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          PDF Specification Compliance & Tech Implementation
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-xs text-slate-600">
          <div className="space-y-2 border-l-2 border-amber-400 pl-4">
            <div className="font-bold text-slate-900 text-sm">FastAPI + Async REST & WS</div>
            <p>
              High-throughput ASGI endpoints with Pydantic v2 schemas, automated Swagger docs, and connection manager.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-sky-500 pl-4">
            <div className="font-bold text-slate-900 text-sm">Geospatial Nearest Search</div>
            <p>
              Haversine & PostGIS radius calculations instantly locate closest available active drivers with zero latency.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-emerald-500 pl-4">
            <div className="font-bold text-slate-900 text-sm">Stripe Payments & Invoicing</div>
            <p>
              PaymentIntent creation, secure webhook signature verification, and automated PDF tax receipt generation via ReportLab.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-purple-500 pl-4">
            <div className="font-bold text-slate-900 text-sm">Real-Time Redis Pub/Sub</div>
            <p>
              Decoupled broadcast channel streaming driver GPS coordinates, trip status transitions, and arrival alarms.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-rose-500 pl-4">
            <div className="font-bold text-slate-900 text-sm">Interactive Leaflet.js</div>
            <p>
              Free OpenStreetMap tiles with no mandatory paid Google billing, route polylines, and moving taxi icons.
            </p>
          </div>

          <div className="space-y-2 border-l-2 border-indigo-500 pl-4">
            <div className="font-bold text-slate-900 text-sm">Wallet & Ratings Engine</div>
            <p>
              Stored digital wallet with top-up capabilities, promo voucher validation, and dynamic driver rating recalculation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
