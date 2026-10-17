"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { api } from "@/lib/api";
import { createWebSocket } from "@/lib/socket";
import {
  Radio, User, Car, Sparkles, MapPin, Navigation,
  Play, Download, Star, CheckCircle, RefreshCw, Bell, ArrowRight
} from "lucide-react";

const InteractiveMap = dynamic(() => import("@/components/Map"), { ssr: false });

export default function DualScreenDemoPage() {
  // Demo credentials
  const [tokens, setTokens] = useState<any>(null);
  const [loadingTokens, setLoadingTokens] = useState(true);

  // Rider State
  const [pickup, setPickup] = useState({ name: "Connaught Place, New Delhi", lat: 28.6315, lng: 77.2167 });
  const [drop, setDrop] = useState({ name: "IGI Airport, Terminal 3", lat: 28.5562, lng: 77.1000 });
  const [fareEstimate, setFareEstimate] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState<string>("Economy");
  const [promoCode, setPromoCode] = useState<string>("WELCOME50");
  const [riderRide, setRiderRide] = useState<any>(null);
  const [rating, setRating] = useState(5);
  const [reviewSent, setReviewSent] = useState(false);

  // Driver State
  const [isDriverOnline, setIsDriverOnline] = useState(true);
  const [driverLoc, setDriverLoc] = useState({ lat: 28.6180, lng: 77.2150 });
  const [driverIncoming, setDriverIncoming] = useState<any>(null);
  const [driverRide, setDriverRide] = useState<any>(null);
  const [driverEarnings, setDriverEarnings] = useState(250.0);

  // Sockets
  const riderWsRef = useRef<any>(null);
  const driverWsRef = useRef<any>(null);

  // Fetch demo credentials on load
  useEffect(() => {
    async function init() {
      try {
        const data = await api.getDemoTokens();
        setTokens(data);

        // Fetch estimate
        const est = await api.estimateRide({
          pickup_lat: pickup.lat,
          pickup_lng: pickup.lng,
          drop_lat: drop.lat,
          drop_lng: drop.lng,
          promo_code: promoCode,
        });
        setFareEstimate(est);
      } catch (e) {
        console.error("Demo init error:", e);
      } finally {
        setLoadingTokens(false);
      }
    }
    init();
  }, []);

  // Set up both WebSockets concurrently
  useEffect(() => {
    if (!tokens?.rider?.user?.id || !tokens?.driver?.driver_id) return;

    const riderId = tokens.rider.user.id;
    const driverId = tokens.driver.driver_id;

    // Connect Rider WS
    riderWsRef.current = createWebSocket("rider", riderId, (event, data) => {
      console.log("[Demo Rider WS]:", event, data);
      if (event === "ride_accepted") {
        setRiderRide((prev: any) => ({
          ...prev,
          status: "accepted",
          driver_info: data.driver,
        }));
      }
      if (event === "driver_location") {
        setDriverLoc({ lat: data.lat, lng: data.lng });
      }
      if (event === "ride_status") {
        setRiderRide((prev: any) => ({
          ...prev,
          status: data.status,
          fare_actual: data.fare || prev?.fare_actual,
        }));
      }
    });

    // Connect Driver WS
    driverWsRef.current = createWebSocket("driver", driverId, (event, data) => {
      console.log("[Demo Driver WS]:", event, data);
      if (event === "new_ride_request") {
        setDriverIncoming(data);
      }
      if (event === "driver_location") {
        setDriverLoc({ lat: data.lat, lng: data.lng });
      }
      if (event === "ride_status") {
        setDriverRide((prev: any) => ({
          ...prev,
          status: data.status,
        }));
        if (data.status === "completed") {
          setDriverEarnings((prev) => prev + (data.fare || 150));
        }
      }
    });

    return () => {
      riderWsRef.current?.close();
      driverWsRef.current?.close();
    };
  }, [tokens]);

  // Rider action: Request Ride
  const handleRiderBook = async () => {
    if (!tokens?.rider?.token) return;
    localStorage.setItem("token", tokens.rider.token);

    try {
      const ride = await api.createRide({
        pickup_name: pickup.name,
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        drop_name: drop.name,
        drop_lat: drop.lat,
        drop_lng: drop.lng,
        vehicle_type: selectedTier,
        promo_code: promoCode,
      });
      setRiderRide(ride);
      setReviewSent(false);
    } catch (e: any) {
      alert("Booking error: " + e.message);
    }
  };

  // Driver action: Accept Ride
  const handleDriverAccept = async () => {
    if (!driverIncoming || !tokens?.driver?.token) return;
    localStorage.setItem("token", tokens.driver.token);

    try {
      await api.acceptRide(driverIncoming.ride_id);
      const ride = await api.getRide(driverIncoming.ride_id);
      setDriverRide(ride);
      setDriverIncoming(null);
    } catch (e: any) {
      alert("Accept error: " + e.message);
    }
  };

  // Trigger GPS Motion Simulation
  const handleSimulate = async () => {
    const rideId = riderRide?.id || driverRide?.id;
    if (!rideId) return;
    try {
      await api.simulateRide(rideId);
    } catch (e: any) {
      alert("Simulation error: " + e.message);
    }
  };

  // Submit Rating
  const handleRatingSubmit = async () => {
    if (!riderRide || !tokens?.rider?.token) return;
    localStorage.setItem("token", tokens.rider.token);
    try {
      await api.submitReview({
        ride_id: riderRide.id,
        rating,
        comment: "Excellent ride and smooth driving!",
      });
      setReviewSent(true);
    } catch (e: any) {
      alert("Review error: " + e.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title & Instructions Banner */}
      <div className="bg-slate-900 border border-slate-800 text-white p-5 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
            <h1 className="font-extrabold text-lg text-white">
              Dual-Screen Synchronized Live Showcase
            </h1>
          </div>
          <p className="text-xs text-slate-300">
            Real-time end-to-end evaluation mode: test Rider booking on the left and Driver dispatch on the right in <b>one view</b>!
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setRiderRide(null);
              setDriverRide(null);
              setDriverIncoming(null);
              setReviewSent(false);
            }}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold border border-slate-700 text-slate-300 transition-colors"
          >
            Reset Demo State
          </button>
        </div>
      </div>

      {/* Dual Screen Cockpits */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Rider Screen */}
        <div className="bg-white rounded-2xl border-2 border-sky-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-sky-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-sky-500 text-white flex items-center justify-center font-bold text-sm">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900">Rider App Screen</h2>
                <div className="text-[10px] text-slate-500">
                  {tokens?.rider?.user?.name || "Rahul Sharma"} • ₹{tokens?.rider?.user?.wallet_balance || 500}
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-50 text-sky-700 border border-sky-200">
              {riderRide ? riderRide.status.toUpperCase() : "IDLE"}
            </span>
          </div>

          {!riderRide ? (
            <div className="space-y-3">
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs space-y-1">
                <div>📍 <b>Pickup:</b> {pickup.name}</div>
                <div>🏁 <b>Drop:</b> {drop.name}</div>
              </div>

              {fareEstimate && (
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-600">Select Tier:</div>
                  <div className="grid grid-cols-3 gap-2">
                    {fareEstimate.tiers.map((t: any) => (
                      <button
                        key={t.tier_name}
                        onClick={() => setSelectedTier(t.tier_name)}
                        className={`p-2 rounded-xl text-center border text-xs transition-all ${
                          selectedTier === t.tier_name
                            ? "border-sky-500 bg-sky-50 text-sky-900 font-bold shadow-sm"
                            : "border-slate-200 bg-white"
                        }`}
                      >
                        <div>{t.vehicle_icon}</div>
                        <div className="text-[11px] font-semibold">{t.tier_name}</div>
                        <div className="text-xs font-black text-slate-900">₹{t.price}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={handleRiderBook}
                className="w-full py-3 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Book {selectedTier} Cab (Step 1)
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-slate-900 text-white text-xs space-y-1">
                <div className="flex justify-between font-bold text-amber-400">
                  <span>Ride #{riderRide.id}</span>
                  <span className="uppercase">{riderRide.status}</span>
                </div>
                <div className="text-[11px] text-slate-300">
                  {riderRide.status === "requested" && "📡 Searching for nearby driver via WebSockets..."}
                  {riderRide.status === "accepted" && "✅ Driver assigned! Ready to simulate."}
                  {riderRide.status === "arriving" && "🚕 Driver is arriving at pickup point..."}
                  {riderRide.status === "in_progress" && "🏎️ Trip in progress to destination..."}
                  {riderRide.status === "completed" && "🎉 Trip Completed!"}
                </div>
              </div>

              {riderRide.status === "completed" && (
                <div className="space-y-2">
                  <button
                    onClick={() => window.open(api.getReceiptUrl(riderRide.id), "_blank")}
                    className="w-full py-2.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    Download PDF Tax Invoice
                  </button>

                  {!reviewSent ? (
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-center space-y-1.5">
                      <div className="text-xs font-bold text-slate-800">Rate Your Ride</div>
                      <div className="flex justify-center gap-1">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            onClick={() => setRating(s)}
                            className={`w-5 h-5 cursor-pointer ${
                              s <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                            }`}
                          />
                        ))}
                      </div>
                      <button
                        onClick={handleRatingSubmit}
                        className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-xs"
                      >
                        Submit Feedback
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-center text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg border border-emerald-200">
                      Feedback Recorded! ⭐
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Driver Screen */}
        <div className="bg-white rounded-2xl border-2 border-amber-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-amber-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-sm">
                <Car className="w-4 h-4" />
              </div>
              <div>
                <h2 className="font-bold text-sm text-slate-900">Driver Cockpit Screen</h2>
                <div className="text-[10px] text-slate-500">
                  {tokens?.driver?.user?.name || "Amit Kumar"} • Toyota Etios (DL-01-AB-4321)
                </div>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
              ONLINE
            </span>
          </div>

          {/* Incoming Dispatch Alert */}
          {driverIncoming && (
            <div className="p-3.5 rounded-xl bg-amber-500 text-slate-950 space-y-2 border-2 border-amber-600 animate-pulse">
              <div className="flex justify-between items-center font-black text-xs">
                <span className="flex items-center gap-1">
                  <Bell className="w-3.5 h-3.5" />
                  NEW DISPATCH INVITE!
                </span>
                <span className="bg-slate-950 text-amber-300 px-2 py-0.5 rounded">
                  ₹{driverIncoming.fare}
                </span>
              </div>
              <div className="text-[11px] bg-white/90 p-2 rounded text-slate-800">
                <div>📍 {driverIncoming.pickup_name}</div>
                <div>🏁 {driverIncoming.drop_name}</div>
              </div>
              <button
                onClick={handleDriverAccept}
                className="w-full py-2 bg-slate-950 hover:bg-slate-900 text-white font-bold rounded-lg text-xs shadow"
              >
                Accept Ride (Step 2)
              </button>
            </div>
          )}

          {/* Driver Active Trip Card */}
          {driverRide ? (
            <div className="p-3.5 rounded-xl bg-slate-900 text-white text-xs space-y-2">
              <div className="flex justify-between font-bold text-amber-400">
                <span>Trip #{driverRide.id} Active</span>
                <span className="uppercase">{driverRide.status}</span>
              </div>

              {driverRide.status !== "completed" && (
                <button
                  onClick={handleSimulate}
                  className="w-full py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-xs flex items-center justify-center gap-1.5 shadow"
                >
                  <Play className="w-4 h-4 fill-slate-950" />
                  Simulate GPS Car Movement (Step 3)
                </button>
              )}

              {driverRide.status === "completed" && (
                <div className="p-2.5 rounded bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 font-semibold text-center">
                  Trip Completed! Fare ₹{driverRide.fare_actual || driverRide.fare_estimate} Credited.
                </div>
              )}
            </div>
          ) : (
            !driverIncoming && (
              <div className="p-6 text-center text-slate-400 text-xs border-2 border-dashed border-slate-200 rounded-xl space-y-1">
                <div className="font-semibold text-slate-600">Waiting for dispatch...</div>
                <p className="text-[11px]">
                  Click <b>"Book Cab"</b> on the left to see the instant WebSocket dispatch alert here!
                </p>
              </div>
            )
          )}
        </div>
      </div>

      {/* Shared Synchronized Map Canvas */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between text-xs font-bold text-slate-800">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            Synchronized Real-Time Map
          </div>
          <span className="text-[11px] font-normal text-slate-500">
            OpenStreetMap • Live GPS Waypoints
          </span>
        </div>

        <div className="h-[450px]">
          <InteractiveMap
            pickup={pickup}
            drop={drop}
            driverLocation={driverLoc}
            className="h-full w-full rounded-xl border border-slate-200"
          />
        </div>
      </div>
    </div>
  );
}
