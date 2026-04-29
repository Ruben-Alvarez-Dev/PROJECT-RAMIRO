// src/presentation/shared/hooks/useKnowledge.ts
import { useState, useCallback } from 'react';

interface SearchResult {
  documentId: string;
  title: string;
  chunk: string;
  score: number;
  tier: number;
}

interface UseKnowledgeState {
  results: SearchResult[];
  isSearching: boolean;
  error: string | null;
}

export function useKnowledge() {
  const [state, setState] = useState<UseKnowledgeState>({
    results: [],
    isSearching: false,
    error: null,
  });

  const search = useCallback(async (query: string, tier?: number) => {
    setState(prev => ({ ...prev, isSearching: true, error: null }));

    try {
      const params = new URLSearchParams({ query });
      if (tier !== undefined) params.set('tier', String(tier));

      const response = await fetch(`/api/knowledge/search?${params}`);
      if (!response.ok) throw new Error(`Search failed: ${response.statusText}`);

      const data = await response.json() as { results: SearchResult[] };
      setState(prev => ({ ...prev, results: data.results, isSearching: false }));
      return data.results;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Search failed';
      setState(prev => ({ ...prev, error: message, isSearching: false }));
      return [];
    }
  }, []);

  const clearResults = useCallback(() => {
    setState(prev => ({ ...prev, results: [], error: null }));
  }, []);

  return {
    ...state,
    search,
    clearResults,
  };
}
