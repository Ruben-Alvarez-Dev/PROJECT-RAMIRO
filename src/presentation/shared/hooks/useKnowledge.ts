import { useState, useCallback } from 'react';
import { TierLevel } from '@core/domain/enums';

export interface KnowledgeResult {
  documentId: string;
  title: string;
  chunk: string;
  score: number;
  tier: TierLevel;
}

export interface UseKnowledgeReturn {
  results: KnowledgeResult[];
  isSearching: boolean;
  error: string | null;
  search: (query: string, tier?: TierLevel) => Promise<void>;
  clear: () => void;
}

export function useKnowledge(): UseKnowledgeReturn {
  const [results, setResults] = useState<KnowledgeResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string, tier?: TierLevel) => {
    setIsSearching(true);
    setError(null);
    try {
      // Placeholder: will connect to Qdrant via MCP tool
      // For now, return mock results
      const mockResults: KnowledgeResult[] = [
        {
          documentId: '1',
          title: query,
          chunk: `Search results for: ${query}. Connect to ramiro-knowledge MCP for real results.`,
          score: 0.85,
          tier: tier ?? TierLevel.CORE,
        },
      ];
      setResults(mockResults);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setIsSearching(false);
    }
  }, []);

  const clear = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return { results, isSearching, error, search, clear };
}
