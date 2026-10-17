"use client";
import { useCallback, useEffect, useState } from "react";
import { cityByName, CITIES } from "@droba/shared";
import { useAuth } from "./auth";

export interface Place {
  lat: number;
  lng: number;
  label: string;
  source: "gps" | "profile" | "default";
}

const KEY = "droba:place";

function nearestCity(lat: number, lng: number) {
  let best: (typeof CITIES)[number] = CITIES[0];
  let d = Infinity;
  for (const c of CITIES) {
    const x = (c.lat - lat) ** 2 + (c.lng - lng) ** 2;
    if (x < d) {
      d = x;
      best = c;
    }
  }
  return best.name;
}

/** The shopper's location for "near me": remembered GPS fix → profile city → Lagos. */
export function useLocation() {
  const { user, ready } = useAuth();
  const [place, setPlace] = useState<Place | null>(null);
  const [locating, setLocating] = useState(false);

  useEffect(() => {
    if (!ready) return;
    try {
      const saved = sessionStorage.getItem(KEY);
      if (saved) return setPlace(JSON.parse(saved) as Place);
    } catch {
      /* storage unavailable */
    }
    if (user?.location) return setPlace({ ...user.location, label: user.city ?? "you", source: "profile" });
    const c = cityByName(user?.city ?? "Lagos")!;
    setPlace({ lat: c.lat, lng: c.lng, label: c.name, source: "default" });
  }, [ready, user]);

  const locate = useCallback(() => {
    if (!("geolocation" in navigator)) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const p: Place = { lat: +pos.coords.latitude.toFixed(4), lng: +pos.coords.longitude.toFixed(4), label: nearestCity(pos.coords.latitude, pos.coords.longitude), source: "gps" };
        try {
          sessionStorage.setItem(KEY, JSON.stringify(p));
        } catch {
          /* ignore */
        }
        setPlace(p);
        setLocating(false);
      },
      () => setLocating(false),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  }, []);

  return { place, locate, locating };
}
