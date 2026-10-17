import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";

export const metadata: Metadata = {
  title: "SwiftCab — Full-Stack Ride Booking Platform (Python FastAPI + Next.js)",
  description: "Production-ready Cab Booking Platform with real-time WebSockets, PostGIS geospatial matching, Stripe payments, and Celery background workers.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900 min-h-screen flex flex-col antialiased">
        <AuthProvider>
          <Navbar />
          <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 lg:p-8">
            {children}
          </main>
          <footer className="bg-white border-t border-slate-200 py-6 text-center text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div>
                <b>SwiftCab Platform</b> — Built strictly according to Python Stack Architecture Spec
              </div>
              <div className="flex gap-4 text-slate-400">
                <span>FastAPI 0.110+</span>
                <span>•</span>
                <span>Next.js 14</span>
                <span>•</span>
                <span>WebSockets & Redis</span>
                <span>•</span>
                <span>ReportLab PDF</span>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
