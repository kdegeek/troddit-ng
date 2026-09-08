import Head from "next/head";
import Link from "next/link";
import useLocalBookmarks from "../hooks/useLocalBookmarks";

export default function BookmarksPage() {
  const { bookmarks, remove } = useLocalBookmarks();
  return (
    <>
      <Head><title>troddit · local bookmarks</title></Head>
      <main className="max-w-3xl p-4 mx-auto my-8">
        <h1 className="mb-2 text-2xl font-semibold text-th-textHeading">Local bookmarks</h1>
        <p className="mb-6 text-sm opacity-70">Stored only on this device and separate from Reddit saves.</p>
        {!bookmarks.length ? (
          <div className="p-6 border rounded-lg bg-th-post border-th-border2">
            No local bookmarks yet.
          </div>
        ) : (
          <ul className="space-y-3">
            {bookmarks.map((item) => (
              <li key={item.id} className="flex items-start justify-between gap-4 p-4 border rounded-lg bg-th-post border-th-border2">
                <div>
                  <Link href={item.permalink} className="font-medium text-th-textHeading hover:underline">{item.title}</Link>
                  <div className="mt-1 text-xs opacity-70">r/{item.subreddit} · u/{item.author}</div>
                </div>
                <button className="flex-none hover:underline" onClick={() => remove(item.id)} aria-label={`Remove ${item.title} from local bookmarks`}>Remove</button>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
