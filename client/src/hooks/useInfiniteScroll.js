import { useState, useEffect, useCallback } from "react";

const useInfiniteScroll = (fetchMore, hasMore, loading) => {
  const [isFetching, setIsFetching] = useState(false);

  useEffect(() => {
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (!isFetching) return;
    fetchMoreData();
  }, [isFetching]);

  const handleScroll = () => {
    if (
      window.innerHeight + document.documentElement.scrollTop !==
        document.documentElement.offsetHeight ||
      isFetching ||
      loading ||
      !hasMore
    )
      return;
    setIsFetching(true);
  };

  const fetchMoreData = useCallback(async () => {
    if (hasMore && !loading) {
      await fetchMore();
    }
    setIsFetching(false);
  }, [fetchMore, hasMore, loading]);

  return [isFetching, setIsFetching];
};

export default useInfiniteScroll;
