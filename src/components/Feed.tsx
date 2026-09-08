import React from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { FiArrowUpRight, FiCompass, FiFeather, FiGrid } from "react-icons/fi";
import { ErrorBoundary } from "react-error-boundary";
import { useMainContext } from "../MainContext";
import { useSubsContext } from "../MySubs";
import useFeed from "../hooks/useFeed";
import useRefresh from "../hooks/useRefresh";
import useLocation from "../hooks/useLocation";
import FeedMasonry from "./FeedMasonry";
import FeedToolbar from "./FeedToolbar";
import useReadingPreferences from "../hooks/useReadingPreferences";
import { constructMultiLink } from "../../lib/navigation";

export default function Feed({ initialData = {} as any }) {
  const { mode, subreddits, userMode, searchQuery } = useLocation();
  const { key, feed } = useFeed({ initialPosts: initialData });
  const { invalidateAll, refreshCurrent } = useRefresh();
  const context: any = useMainContext();
  const subs: any = useSubsContext();
  const { data: session } = useSession();
  const collections = (session ? subs.myMultis : subs.myLocalMultis) ?? [];
  const { view } = useReadingPreferences();
  const title =
    mode === "HOME"
      ? "Your home feed"
      : mode === "SEARCH"
        ? `Results for “${searchQuery ?? ""}”`
        : mode === "USER" || mode === "SELF"
          ? `${subreddits}${userMode ? ` · ${userMode}` : ""}`
          : subreddits?.toLowerCase() === "popular"
            ? "Popular right now"
            : subreddits?.toLowerCase() === "all"
              ? "All of Reddit"
              : `r/${subreddits ?? ""}`;
  const description =
    mode === "HOME"
      ? "A little curiosity goes a long way. Make yourself at home."
      : "Fresh perspectives, good conversations, and something worth your time.";
  const hasPosts = feed.data?.pages?.some((page) => page.filtered?.length);

  return (
    <section className={`feed-page view-${view}`}>
      <FeedToolbar
        title={title}
        description={description}
        refreshing={feed.isFetching}
        onRefresh={refreshCurrent}
      />
      <div className="feed-layout">
        <div
          className={`feed-stream ${context.columnOverride === 1 && !context.wideUI ? "feed-narrow" : ""}`}
        >
          {feed.isError && (
            <div className="feed-state" role="alert">
              <FiCompass />
              <h2>Couldn’t load this feed</h2>
              <p>
                Your place is saved. Try again when your connection is ready.
              </p>
              <button className="primary-button" onClick={() => feed.refetch()}>
                Try again
              </button>
            </div>
          )}
          {!hasPosts && !feed.isError && feed.isFetching && (
            <div
              className="feed-skeletons"
              role="status"
              aria-label="Loading posts"
            >
              {[0, 1, 2].map((item) => (
                <div className="post-skeleton" key={item}>
                  <div />
                  <div />
                  <div />
                  <div />
                </div>
              ))}
            </div>
          )}
          {!hasPosts && feed.isFetched && !feed.isFetching && !feed.isError && (
            <div className="feed-state">
              <FiFeather />
              <h2>A little quiet here</h2>
              <p>Try another sort or adjust your filters to find more posts.</p>
              <Link href="/subreddits" className="primary-button">
                Explore communities
              </Link>
            </div>
          )}
          <ErrorBoundary FallbackComponent={FeedError} onReset={invalidateAll}>
            <FeedMasonry
              initItems={[]}
              feed={feed}
              curKey={key}
              key={`${key}_${context.fastRefresh}_${context.progressKey}`}
            />
          </ErrorBoundary>
        </div>
        <aside className="feed-aside" aria-label="Discover more">
          <div className="discovery-card">
            <span className="discovery-icon">
              <FiCompass />
            </span>
            <p className="eyebrow">GO A LITTLE FURTHER</p>
            <h2>
              Find your kind
              <br />
              of interesting.
            </h2>
            <p>
              Big ideas. Small obsessions. There’s a community for all of it.
            </p>
            <Link href="/subreddits">
              Explore communities <FiArrowUpRight />
            </Link>
          </div>
          <div className="collection-card">
            <div className="aside-heading">
              <h2>Your collections</h2>
              <FiGrid />
            </div>
            {collections.slice(0, 4).map((multi) => (
              <Link href={constructMultiLink(multi)} key={multi.data?.name}>
                <span className="collection-initial">
                  {multi.data?.name?.slice(0, 1)}
                </span>
                <span>
                  <strong>
                    {multi.data?.display_name ?? multi.data?.name}
                  </strong>
                  <small>
                    {multi.data?.subreddits?.length ?? 0} communities
                  </small>
                </span>
                <FiArrowUpRight />
              </Link>
            ))}
            <Link className="manage-collections" href="/subreddits">
              Make it your own <span>→</span>
            </Link>
          </div>
          <div className="reader-note">
            <FiFeather />
            <p>
              Less noise.
              <br />
              <strong>More of what you love.</strong>
            </p>
          </div>
          <div className="aside-links">
            <Link href="/about">About</Link>
            <Link href="/settings">Preferences</Link>
            <Link href="/changelog">What’s new</Link>
          </div>
        </aside>
      </div>
    </section>
  );
}

function FeedError({ resetErrorBoundary }: { resetErrorBoundary: () => void }) {
  return (
    <div className="feed-state" role="alert">
      <h2>This view needs a refresh</h2>
      <p>Your preferences haven’t changed.</p>
      <button className="primary-button" onClick={resetErrorBoundary}>
        Try again
      </button>
    </div>
  );
}
