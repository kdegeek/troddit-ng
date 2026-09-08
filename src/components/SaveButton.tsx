import { useSession } from "next-auth/react";
import React, { useEffect, useState } from "react";
import { BsBookmarks, BsBookmarksFill } from "react-icons/bs";
import { useKeyPress } from "../hooks/KeyPress";
import useMutate from "../hooks/useMutate";
import useLocalBookmarks from "../hooks/useLocalBookmarks";
import { useMainContext } from "../MainContext";
import type { LocalBookmark } from "../../lib/bookmarks";
const SaveButton = ({
  id,
  saved,
  item,
  localOnly = false,
  useKeys = false,
  post = false,
  isPortrait = false,
  row = false,
  fullmedia = false,
  category = "",
  children = <></>,
  menu = false,
}: {
  id: string;
  saved?: boolean;
  item?: LocalBookmark;
  localOnly?: boolean;
  useKeys?: boolean;
  post?: boolean;
  isPortrait?: boolean;
  row?: boolean;
  fullmedia?: boolean;
  category?: string;
  children?: React.ReactNode;
  menu?: boolean;
}) => {
  const { data: redditSession, status } = useSession();
  const session = localOnly ? null : redditSession;
  const loading = status === "loading";
  const context: any = useMainContext();
  const [isSaved, setIsSaved] = useState(false);
  const localBookmarks = useLocalBookmarks();
  const aPress = useKeyPress("s");

  useEffect(() => {
    if (session) setIsSaved(Boolean(saved));
    else
      setIsSaved(
        localBookmarks.bookmarks.some((bookmark) => bookmark.id === id),
      );
    return () => {
      setIsSaved(false);
    };
  }, [saved, id, session, localBookmarks.bookmarks]);

  const { saveMutation } = useMutate();

  useEffect(() => {
    if (saveMutation.isError) setIsSaved(Boolean(saved));
  }, [saveMutation.isError]);

  const save = async () => {
    if (loading || saveMutation.isLoading) return;
    if (session) {
      setIsSaved((s) => !s);
      saveMutation.mutate({ id: id, isSaved: isSaved });
    } else if (!loading && item) {
      if (isSaved) localBookmarks.remove(id);
      else localBookmarks.add(item);
    }
  };

  useEffect(() => {
    if (!context.replyFocus && useKeys) {
      if (aPress) {
        save();
      }
    }

    return () => {};
  }, [aPress, context.replyFocus]);

  const bookmarkStyle =
    "flex-none   " +
    (row || menu || fullmedia ? " w-4 h-4 " : " w-5 h-5 ") +
    (!isPortrait && !row ? " md:mr-2 " : " ") +
    (menu ? " mr-2 " : "") +
    (isSaved ? " text-th-upvote " : " ");

  return (
    <button
      title={
        !session && !loading && !item
          ? "Local bookmarking is unavailable here because post details are missing"
          : `${session ? "Save to Reddit" : "Bookmark on this device"} ${useKeys ? "(s)" : ""}`
      }
      aria-label={
        session
          ? isSaved
            ? "Unsave from Reddit"
            : "Save to Reddit"
          : isSaved
            ? "Remove local bookmark"
            : "Bookmark on this device"
      }
      aria-pressed={isSaved}
      disabled={loading || saveMutation.isLoading || (!session && !item)}
      className={
        "flex flex-row items-center outline-none  " +
        (menu
          ? " pl-2 pr-4 py-2.5  md:py-1 w-full "
          : row
            ? " px-3 sm:px-2 py-1 h-8 sm:h-[26px] space-x-1 border border-transparent rounded-md hover:border-th-borderHighlight hover:cursor-pointer w-full "
            : post
              ? " cursor-pointer p-2  border rounded-md border-th-border hover:border-th-borderHighlight w-full "
              : fullmedia
                ? " w-10 h-10 flex-none bg-black/40 backdrop-blur-lg rounded-full justify-center text-white"
                : " space-x-1 w-full ") +
        (isSaved ? "" : " hover:text-th-upvote ")
      }
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        save();
      }}
    >
      {(post || row || menu || fullmedia) && (
        <>
          {!!isSaved ? (
            <BsBookmarksFill className={bookmarkStyle} />
          ) : (
            <BsBookmarks className={bookmarkStyle} />
          )}
        </>
      )}

      {!isPortrait && !fullmedia && (
        <span
          className={
            (post ? "hidden " : "") +
            (!isPortrait && !row ? " md:block " : "") +
            (row ? " hidden sm:block " : "")
          }
        >
          {session
            ? isSaved
              ? "Unsave"
              : "Save"
            : isSaved
              ? "Bookmarked"
              : "Bookmark"}
          {menu ? " Post" : ""}
        </span>
      )}
    </button>
  );
};

export default SaveButton;
