
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";


export default function AuthPage() {
  const router = useRouter();
  const { refreshSession } = useAuth();

  const [isSignup, setIsSignup] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("rider");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      const result = isSignup
        ? await api.register({ name, email, password, role })
        : await api.login({ email, password });

      localStorage.setItem("token", result.access_token);
      await refreshSession();
      router.replace("/");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Something went wrong"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-[75vh] flex items-center justify-center">
      <div className="bg-white w-full max-w-md p-8 rounded-2xl shadow-xl border border-slate-200">
        <div className="text-center mb-6">
          <div className="text-4xl mb-3">🚕</div>
          <h1 className="text-3xl font-bold text-slate-900">
            SwiftCab
          </h1>
          <p className="text-slate-500 mt-2">
            {isSignup
              ? "Create your account"
              : "Welcome back! Please log in"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignup && (
            <>
              <input
                className="w-full border rounded-lg p-3"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                required
              />

              <select
                className="w-full border rounded-lg p-3 bg-white"
                value={role}
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="rider">Rider</option>
                <option value="driver">Driver</option>
              </select>
            </>
          )}

          <input
            className="w-full border rounded-lg p-3"
            type="email"
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <input
            className="w-full border rounded-lg p-3"
            type="password"
            placeholder="Password (minimum 6 characters)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="w-full bg-amber-400 hover:bg-amber-300 disabled:opacity-60 text-slate-950 font-bold p-3 rounded-lg"
          >
            {busy
              ? "Please wait..."
              : isSignup
              ? "Create Account"
              : "Login"}
          </button>
        </form>

        <p className="text-center text-sm text-slate-600 mt-6">
          {isSignup
            ? "Already have an account?"
            : "Don't have an account?"}{" "}
          <button
            type="button"
            className="text-blue-600 font-semibold"
            onClick={() => {
              setIsSignup(!isSignup);
              setError("");
            }}
          >
            {isSignup ? "Login" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}
