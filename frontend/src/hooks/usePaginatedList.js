import { useEffect, useState, useCallback } from 'react';

// Manages a "Load more" list. `fetchPage(page)` must resolve to
// { items: [...], hasMore: boolean }. Refetches page 1 whenever anything in
// `deps` changes (e.g. a filter), and appends subsequent pages on demand.
export function usePaginatedList(fetchPage, deps = []) {
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    setError(false);
    fetchPage(1)
      .then((res) => { setItems(res.items); setHasMore(res.hasMore); setPage(1); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(load, [load]);

  function loadMore() {
    setLoadingMore(true);
    fetchPage(page + 1)
      .then((res) => { setItems((prev) => [...prev, ...res.items]); setHasMore(res.hasMore); setPage((p) => p + 1); })
      .finally(() => setLoadingMore(false));
  }

  return { items, loading, loadingMore, hasMore, error, reload: load, loadMore };
}
