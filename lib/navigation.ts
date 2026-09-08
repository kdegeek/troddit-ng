export function constructMultiLink(multi: {
  data?: { subreddits?: { name: string }[]; name?: string };
}) {
  const subs = multi.data?.subreddits?.map((sub) => sub.name).join("+") ?? "";
  return `/r/${subs}?m=${encodeURIComponent(multi.data?.name ?? "")}`;
}
