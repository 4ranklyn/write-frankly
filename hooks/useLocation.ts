"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";

export function useLocation() {
  const { user } = useAuth();
  const [locality, setLocality] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCurrentLocation = async () => {
    if (!navigator.geolocation || !user) return;

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const token = auth.currentUser
            ? await auth.currentUser.getIdToken()
            : 'guest_token';

          const res = await fetch("/api/location/geocode", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              latitude: pos.coords.latitude,
              longitude: pos.coords.longitude,
            }),
          });

          const data = await res.json();
          if (data.locality) {
            setLocality(data.locality);
          }
        } catch (err) {
          console.error("Location lookup failed:", err);
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.warn("Geolocation permission denied/unavailable:", error.message);
        setLoading(false);
      }
    );
  };

  return { locality, loading, fetchCurrentLocation };
}
