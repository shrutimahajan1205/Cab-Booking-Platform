const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000/api";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errorDetail = "API error";
    try {
      const err = await response.json();
      errorDetail = err.detail || err.message || JSON.stringify(err);
    } catch (_) {}
    throw new Error(errorDetail);
  }

  return response.json();
}

export const api = {
  // Auth
  login: (data: any) => apiFetch("/auth/login", { method: "POST", body: JSON.stringify(data) }),
  register: (data: any) => apiFetch("/auth/register", { method: "POST", body: JSON.stringify(data) }),
  getSession: () => apiFetch("/auth/session"),
  getDemoTokens: () => apiFetch("/auth/demo-tokens"),

  // Rides
  estimateRide: (data: { pickup_lat: number; pickup_lng: number; drop_lat: number; drop_lng: number; promo_code?: string }) =>
    apiFetch("/rides/estimate", { method: "POST", body: JSON.stringify(data) }),
  createRide: (data: any) => apiFetch("/rides/request", { method: "POST", body: JSON.stringify(data) }),
  getRide: (id: number) => apiFetch(`/rides/${id}`),
  acceptRide: (id: number) => apiFetch(`/rides/${id}/accept`, { method: "POST" }),
  updateRideStatus: (id: number, status: string) =>
    apiFetch(`/rides/${id}/status`, { method: "POST", body: JSON.stringify({ status }) }),
  simulateRide: (id: number) => apiFetch(`/rides/${id}/simulate`, { method: "POST" }),
  getRideHistory: () => apiFetch("/rides/history"),

  // Drivers
  getNearbyDrivers: (lat: number, lng: number, radiusKm: number = 15) =>
    apiFetch(`/drivers/nearby?lat=${lat}&lng=${lng}&radius_km=${radiusKm}`),
  getMyDriverProfile: () => apiFetch("/drivers/me"),
  updateDriverStatus: (status: string) => apiFetch("/drivers/status", { method: "POST", body: JSON.stringify({ status }) }),
  updateDriverLocation: (lat: number, lng: number) =>
    apiFetch("/drivers/location", { method: "POST", body: JSON.stringify({ lat, lng }) }),

  // Payments & Receipts
  createPaymentIntent: (ride_id: number) =>
    apiFetch("/payments/create-intent", { method: "POST", body: JSON.stringify({ ride_id }) }),
  payWithWallet: (ride_id: number) =>
    apiFetch("/payments/pay-with-wallet", { method: "POST", body: JSON.stringify({ ride_id }) }),
  getReceiptUrl: (ride_id: number) => `${API_BASE}/payments/receipt/${ride_id}`,

  // Wallet & Promos
  getWalletBalance: () => apiFetch("/wallet/balance"),
  topUpWallet: (amount: number) => apiFetch("/wallet/top-up", { method: "POST", body: JSON.stringify({ amount }) }),
  validatePromo: (code: string, fare: number) =>
    apiFetch("/promo/validate", { method: "POST", body: JSON.stringify({ code, fare }) }),
  getActivePromos: () => apiFetch("/promo/list"),

  // Reviews
  submitReview: (data: { ride_id: number; rating: number; comment?: string }) =>
    apiFetch("/reviews", { method: "POST", body: JSON.stringify(data) }),
  getUserReviews: (userId: number) => apiFetch(`/reviews/user/${userId}`),
};
