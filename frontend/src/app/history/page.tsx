"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { History, Download, Car, Calendar, MapPin, Navigation, Star } from "lucide-react";

export default function RideHistoryPage() {
  const { user } = useAuth();
  const [rides, setRides] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadHistory() {
      try {
        const data = await api.getRideHistory();
        setRides(data);
      } catch (e) {
        console.error("Error loading ride history:", e);
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      loadHistory();
    }
  }, [user]);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <History className="w-6 h-6 text-sky-600" />
            Ride History & Tax Invoices
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            View completed and past trips with official ReportLab PDF downloadable receipts.
          </p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-slate-200 text-slate-800 font-bold">
          {rides.length} Total Trips
        </span>
      </div>

      {loading ? (
        <div className="text-center py-12 text-slate-400 text-sm">
          Loading ride records...
        </div>
      ) : rides.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <Car className="w-10 h-10 mx-auto text-slate-300" />
          <div className="font-bold text-slate-700">No rides found yet</div>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Book your first trip from the Rider portal or run the Dual-Screen Showcase to generate trip records.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rides.map((ride) => (
            <div
              key={ride.id}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow space-y-4"
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-lg">
                    {ride.vehicle_type === "XL" ? "🚐" : ride.vehicle_type === "Comfort" ? "🚙" : "🚗"}
                  </div>
                  <div>
                    <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                      <span>Trip #{ride.id}</span>
                      <span className="text-xs font-normal text-slate-400">• {ride.vehicle_type}</span>
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {new Date(ride.created_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:text-right">
                  <div>
                    <div className="font-black text-base text-slate-900">
                      ₹{ride.fare_actual || ride.fare_estimate}
                    </div>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                        ride.status === "completed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      {ride.status}
                    </span>
                  </div>

                  <button
                    onClick={() => window.open(api.getReceiptUrl(ride.id), "_blank")}
                    title="Download Official PDF Invoice"
                    className="p-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white transition-colors shadow-sm"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                  </button>
                </div>
              </div>

              {/* Route Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div className="flex items-start gap-2">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">PICKUP</span>
                    <span className="font-medium text-slate-800">{ride.pickup_name}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Navigation className="w-3.5 h-3.5 text-rose-600 mt-0.5 shrink-0" />
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">DROP-OFF</span>
                    <span className="font-medium text-slate-800">{ride.drop_name}</span>
                  </div>
                </div>
              </div>

              {/* Driver & Details */}
              <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
                <div>
                  Driver: <b>{ride.driver_info?.name || "Assigned Driver Partner"}</b>
                </div>
                <div>
                  {ride.distance_km} km • ~{ride.duration_mins} mins
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
