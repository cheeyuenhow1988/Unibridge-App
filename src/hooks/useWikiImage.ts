import { useEffect, useState } from 'react';

const cache = new Map<string, string | null>();

/**
 * Real campus photo: the lead image of the institution's Wikipedia article
 * (CC-licensed, CORS-open REST API). Returns null until loaded or on failure —
 * callers keep their placeholder in that case.
 */
export function useWikiImage(pageTitle: string): string | null {
  const [uri, setUri] = useState<string | null>(cache.get(pageTitle) ?? null);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let cancelled = false;
    if (cache.has(pageTitle)) {
      setUri(cache.get(pageTitle) ?? null);
      return;
    }
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(pageTitle.replace(/ /g, '_'))}`)
      .then((r) => r.json())
      .then((json: { originalimage?: { source?: string }; thumbnail?: { source?: string } }) => {
        const src = json.originalimage?.source ?? json.thumbnail?.source ?? null;
        cache.set(pageTitle, src);
        if (!cancelled) setUri(src);
      })
      .catch(() => {
        cache.set(pageTitle, null);
        if (!cancelled) setUri(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pageTitle]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return uri;
}
