import { useState, useEffect, useCallback } from 'react';

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export function usePollableFetch<T>(endpoint: string, fallback: T, intervalMs = 10000) {
  const [data, setData] = useState<T>(fallback);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}${endpoint}`);
      if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error(`Failed to fetch ${endpoint}:`, err);
      // Fallback is maintained on error to prevent UI crash
    } finally {
      setLoading(false);
    }
  }, [endpoint]);

  useEffect(() => {
    fetchData();
    const timer = setInterval(fetchData, intervalMs);
    return () => clearInterval(timer);
  }, [fetchData, intervalMs]);

  return { data, loading, refetch: fetchData };
}
