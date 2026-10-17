"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { createWebSocket } from "@/lib/socket";
import {
  Car, Power, MapPin, Navigation, CheckCircle2,
  Clock, DollarSign, Bell, Play, Shield
} from "lucide-react";

const InteractiveMap = dynamic(() => import("@/components/Map"), { ssr: false });

export default function DriverPage() {
  const { user, loginAsDriver } = useAuth();

  const [isOnline, setIsOnline] = useState(true);
  const [driverProfile, setDriverProfile] = useState<any>(null);
  const [incomingRequest, setIncomingRequest] = useState<any>(null);
  const [currentRide, setCurrentRide] = useState<any>(null);
  const [driverLoc, setDriverLoc] = useState({ lat: 28.6180, lng: 77.2150 });
  const [earnings, setEarnings] = useState(1450.0);
  const [completedTrips, setCompletedTrips] = useState(6);

  const wsRef = useRef<any>(null);

  useEffect(() => {
    if (user && user.role !== "driver") {
      loginAsDriver();
    }
  }, [user]);

  useEffect(() => {
    async function loadProfile() {
      try {
        const profile = await api.getMyDriverProfile();
        setDriverProfile(profile);
        if (profile.current_lat && profile.current_lng) {
          setDriverLoc({ lat: profile.current_lat, lng: profile.current_lng });
        }
      } catch (e) {
        console.warn("Could not load driver profile", e);
      }
    }
    loadProfile();
  }, [user]);

  // WebSocket for Driver
  useEffect(() => {
    if (!driverProfile?.id) return;

    wsRef.current = createWebSocket("driver", driverProfile.id, (event, data) => {
      console.log("[Driver WS Event]:", event, data);

      if (event === "new_ride_request") {
        setIncomingRequest(data);
      }

      if (event === "driver_location") {
        setDriverLoc({ lat: data.lat, lng: data.lng });
      }

      if (event === "ride_status") {
        if (currentRide && currentRide.id === data.ride_id) {
          setCurrentRide((prev: any) => ({
            ...prev,
            status: data.status,
          }));
        }
      }
    });

    return () => {
      wsRef.current?.close();
    };
  }, [driverProfile]);

  const toggleStatus = async () => {
    const nextStatus = isOnline ? "offline" : "active";
    try {
      await api.updateDriverStatus(nextStatus);
      setIsOnline(!isOnline);
    } catch (e: any) {
      alert("Status update error: " + e.message);
    }
  };

  const handleAcceptRide = async () => {
    if (!incomingRequest) return;
    try {
      await api.acceptRide(incomingRequest.ride_id);
      const rideData = await api.getRide(incomingRequest.ride_id);
      setCurrentRide(rideData);
      setIncomingRequest(null);
    } catch (e: any) {
      alert("Error accepting ride: " + e.message);
    }
  };

  const handleDeclineRide = () => {
    setIncomingRequest(null);
  };

  const handleAdvanceStatus = async (nextStatus: string) => {
    if (!currentRide) return;
    try {
      await api.updateRideStatus(currentRide.id, nextStatus);
      setCurrentRide((prev: any) => ({ ...prev, status: nextStatus }));

      if (nextStatus === "completed") {
        setEarnings((prev) => prev + (currentRide.fare_actual || currentRide.fare_estimate));
        setCompletedTrips((prev) => prev + 1);
      }
    } catch (e: any) {
      alert("Error updating status: " + e.message);
    }
  };

  const handleSimulateTrip = async () => {
    if (!currentRide) return;
    try {
      await api.simulateRide(currentRide.id);
    } catch (e: any) {
      alert("Simulation error: " + e.message);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-12rem)]">
      {/* Driver Controls */}
      <div className="lg:col-span-5 space-y-4">
        {/* Cockpit Card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          {/* Header & Status Toggle */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-lg shadow-sm">
                🚖
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">
                  {driverProfile?.name || user?.name || "Driver Partner"}
                </h2>
                <div className="text-[11px] text-slate-500">
                  {driverProfile?.vehicle_info || "White Sedan (DL-01-AB-4321)"}
                </div>
              </div>
            </div>

            <button
              onClick={toggleStatus}
              className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-bold transition-all shadow-sm ${
                isOnline
                  ? "bg-emerald-500 text-white shadow-emerald-500/20"
                  : "bg-slate-200 text-slate-700"
              }`}
            >
              <Power className="w-3.5 h-3.5" />
              <span>{isOnline ? "ONLINE" : "OFFLINE"}</span>
            </button>
          </div>

          {/* Stats Bar */}
          <div className="grid grid-cols-2 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-[11px] text-slate-500">Today's Earnings</div>
              <div className="font-black text-lg text-emerald-600">₹{earnings.toFixed(2)}</div>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <div className="text-[11px] text-slate-500">Trips Completed</div>
              <div className="font-black text-lg text-slate-800">{completedTrips}</div>
            </div>
          </div>

          {/* Incoming Request Alert Modal/Banner */}
          {incomingRequest && (
            <div className="p-4 rounded-xl bg-amber-500 text-slate-950 space-y-3 shadow-lg border-2 border-amber-600 animate-bounce-subtle">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                  <Bell className="w-4 h-4 animate-spin" />
                  New Ride Request!
                </span>
                <span className="text-xs font-extrabold bg-slate-950 text-amber-400 px-2 py-0.5 rounded-md">
                  ₹{incomingRequest.fare}
                </span>
              </div>

              <div className="bg-white/90 backdrop-blur-sm p-3 rounded-lg text-xs space-y-1.5 text-slate-800">
                <div className="flex items-center gap-1.5 font-semibold">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Pickup: {incomingRequest.pickup_name}</span>
                </div>
                <div className="flex items-center gap-1.5 font-semibold">
                  <Navigation className="w-3.5 h-3.5 text-rose-600" />
                  <span>Drop: {incomingRequest.drop_name}</span>
                </div>
                <div className="text-[10px] text-slate-500 pt-1">
                  Passenger: {incomingRequest.rider_name} • {incomingRequest.distance_km} km
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleAcceptRide}
                  className="flex-1 py-2 rounded-lg bg-slate-950 text-white text-xs font-bold hover:bg-slate-900 transition-colors shadow-sm"
                >
                  Accept Ride
                </button>
                <button
                  onClick={handleDeclineRide}
                  className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold transition-colors"
                >
                  Decline
                </button>
              </div>
            </div>
          )}

          {/* Current Active Trip Card */}
          {currentRide ? (
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs font-bold text-amber-400">
                  Active Ride #{currentRide.id}
                </div>
                <span className="text-[10px] uppercase font-bold bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded">
                  {currentRide.status}
                </span>
              </div>

              <div className="text-xs space-y-1 text-slate-300">
                <div>📍 {currentRide.pickup_name}</div>
                <div>🏁 {currentRide.drop_name}</div>
                <div className="text-amber-400 font-bold text-sm pt-1">
                  Fare: ₹{currentRide.fare_actual || currentRide.fare_estimate}
                </div>
              </div>

              {/* Trip Progression Buttons */}
              <div className="space-y-2 pt-2">
                {currentRide.status === "accepted" && (
                  <button
                    onClick={() => handleAdvanceStatus("arriving")}
                    className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold rounded-lg text-xs transition-colors"
                  >
                    Start Driving to Pickup
                  </button>
                )}

                {currentRide.status === "arriving" && (
                  <button
                    onClick={() => handleAdvanceStatus("in_progress")}
                    className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg text-xs transition-colors"
                  >
                    Passenger Picked Up (Start Trip)
                  </button>
                )}

                {currentRide.status === "in_progress" && (
                  <button
                    onClick={() => handleAdvanceStatus("completed")}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-white font-bold rounded-lg text-xs transition-colors"
                  >
                    Complete Trip & Collect Fare
                  </button>
                )}

                {currentRide.status !== "completed" && (
                  <button
                    onClick={handleSimulateTrip}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-amber-300 font-semibold rounded-lg text-xs border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Auto-Simulate GPS Movement
                  </button>
                )}

                {currentRide.status === "completed" && (
                  <button
                    onClick={() => setCurrentRide(null)}
                    className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white font-semibold rounded-lg text-xs transition-colors"
                  >
                    Ready for Next Ride
                  </button>
                )}
              </div>
            </div>
          ) : (
            !incomingRequest && (
              <div className="p-8 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl space-y-2">
                <Car className="w-8 h-8 mx-auto text-slate-300" />
                <div className="font-semibold text-slate-600">Waiting for ride requests...</div>
                <p className="text-[11px]">
                  Keep your status <b className="text-emerald-600">ONLINE</b> to receive nearby dispatch dispatches.
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Map */}
      <div className="lg:col-span-7 h-[500px] lg:h-auto min-h-[500px]">
        <InteractiveMap
          pickup={currentRide ? { lat: currentRide.pickup_lat, lng: currentRide.pickup_lng } : null}
          drop={currentRide ? { lat: currentRide.drop_lat, lng: currentRide.drop_lng } : null}
          driverLocation={driverLoc}
          className="h-full w-full rounded-2xl shadow-md border border-slate-200"
        />
      </div>
    </div>
  );
}
