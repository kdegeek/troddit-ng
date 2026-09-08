import { useRouter } from "next/router";
import React, { useEffect, useRef, useState } from "react";
import { useMainContext } from "../MainContext";
import { useTAuth } from "../PremiumAuthContext";
import { getRedditSearch } from "../RedditAPI";
import Feed from "./Feed";
import SubCard from "./cards/SubCard";
import SubCardPlaceHolder from "./cards/SubCardPlaceHolder";
import Checkbox from "./ui/Checkbox";

type SearchType = "posts" | "sr" | "user";

const SearchPage = ({ query }) => {
  const { isLoaded, premium } = useTAuth();
  const router = useRouter();
  const context: any = useMainContext();
  const { safeSearch, setSafeSearch } = context;
  const type: SearchType =
    router.query.type === "sr"
      ? "sr"
      : router.query.type === "user"
        ? "user"
        : "posts";
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [after, setAfter] = useState("");
  const [error, setError] = useState("");
  const request = useRef(0);

  const selectType = (nextType: SearchType) => {
    const nextQuery = { ...router.query };
    if (nextType === "posts") delete nextQuery.type;
    else nextQuery.type = nextType;
    router.push({ pathname: router.pathname, query: nextQuery }, undefined, {
      shallow: true,
    });
  };

  const fetchResults = async (cursor = "", append = false) => {
    if (type === "posts") return;
    const currentRequest = ++request.current;
    append ? setLoadingMore(true) : setLoading(true);
    setError("");
    try {
      const data = await getRedditSearch({
        params: { q: query?.q },
        after: cursor,
        include_over_18: safeSearch ? undefined : true,
        searchtype: type,
        isPremium: premium?.isPremium ?? false,
      });
      if (currentRequest !== request.current) return;
      const children = (data?.children ?? []).filter(
        (item) => type !== "user" || item?.data?.accept_followers === true,
      );
      setResults((current) => (append ? [...current, ...children] : children));
      setAfter(data?.after ?? "");
    } catch (err) {
      if (currentRequest !== request.current) return;
      if (err?.message === "PREMIUM REQUIRED") context.setPremiumModal(true);
      else setError("Search results could not be loaded. Please try again.");
    } finally {
      if (currentRequest === request.current) {
        setLoading(false);
        setLoadingMore(false);
      }
    }
  };

  useEffect(() => {
    setResults([]);
    setAfter("");
    setError("");
    if (isLoaded && type !== "posts") fetchResults();
    return () => {
      request.current++;
    };
  }, [query?.q, safeSearch, type, isLoaded, premium?.isPremium]);

  const labels: Array<[SearchType, string]> = [
    ["posts", "Posts"],
    ["sr", "Communities"],
    ["user", "People"],
  ];

  return (
    <div>
      <div className="mx-auto mb-4 w-full md:w-11/12">
        <div className="flex flex-col gap-3 border border-th-border bg-th-post p-3 rounded-xl md:flex-row md:items-center">
          <div
            className="flex gap-2"
            role="tablist"
            aria-label="Search result type"
          >
            {labels.map(([value, label]) => (
              <button
                key={value}
                role="tab"
                id={`search-type-${value}`}
                aria-controls="search-results"
                tabIndex={type === value ? 0 : -1}
                aria-selected={type === value}
                onClick={() => selectType(value)}
                onKeyDown={(event) => {
                  const index = labels.findIndex(([key]) => key === value);
                  const next = event.key === "ArrowRight" ? (index + 1) % labels.length : event.key === "ArrowLeft" ? (index + labels.length - 1) % labels.length : event.key === "Home" ? 0 : event.key === "End" ? labels.length - 1 : -1;
                  if (next < 0) return;
                  event.preventDefault();
                  selectType(labels[next][0]);
                  document.getElementById(`search-type-${labels[next][0]}`)?.focus();
                }}
                className={`px-3 py-2 rounded-lg hover:bg-th-highlight ${
                  type === value ? "font-bold bg-th-highlight" : "opacity-60"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="md:ml-auto">
            <Checkbox
              clickEvent={() => setSafeSearch((current) => !current)}
              toggled={safeSearch}
              labelText="Safe Search"
            />
          </div>
        </div>
      </div>

      <div id="search-results" role="tabpanel" aria-labelledby={`search-type-${type}`}>
      {type === "posts" ? (
        <Feed />
      ) : (
        <div className="mx-auto mb-10 flex w-full flex-col gap-3 md:w-[48rem] xl:w-[54rem]">
          {loading &&
            [...Array(3)].map((_, index) => (
              <SubCardPlaceHolder key={index} user={type === "user"} />
            ))}
          {!loading && error && (
            <div className="rounded-lg border border-th-border bg-th-post p-6 text-center">
              <p>{error}</p>
              <button
                className="mt-3 rounded-md border border-th-border bg-th-background2 px-4 py-2 hover:bg-th-highlight"
                onClick={() => fetchResults()}
              >
                Try again
              </button>
            </div>
          )}
          {!loading && !error && results.length === 0 && (
            <div className="rounded-lg border border-th-border bg-th-post p-6 text-center">
              <p>
                No {type === "user" ? "people" : "communities"} found for “
                {query?.q}”.
              </p>
              <p className="mt-1 text-sm opacity-60">
                Safe Search is {safeSearch ? "on" : "off"}.
              </p>
            </div>
          )}
          {!loading &&
            !error &&
            results.map((result) => (
              <SubCard key={result?.data?.name} data={result} />
            ))}
          {!loading && !error && after && (
            <button
              className="ml-auto rounded-md border border-th-border bg-th-background2 px-4 py-2 hover:bg-th-highlight disabled:opacity-50"
              disabled={loadingMore}
              onClick={() => fetchResults(after, true)}
            >
              {loadingMore ? "Loading…" : "Load more"}
            </button>
          )}
        </div>
      )}
      </div>
    </div>
  );
};

export default SearchPage;
