"use client";

import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { auth } from "@/lib/firebase";

export function useLocation() {
  const { user } = useAuth();
  const [locality, setLocality] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchCurrentLocation = async (): Promise<string | null> => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      console.warn("Geolocation is not supported in this environment");
      return null;
    }

    setLoading(true);
    return new Promise<string | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          try {
            const token = auth.currentUser
              ? await auth.currentUser.getIdToken().catch(() => 'guest_token')
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

            if (!res.ok) {
              throw new Error(`Geocode request failed with status ${res.status}`);
            }

            const data = await res.json();
            if (data && typeof data.locality === 'string' && data.locality.trim()) {
              const detectedLocality = data.locality.trim();
              setLocality(detectedLocality);
              resolve(detectedLocality);
              return;
            }
            resolve(null);
          } catch (err) {
            console.error("Location lookup failed:", err);
            resolve(null);
          } finally {
            setLoading(false);
          }
        },
        (error) => {
          console.warn("Geolocation permission denied/unavailable:", error.message);
          setLoading(false);
          resolve(null);
        },
        { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 }
      );
    });
  };

  return { locality, loading, fetchCurrentLocation };
}
