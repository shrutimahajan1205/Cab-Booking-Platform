"use client";

import React, { useEffect, useRef } from "react";

interface MarkerLocation {
  lat: number;
  lng: number;
  label?: string;
}

interface MapProps {
  pickup?: MarkerLocation | null;
  drop?: MarkerLocation | null;
  driverLocation?: MarkerLocation | null;
  nearbyDrivers?: Array<{ id: number; current_lat: number; current_lng: number; vehicle_type: string }>;
  onSelectLocation?: (lat: number, lng: number) => void;
  interactive?: boolean;
  className?: string;
}

export default function InteractiveMap({
  pickup,
  drop,
  driverLocation,
  nearbyDrivers = [],
  onSelectLocation,
  interactive = true,
  className = "h-full w-full min-h-[400px]",
}: MapProps) {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<Record<string, any>>({});
  const polylineRef = useRef<any>(null);

  useEffect(() => {
    let isMounted = true;

    async function initMap() {
      if (!mapContainerRef.current || mapInstanceRef.current) return;

      const L = (await import("leaflet")).default;

      // Default center: Delhi / Connaught Place
      const centerLat = pickup?.lat || 28.6139;
      const centerLng = pickup?.lng || 77.2090;

      const map = L.map(mapContainerRef.current, {
        center: [centerLat, centerLng],
        zoom: 13,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      if (interactive && onSelectLocation) {
        map.on("click", (e: any) => {
          onSelectLocation(e.latlng.lat, e.latlng.lng);
        });
      }

      mapInstanceRef.current = map;
    }

    initMap();

    return () => {
      isMounted = false;
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers and Polylines
  useEffect(() => {
    async function updateLayers() {
      if (!mapInstanceRef.current) return;
      const L = (await import("leaflet")).default;
      const map = mapInstanceRef.current;

      // 1. Pickup Marker
      if (pickup?.lat && pickup?.lng) {
        const pickupIcon = L.divIcon({
          className: "custom-pin",
          html: `
            <div style="background-color:#10B981; color:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 6px -1px rgba(0,0,0,0.3); border:2px solid white; font-weight:bold; font-size:14px;">
              📍
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        if (markersRef.current.pickup) {
          markersRef.current.pickup.setLatLng([pickup.lat, pickup.lng]);
        } else {
          markersRef.current.pickup = L.marker([pickup.lat, pickup.lng], { icon: pickupIcon })
            .addTo(map)
            .bindPopup("<b>Pickup Location</b>");
        }
      } else if (markersRef.current.pickup) {
        map.removeLayer(markersRef.current.pickup);
        delete markersRef.current.pickup;
      }

      // 2. Drop-off Marker
      if (drop?.lat && drop?.lng) {
        const dropIcon = L.divIcon({
          className: "custom-pin",
          html: `
            <div style="background-color:#EF4444; color:white; border-radius:50%; width:32px; height:32px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 6px -1px rgba(0,0,0,0.3); border:2px solid white; font-weight:bold; font-size:14px;">
              🏁
            </div>
          `,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        if (markersRef.current.drop) {
          markersRef.current.drop.setLatLng([drop.lat, drop.lng]);
        } else {
          markersRef.current.drop = L.marker([drop.lat, drop.lng], { icon: dropIcon })
            .addTo(map)
            .bindPopup("<b>Destination</b>");
        }
      } else if (markersRef.current.drop) {
        map.removeLayer(markersRef.current.drop);
        delete markersRef.current.drop;
      }

      // 3. Moving Driver Car Marker
      if (driverLocation?.lat && driverLocation?.lng) {
        const carIcon = L.divIcon({
          className: "custom-car-pin",
          html: `
            <div style="background-color:#F59E0B; color:black; border-radius:12px; padding:4px 6px; display:flex; align-items:center; justify-content:center; box-shadow:0 4px 10px rgba(245,158,11,0.5); border:2px solid #000; font-size:16px;">
              🚕
            </div>
          `,
          iconSize: [36, 32],
          iconAnchor: [18, 16],
        });

        if (markersRef.current.driver) {
          markersRef.current.driver.setLatLng([driverLocation.lat, driverLocation.lng]);
        } else {
          markersRef.current.driver = L.marker([driverLocation.lat, driverLocation.lng], { icon: carIcon })
            .addTo(map)
            .bindPopup("<b>Your Driver</b>");
        }
      } else if (markersRef.current.driver) {
        map.removeLayer(markersRef.current.driver);
        delete markersRef.current.driver;
      }

      // 4. Nearby Drivers
      // Clear old nearby markers
      Object.keys(markersRef.current).forEach((key) => {
        if (key.startsWith("nearby_")) {
          map.removeLayer(markersRef.current[key]);
          delete markersRef.current[key];
        }
      });

      if (!driverLocation) {
        nearbyDrivers.forEach((d) => {
          const nearbyIcon = L.divIcon({
            className: "nearby-car",
            html: `
              <div style="background:white; border-radius:50%; width:28px; height:28px; display:flex; align-items:center; justify-content:center; box-shadow:0 2px 5px rgba(0,0,0,0.2); border:1.5px solid #0284C7; font-size:14px;">
                🚗
              </div>
            `,
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          });
          const key = `nearby_${d.id}`;
          markersRef.current[key] = L.marker([d.current_lat, d.current_lng], { icon: nearbyIcon })
            .addTo(map)
            .bindPopup(`<b>${d.vehicle_type} Cab</b>`);
        });
      }

      // 5. Polyline Route
      if (pickup && drop) {
        const points: [number, number][] = [
          [pickup.lat, pickup.lng],
          [drop.lat, drop.lng],
        ];
        if (polylineRef.current) {
          polylineRef.current.setLatLngs(points);
        } else {
          polylineRef.current = L.polyline(points, {
            color: "#0284C7",
            weight: 4,
            opacity: 0.8,
            dashArray: "6, 8",
          }).addTo(map);
        }
        map.fitBounds(L.latLngBounds(points), { padding: [40, 40] });
      } else if (polylineRef.current) {
        map.removeLayer(polylineRef.current);
        polylineRef.current = null;
      }
    }

    updateLayers();
  }, [pickup, drop, driverLocation, nearbyDrivers]);

  return (
    <div className={`relative overflow-hidden shadow-lg border border-slate-200 rounded-xl bg-slate-100 ${className}`}>
      <div ref={mapContainerRef} className="h-full w-full" />
      {interactive && (
        <div className="absolute bottom-3 left-3 z-[1000] bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] text-slate-600 font-medium shadow-sm flex items-center gap-2 pointer-events-none">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          Live OpenStreetMap & Geolocation Active
        </div>
      )}
    </div>
  );
}
