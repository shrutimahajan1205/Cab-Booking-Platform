"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { createWebSocket } from "@/lib/socket";
import {
  MapPin, Navigation, Car, CreditCard, Tag, Check,
  Sparkles, Download, Star, AlertCircle, RefreshCw, Play
} from "lucide-react";

// Dynamically import Leaflet map to disable SSR
const InteractiveMap = dynamic(() => import("@/components/Map"), { ssr: false });

const PRESET_LOCATIONS = [
  { name: "Connaught Place, Central Delhi", lat: 28.6315, lng: 77.2167 },
  { name: "India Gate, New Delhi", lat: 28.6129, lng: 77.2295 },
  { name: "Cyber City, Gurugram", lat: 28.4950, lng: 77.0895 },
  { name: "IGI Airport, Terminal 3", lat: 28.5562, lng: 77.1000 },
  { name: "Noida Sector 18, Mall of India", lat: 28.5678, lng: 77.3210 },
];

export default function RiderPage() {
  const { user, loginAsRider } = useAuth();

  // Location selections
  const [pickup, setPickup] = useState(PRESET_LOCATIONS[0]);
  const [drop, setDrop] = useState(PRESET_LOCATIONS[1]);

  // Fare & Tiers
  const [estimate, setEstimate] = useState<any>(null);
  const [selectedTier, setSelectedTier] = useState<string>("Economy");
  const [promoCode, setPromoCode] = useState<string>("WELCOME50");
  const [loadingEstimate, setLoadingEstimate] = useState(false);

  // Active Ride State
  const [activeRide, setActiveRide] = useState<any>(null);
  const [driverLocation, setDriverLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [nearbyDrivers, setNearbyDrivers] = useState<any[]>([]);
  const [bookingLoading, setBookingLoading] = useState(false);

  // Rating & Review modal
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // WebSocket reference
  const wsRef = useRef<any>(null);

  // Ensure logged in as rider
  useEffect(() => {
    if (user && user.role !== "rider") {
      loginAsRider();
    }
  }, [user]);

  // Load nearby drivers and initial fare estimate
  useEffect(() => {
    loadNearbyDrivers();
    fetchFareEstimate();
  }, [pickup, drop]);

  // Set up WebSocket listener when ride is active
  useEffect(() => {
    if (!user) return;

    wsRef.current = createWebSocket("rider", user.id, (event, data) => {
      console.log("[Rider WS Event]:", event, data);

      if (event === "ride_accepted") {
        setActiveRide((prev: any) => ({
          ...prev,
          status: "accepted",
          driver_info: data.driver,
        }));
        if (data.driver?.current_lat && data.driver?.current_lng) {
          setDriverLocation({ lat: data.driver.current_lat, lng: data.driver.current_lng });
        }
      }

      if (event === "driver_location") {
        setDriverLocation({ lat: data.lat, lng: data.lng });
      }

      if (event === "ride_status") {
        setActiveRide((prev: any) => ({
          ...prev,
          status: data.status,
          fare_actual: data.fare || prev?.fare_actual,
        }));
      }
    });

    return () => {
      wsRef.current?.close();
    };
  }, [user]);

  const loadNearbyDrivers = async () => {
    try {
      const drivers = await api.getNearbyDrivers(pickup.lat, pickup.lng);
      setNearbyDrivers(drivers);
    } catch (e) {
      console.warn("Could not load nearby drivers", e);
    }
  };

  const fetchFareEstimate = async () => {
    setLoadingEstimate(true);
    try {
      const data = await api.estimateRide({
        pickup_lat: pickup.lat,
        pickup_lng: pickup.lng,
        drop_lat: drop.lat,
        drop_lng: drop.lng,
        promo_code: promoCode,
      });
      setEstimate(data);
    } catch (e) {
      console.error("Fare estimate failed:", e);
    } finally {
      setLoadingEstimate(false);
    }
  };

  const handleBookRide = async () => {
    setBookingLoading(true);
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
      setActiveRide(ride);
      setReviewSubmitted(false);
    } catch (e: any) {
      alert("Error booking ride: " + e.message);
    } finally {
      setBookingLoading(false);
    }
  };

  const handleSimulateMovement = async () => {
    if (!activeRide) return;
    try {
      await api.simulateRide(activeRide.id);
    } catch (e: any) {
      alert("Simulation error: " + e.message);
    }
  };

  const handleSubmitReview = async () => {
    if (!activeRide) return;
    try {
      await api.submitReview({
        ride_id: activeRide.id,
        rating,
        comment,
      });
      setReviewSubmitted(true);
      alert("Thank you for your rating!");
    } catch (e: any) {
      alert("Review error: " + e.message);
    }
  };

  const handleDownloadReceipt = () => {
    if (!activeRide) return;
    window.open(api.getReceiptUrl(activeRide.id), "_blank");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[calc(100vh-12rem)]">
      {/* Left Control Panel */}
      <div className="lg:col-span-5 flex flex-col space-y-4">
        {/* Booking & Ride Status Container */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="font-bold text-slate-900 text-lg flex items-center gap-2">
              <Car className="w-5 h-5 text-sky-600" />
              Book a Ride
            </h2>
            <span className="text-xs px-2.5 py-1 rounded-full bg-sky-50 text-sky-700 font-semibold border border-sky-100">
              Rider: {user?.name || "Passenger"}
            </span>
          </div>

          {!activeRide ? (
            /* Booking Setup */
            <div className="space-y-4">
              {/* Pickup Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-emerald-500" /> Pickup Location
                </label>
                <select
                  value={pickup.name}
                  onChange={(e) => {
                    const loc = PRESET_LOCATIONS.find((l) => l.name === e.target.value);
                    if (loc) setPickup(loc);
                  }}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {PRESET_LOCATIONS.map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Drop-off Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-600 mb-1 flex items-center gap-1.5">
                  <Navigation className="w-3.5 h-3.5 text-rose-500" /> Destination
                </label>
                <select
                  value={drop.name}
                  onChange={(e) => {
                    const loc = PRESET_LOCATIONS.find((l) => l.name === e.target.value);
                    if (loc) setDrop(loc);
                  }}
                  className="w-full text-xs rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {PRESET_LOCATIONS.map((loc) => (
                    <option key={loc.name} value={loc.name}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Promo Code Input */}
              <div className="flex gap-2 items-center">
                <div className="relative flex-1">
                  <Tag className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value.toUpperCase())}
                    placeholder="Enter Promo Code (e.g. WELCOME50)"
                    className="w-full text-xs pl-8 pr-3 py-2 rounded-xl border border-slate-200 bg-slate-50 uppercase font-semibold text-slate-800 focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <button
                  onClick={fetchFareEstimate}
                  className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                >
                  Apply
                </button>
              </div>

              {/* Tier Options */}
              {estimate && (
                <div className="space-y-2 pt-2">
                  <div className="text-xs font-bold text-slate-700 flex justify-between">
                    <span>Available Vehicles</span>
                    <span className="text-slate-400 font-normal">
                      ~{estimate.distance_km} km • {estimate.duration_mins} mins
                    </span>
                  </div>

                  <div className="space-y-2">
                    {estimate.tiers.map((t: any) => {
                      const isSelected = selectedTier === t.tier_name;
                      return (
                        <div
                          key={t.tier_name}
                          onClick={() => setSelectedTier(t.tier_name)}
                          className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                            isSelected
                              ? "border-sky-500 bg-sky-50/50 shadow-sm ring-1 ring-sky-500"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{t.vehicle_icon}</span>
                            <div>
                              <div className="font-bold text-xs text-slate-900">{t.tier_name}</div>
                              <div className="text-[10px] text-slate-500">{t.description}</div>
                              <div className="text-[10px] text-emerald-600 font-medium">
                                ETA {t.eta_mins} mins away
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-black text-sm text-slate-900">₹{t.price}</div>
                            {t.discount > 0 && (
                              <div className="text-[10px] text-slate-400 line-through">
                                ₹{t.original_price}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Request Ride Button */}
              <button
                onClick={handleBookRide}
                disabled={bookingLoading}
                className="w-full py-3.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-bold text-sm shadow-lg shadow-amber-400/20 transition-all flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50"
              >
                {bookingLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span>Request {selectedTier} Cab</span>
              </button>
            </div>
          ) : (
            /* Active Ride Tracker Card */
            <div className="space-y-4">
              {/* Status Header */}
              <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">
                    Trip #{activeRide.id}
                  </span>
                  <span
                    className={`text-xs px-2.5 py-0.5 rounded-full font-bold capitalize ${
                      activeRide.status === "completed"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                        : "bg-amber-400/20 text-amber-300 border border-amber-400/40 animate-pulse"
                    }`}
                  >
                    {activeRide.status.replace("_", " ")}
                  </span>
                </div>

                <div className="text-sm font-semibold text-slate-200">
                  {activeRide.status === "requested" && "Matching nearby driver..."}
                  {activeRide.status === "accepted" && "Driver accepted & preparing route"}
                  {activeRide.status === "arriving" && "Driver is arriving at pickup location"}
                  {activeRide.status === "in_progress" && "Trip in progress to destination"}
                  {activeRide.status === "completed" && "Trip completed successfully!"}
                </div>
              </div>

              {/* Assigned Driver Card */}
              {activeRide.driver_info && (
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-bold text-sm">
                        {activeRide.driver_info.name?.[0] || "D"}
                      </div>
                      <div>
                        <div className="font-bold text-slate-900">{activeRide.driver_info.name}</div>
                        <div className="text-slate-500">{activeRide.driver_info.vehicle_info}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-1 font-bold text-amber-600">
                        <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                        <span>{activeRide.driver_info.rating_avg}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">Verified Driver</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Simulation Demo Trigger */}
              {activeRide.status !== "completed" && (
                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 space-y-2">
                  <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                    <Play className="w-3.5 h-3.5 text-amber-600" />
                    Live Motion Simulation
                  </div>
                  <p className="text-[11px] text-amber-800 leading-tight">
                    Start automated driver route simulation to watch the cab move step-by-step on the map.
                  </p>
                  <button
                    onClick={handleSimulateMovement}
                    className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-lg text-xs shadow-sm transition-all"
                  >
                    Simulate Driver Trip Now
                  </button>
                </div>
              )}

              {/* Post-Trip Completion Actions */}
              {activeRide.status === "completed" && (
                <div className="space-y-3 pt-2">
                  {/* Download PDF Receipt */}
                  <button
                    onClick={handleDownloadReceipt}
                    className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Download className="w-4 h-4 text-amber-400" />
                    Download Official Tax Invoice PDF
                  </button>

                  {/* Rating Section */}
                  {!reviewSubmitted ? (
                    <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 text-center">
                      <div className="text-xs font-bold text-slate-800">Rate your experience</div>
                      <div className="flex justify-center gap-2">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            onClick={() => setRating(star)}
                            className="text-xl transition-transform hover:scale-125"
                          >
                            <Star
                              className={`w-6 h-6 ${
                                star <= rating
                                  ? "fill-amber-400 text-amber-400"
                                  : "text-slate-300"
                              }`}
                            />
                          </button>
                        ))}
                      </div>
                      <input
                        type="text"
                        placeholder="Write a quick comment..."
                        value={comment}
                        onChange={(e) => setComment(e.target.value)}
                        className="w-full text-xs rounded-lg border border-slate-200 p-2"
                      />
                      <button
                        onClick={handleSubmitReview}
                        className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors"
                      >
                        Submit Feedback
                      </button>
                    </div>
                  ) : (
                    <div className="p-3 bg-emerald-50 text-emerald-800 rounded-xl text-xs font-semibold text-center border border-emerald-200">
                      Feedback submitted successfully! ⭐
                    </div>
                  )}

                  {/* Book Another Ride */}
                  <button
                    onClick={() => {
                      setActiveRide(null);
                      setDriverLocation(null);
                    }}
                    className="w-full py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
                  >
                    Book Another Ride
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Map Canvas */}
      <div className="lg:col-span-7 h-[500px] lg:h-auto min-h-[500px]">
        <InteractiveMap
          pickup={pickup}
          drop={drop}
          driverLocation={driverLocation}
          nearbyDrivers={nearbyDrivers}
          className="h-full w-full rounded-2xl shadow-md border border-slate-200"
        />
      </div>
    </div>
  );
}
