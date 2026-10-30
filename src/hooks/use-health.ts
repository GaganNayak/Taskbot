"use client";

import { useEffect, useState } from "react";

export type Health = { provider: string; model: string; keyConfigured: boolean; timeZone: string };

export const useHealth = (): Health | null => {
  const [health, setHealth] = useState<Health | null>(null);

  useEffect(() => {
    fetch("/api/health", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then(setHealth)
      .catch(() => setHealth(null));
  }, []);

  return health;
};
