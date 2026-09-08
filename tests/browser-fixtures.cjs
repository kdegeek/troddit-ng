// Synthetic Reddit responses for browser verification only; never served by the app.
const posts = [
  [
    "A quiet morning in the mountains",
    "Outdoors",
    "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1000&q=80",
    "",
  ],
  [
    "What small change made your home feel more like you?",
    "Design",
    null,
    "Lately I’ve been paying attention to the things I use every day. A reading lamp, a plant by the window, a place to put down a book. What’s one small improvement you keep appreciating?",
  ],
  [
    "Built a little reading corner for the weekend",
    "CozyPlaces",
    "https://images.unsplash.com/photo-1449247709967-d4461a6a6103?w=1000&q=80",
    "",
  ],
  [
    "The tools that make self-hosting feel simple",
    "selfhosted",
    null,
    "A place to share the practical details: backups, updates, and the services you actually enjoy maintaining. What belongs on a small, dependable home server?",
  ],
  [
    "A spoiler-marked discussion",
    "books",
    null,
    "This text should stay hidden until you choose to reveal it.",
  ],
];
const children = posts.map(([title, subreddit, image, body], index) => ({
  kind: "t3",
  data: {
    id: `demo${index}`,
    name: `t3_demo${index}`,
    title,
    subreddit,
    author: "fixture_reader",
    subreddit_name_prefixed: `r/${subreddit}`,
    created_utc: 1788790000,
    score: 124 + index * 157,
    num_comments: 32 + index * 11,
    likes: null,
    saved: false,
    archived: false,
    over_18: false,
    spoiler: index === 4,
    stickied: false,
    hidden: false,
    all_awardings: [],
    link_flair_richtext: [],
    is_self: !image,
    is_video: false,
    selftext: body,
    selftext_html: body ? `<div class="md"><p>${body}</p></div>` : null,
    permalink: `/r/${subreddit}/comments/demo${index}/fixture_post/`,
    url:
      image ??
      `https://www.reddit.com/r/${subreddit}/comments/demo${index}/fixture_post/`,
    domain: image ? "images.unsplash.com" : `self.${subreddit}`,
    thumbnail: image ?? "self",
    ...(image
      ? {
          domain: "i.redd.it",
          post_hint: "image",
          preview: {
            enabled: true,
            images: [
              {
                source: { url: image, width: 1000, height: 667 },
                resolutions: [{ url: image, width: 640, height: 427 }],
              },
            ],
          },
        }
      : {}),
  },
}));
module.exports = {
  listing: {
    kind: "Listing",
    data: { children, after: null, before: null, dist: children.length },
  },
  thread: [
    { kind: "Listing", data: { children: [children[1]] } },
    { kind: "Listing", data: { children: [] } },
  ],
};
