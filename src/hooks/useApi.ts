'use client';

import { useState, useEffect, useCallback } from 'react';

type State<T> = {
  data: T | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
};

export function useApi<T>(url: string, initialData: T | null = null): State<T> {
  const [data, setData]       = useState<T | null>(initialData);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [tick, setTick]       = useState(0);

  const refetch = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(url)
      .then((r) => r.json())
      .then((json) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(String(e));
          setLoading(false);
        }
      });

    return () => { cancelled = true; };
  }, [url, tick]);

  return { data, loading, error, refetch };
}
