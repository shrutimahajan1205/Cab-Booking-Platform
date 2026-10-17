"use client";

import React, { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { Wallet, PlusCircle, CreditCard, Tag, Check, Sparkles, ShieldCheck } from "lucide-react";

export default function WalletPage() {
  const { user, refreshSession } = useAuth();
  const [balance, setBalance] = useState(500.0);
  const [topUpAmount, setTopUpAmount] = useState(200);
  const [promos, setPromos] = useState<any[]>([]);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const balData = await api.getWalletBalance();
        setBalance(balData.wallet_balance);
        const promoList = await api.getActivePromos();
        setPromos(promoList);
      } catch (e) {
        console.warn("Wallet data fetch:", e);
      }
    }
    if (user) loadData();
  }, [user]);

  const handleTopUp = async (amount: number) => {
    setLoading(true);
    try {
      const res = await api.topUpWallet(amount);
      setBalance(res.new_balance);
      await refreshSession();
      alert(`₹${amount} added successfully to your wallet!`);
    } catch (e: any) {
      alert("Top up error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Wallet Card */}
      <div className="bg-gradient-to-br from-slate-900 to-sky-950 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Digital Ride Wallet
            </span>
            <div className="text-3xl md:text-5xl font-black text-amber-400">
              ₹{balance.toFixed(2)}
            </div>
            <div className="text-xs text-slate-300">
              Account: <b>{user?.name || "Passenger"}</b> ({user?.email})
            </div>
          </div>

          <div className="inline-flex items-center gap-2 bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 text-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Stripe Secured Payments</span>
          </div>
        </div>

        {/* Quick Top-Up */}
        <div className="bg-slate-800/60 backdrop-blur-sm p-4 rounded-2xl border border-slate-700/60 space-y-3">
          <div className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
            <CreditCard className="w-3.5 h-3.5 text-amber-400" />
            Instant Wallet Top-Up
          </div>

          <div className="flex flex-wrap gap-2 items-center">
            {[100, 200, 500, 1000].map((amt) => (
              <button
                key={amt}
                onClick={() => handleTopUp(amt)}
                disabled={loading}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 active:scale-95 text-white font-bold text-xs rounded-xl transition-all"
              >
                + ₹{amt}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Promo Codes Section */}
      <div className="space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Tag className="w-5 h-5 text-amber-500" />
            Active Promotional Vouchers
          </h2>
          <p className="text-xs text-slate-500">
            Apply these codes at checkout in the Rider Portal for instant fare discounts.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {promos.map((p) => (
            <div
              key={p.code}
              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:border-amber-400 transition-colors flex flex-col justify-between space-y-4"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono font-black text-amber-600 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200 text-xs">
                    {p.code}
                  </span>
                  <span className="text-xs font-bold text-emerald-600">
                    {p.discount_percent}% OFF
                  </span>
                </div>
                <p className="text-xs text-slate-600">
                  Save up to <b>₹{p.max_discount}</b> on trips with minimum fare ₹{p.min_fare}.
                </p>
              </div>

              <button
                onClick={() => copyCode(p.code)}
                className="w-full py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition-colors flex items-center justify-center gap-1.5"
              >
                {copiedCode === p.code ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <span>Copy Code</span>
                )}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
