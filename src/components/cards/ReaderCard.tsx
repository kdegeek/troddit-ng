import React, { useState } from "react";
import Link from "next/link";
import {
  FiExternalLink,
  FiMaximize2,
  FiMessageCircle,
  FiMinimize2,
} from "react-icons/fi";
import { useMainContext } from "../../MainContext";
import { numToString, secondsToTime } from "../../../lib/utils";
import MediaWrapper from "../MediaWrapper";
import PostBody from "../PostBody";
import Vote from "../Vote";
import SaveButton from "../SaveButton";
import PostOptButton from "../PostOptButton";
import TitleFlair from "../TitleFlair";
import Awardings from "../Awardings";

export default function ReaderCard({
  post,
  compact,
  columns,
  hideNSFW,
  forceMute,
  read,
  handleClick,
  mediaDimensions,
  checkCardHeight,
  origCommentCount,
}: {
  post: any;
  compact: boolean;
  columns: number;
  hideNSFW: boolean;
  forceMute: number;
  read: unknown;
  handleClick: (
    event: React.MouseEvent,
    nav?: { toComments?: boolean; toMedia?: boolean },
  ) => void;
  mediaDimensions: [number, number];
  checkCardHeight: (height?: number) => void;
  origCommentCount?: number;
}) {
  const context: any = useMainContext();
  const [expanded, setExpanded] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const hasMedia = post.mediaInfo?.hasMedia;
  const body =
    post.crosspost_parent_list?.[0]?.selftext_html ?? post.selftext_html;
  const thumbnail =
    typeof post.thumbnail === "string" && /^https?:\/\//.test(post.thumbnail)
      ? post.thumbnail
      : null;
  const open = (
    event: React.MouseEvent,
    nav?: { toComments?: boolean; toMedia?: boolean },
  ) => {
    // Preserve browser-native open-in-new-tab behavior for real links.
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.button !== 0)
      return;
    event.preventDefault();
    handleClick(event, nav);
  };
  return (
    <article
      className={`post-card ${compact ? "post-card-compact" : ""} ${read && context.dimRead ? "post-card-read" : ""}`}
    >
      <div className="post-card-content">
        <div className="post-meta">
          <span className="community-avatar" aria-hidden="true">
            {post.subreddit?.slice(0, 1)}
          </span>
          <Link className="post-community" href={`/r/${post.subreddit}`}>
            r/{post.subreddit}
          </Link>
          <span>·</span>
          <Link href={`/u/${post.author}`}>u/{post.author}</Link>
          <span>·</span>
          <time
            dateTime={new Date(post.created_utc * 1000).toISOString()}
            title={new Date(post.created_utc * 1000).toLocaleString()}
          >
            {secondsToTime(post.created_utc, [
              "s ago",
              "m ago",
              "h ago",
              "d ago",
              "mo ago",
              "y ago",
            ])}
          </time>
          {post.over_18 && <span className="post-badge">NSFW</span>}
          {post.spoiler && <span className="post-badge">Spoiler</span>}
          {post.stickied && <span className="post-badge">Pinned</span>}
        </div>
        {compact && thumbnail && (
          <a
            className="post-card-thumbnail"
            href={post.permalink}
            onClick={(event) => open(event, { toMedia: true })}
          >
            <img
              src={thumbnail}
              alt={hideNSFW ? "Hidden media preview" : ""}
              className={hideNSFW ? "blur-md" : ""}
              loading="lazy"
            />
          </a>
        )}
        <h2 className="post-card-title">
          <a href={post.permalink} onClick={open}>
            {post.title}
          </a>
        </h2>
        {context.showFlairs &&
          (post.link_flair_text || post.link_flair_richtext?.length > 0) && (
            <div className="mb-3 text-xs">
              <TitleFlair post={post} />
            </div>
          )}
        {(!compact || expanded) &&
          body &&
          (hideNSFW && !revealed ? (
            <button
              className="settings-action"
              onClick={() => setRevealed(true)}
            >
              Reveal hidden post content
            </button>
          ) : (
            <div className="post-card-body">
              <PostBody
                mode="expando"
                rawHTML={body}
                limitHeight={compact ? 200 : 150}
                newTabLinks
                checkCardHeight={checkCardHeight}
              />
            </div>
          ))}
        {context.showAwardings && post.all_awardings?.length > 0 && (
          <Awardings all_awardings={post.all_awardings} />
        )}
      </div>
      {hasMedia && (!compact || expanded) && (
        <div className="post-card-media">
          <MediaWrapper
            post={post}
            columns={columns}
            hideNSFW={hideNSFW}
            forceMute={forceMute}
            postMode={false}
            imgFull={false}
            handleClick={handleClick}
            mediaDimensions={mediaDimensions}
            checkCardHeight={checkCardHeight}
            cardStyle={compact ? "row1" : "card1"}
            mediaOnly={false}
          />
        </div>
      )}
      <footer className="post-card-footer">
        <div className="post-vote">
          <Vote
            name={post.name}
            score={post.score}
            likes={post.likes}
            size={4}
            archived={post.archived}
            postTime={post.created_utc}
          />
        </div>
        <a
          className="post-comments"
          href={post.permalink}
          onClick={(event) => open(event, { toComments: true })}
        >
          <FiMessageCircle />
          <span>
            {numToString(post.num_comments, 1000)} comments
            {origCommentCount !== undefined &&
            post.num_comments > origCommentCount
              ? ` · ${post.num_comments - origCommentCount} new`
              : ""}
          </span>
        </a>
        <SaveButton
          id={post.name}
          saved={post.saved}
          item={{
            id: post.name,
            title: post.title,
            permalink: post.permalink,
            subreddit: post.subreddit,
            author: post.author,
          }}
          row
        />
        {compact && (hasMedia || body) && (
          <button
            className="icon-button"
            aria-label={
              expanded ? "Collapse post content" : "Expand post content"
            }
            aria-expanded={expanded}
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? <FiMinimize2 /> : <FiMaximize2 />}
          </button>
        )}
        {post.mediaInfo?.isLink && (
          <a
            className="icon-button"
            href={post.url}
            target="_blank"
            rel="noreferrer"
            aria-label="Open original source"
          >
            <FiExternalLink />
          </a>
        )}
        <div className="post-more">
          <PostOptButton post={post} mode="row" />
        </div>
      </footer>
    </article>
  );
}
