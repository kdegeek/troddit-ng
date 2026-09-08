export async function sharePost(
  title: string,
  permalink: string,
  origin: string,
  platform: Pick<Navigator, "share" | "clipboard">,
) {
  const data = { title, url: new URL(permalink, origin).href };
  if (typeof platform.share === "function") {
    try {
      await platform.share(data);
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
      // A rejected share must not claim the clipboard succeeded.
    }
  }
  await platform.clipboard.writeText(data.url);
  return "copied";
}
