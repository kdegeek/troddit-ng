# Troddit

### _This project is archived and no longer maintained._

### _An alternative front end web client for Reddit_

Live at [troddit.com](https://www.troddit.com)



## Screenshots

### Flexible column viewing.

Shown browsing a multi-reddit. Subreddits pane and options menu open.
<img width="1725" alt="columns_options" src="https://user-images.githubusercontent.com/32972409/155919206-e7256397-b2a7-4718-bd17-ff1982b56d1a.png">

### Classic rows view

<img width="1725" alt="classicrows_light" src="https://user-images.githubusercontent.com/32972409/155919273-1f5ba3ef-5f4f-45ec-a12b-ea3e5847e24c.png">

#### with inline media expansion and custom reddit video player

<img width="1725" alt="lightmode_row_open" src="https://user-images.githubusercontent.com/32972409/155919303-ec87bc67-bd2b-4cb5-b2c1-21456bf509df.png">

### Open posts with comments to the side and use arrows for navigation

<img width="1725" alt="post_open" src="https://user-images.githubusercontent.com/32972409/155919310-0d57fdaa-03a0-47c0-be03-1c29da6e87ac.png">

### Search for subreddits, users, and posts.

Shown in single column mode with wide UI disabled. Sort options menu is open.
<img width="1724" alt="search_narrow" src="https://user-images.githubusercontent.com/32972409/155919321-7dd78a3b-5eac-4753-92f9-295d44447e17.png">

### Fully responsive, downloadable as PWA

<img width="377" alt="responsive_troddit" src="https://user-images.githubusercontent.com/32972409/155920807-d6be76a6-c5e6-4f2a-b899-4910d7ca3801.png">

## Features

- Secure logins with Reddit to enable voting, commenting, managing your subreddits and multireddits (aka feeds), and access to your personal front page.
- 'Offline mode' to follow subreddits and manage multis locally without login. Autogenerates a personal front page.
  - Visit your [subreddits multi](https://www.reddit.com/subreddits) and copy the multireddit link. Replace 'reddit' with 'troddit' in the URL and then use the 'Join All' option to quickly follow all subs locally.
- Search Reddit for posts or subreddits quickly with auto-complete.
- Filter posts by type (Images, Video/GIFs, Links, Self)
- View posts in single column, custom multi-column with a grid-masonry layout, or a simple row mode. All with infinite-scrolling.
- Choose your card style: Original for full post text in card, Compact to exclude post text, or Media to hide all text and card padding.
- Gallery view: Click on a post and navigate through the feed with on screen buttons or your arrow keys. Shows the post content as well as its comments from Reddit. Smart portrait mode to automatically arrange vertical photos and videos side by side with comments.
- Hover mouse over Reddit videos to play. Enable to Autoplay option to play videos automatically when entering the viewport. Enable the Audio option to play sound on hover as well.
- Responsive desktop and mobile layouts.
- PWA to download to your computer or phone.
- Docker support

## Developing

Clone the repo and install all packages with npm or yarn. Then to run development server:

```sh
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

To contribute create a branch and submit a PR!

### Amp orbs

`.agents/setup` installs Node 22.23.2 (matching Docker's Node 22 baseline),
Yarn 1.22.19, and all dependencies from `yarn.lock`. Amp snapshots the installed
toolchain and dependencies; exact snapshots skip setup, while refreshed snapshots
reuse Yarn's cache and existing packages. `.agents/resume` does not reinstall anything.

The toolchain is isolated from the orb's system Node and is available in login
shells within this checkout. Setup copies `.env.example` to `.env.local` only when
the latter is absent. No credentials are generated or authentication performed.
Reddit login requires the credentials below; optional Clerk and Supabase features
require their own credentials. Default development needs no local database.

Run `yarn test`, `yarn typecheck`, `yarn lint`, and `yarn build` to check the project. To start a supervised preview,
use `amp orb service start troddit --command 'yarn dev --hostname 0.0.0.0' --portal`
and open the returned portal URL. The runtime is upgraded from the end-of-life
Node 18 baseline; the existing Pages Router and Reddit API contracts are retained.

With `agent-browser` installed and the app running, run
`node tests/browser-smoke.cjs http://localhost:3000` for the isolated UI smoke test.
It covers reading presets, reload persistence, spoiler reveal, post focus/closing,
mobile navigation/search, themes, and settings. Reddit responses are fixtures;
this does not verify real authentication or API mutations.

### Environment Variables

To use login functionality the following environment variables need to be defined in a .env.local file placed in the root directory:

```sh
CLIENT_ID=<ID of your Reddit app>
CLIENT_SECRET=<Secret from your Reddit app>
REDDIT_REDIRECT=<YOUR DOMAIN/api/auth/callback/reddit>
NEXTAUTH_SECRET=<See https://next-auth.js.org/configuration/options#secret>
NEXTAUTH_URL=http://localhost:3000
SIGNING_PRIVATE_KEY=<See https://next-auth.js.org/v3/warnings, Generate with $jose newkey -s 256 -t oct -a HS512>
```

To create a Reddit app visit [https://old.reddit.com/prefs/apps/](https://old.reddit.com/prefs/apps/).
The redirect uri should match the REDDIT_REDIRECT variable.

### Self-hosting and PWA

See [iOS PWA compatibility and Liquid Glass](PWA.md) for the implementation audit,
toolkit comparison, and required iOS 27 device acceptance checklist. Run
`node tests/browser-pwa.cjs http://localhost:3000` for Chromium viewport/update checks;
these do not certify behavior on iOS WebKit or replace real-device testing.

Reader, Compact, and Gallery share the same persisted display preferences.
Settings groups advanced controls by task and provides versioned JSON export/import
for preferences and local collections (not credentials, drafts, or Reddit account data).
Appearance offers 13 palettes plus the device theme, independent accent colors,
14–20px reading text, adjustable line spacing, sans/serif type, and card density.
Theme and reading tuning are included in preference backups; older backups still work.

Anonymous post bookmarks live at `/bookmarks`, separate from Reddit saves. Signed-in
readers can also choose a local bookmark from a post's options menu. Only post metadata
is stored, not offline post content. Bookmarks, recent searches, and collection pins
are device-local and are not included in preference backups. Recent searches can be
cleared in search; collection stars pin frequently used feeds in the sidebar.

For the theme, bookmark, filter, search, and long-session UI checks, run
`node tests/browser-polish.cjs http://localhost:3000` against a running build.
Analytics are off by default. To opt in, set `NEXT_PUBLIC_ENABLE_ANALYTICS=true`
and `NEXT_PUBLIC_ANALYTICS_DOMAIN` at build time.

Set `NEXTAUTH_URL` and `REDDIT_REDIRECT` to the public HTTPS origin used by your
deployment. Service workers and installation require HTTPS (localhost is the browser's
development exception). Keep authentication and `/api` routes on the same origin;
Troddit deliberately never caches API, auth, or user-specific Next.js data responses.

Production builds generate the service worker during `yarn build`. The app shell's
static assets are available offline and an offline page is shown when navigation has
no network connection; Reddit content and actions still require the network. Comment
and edit drafts are stored locally, scoped by signed-in username, mode, post, and
parent, and removed only after successful submission. The PWA status control can
install the app, activate waiting updates, and clear only app asset caches. On iOS,
install from Safari using **Share → Add to Home Screen**.

Do not deploy generated `public/sw.js` from an old build: rebuild it alongside every
release. Reverse proxies should avoid long-lived caching for `/sw.js` so update checks
can discover new versions.

## Docker

### To Deploy the [Docker Image](https://hub.docker.com/r/bsyed/troddit)

```sh
docker pull bsyed/troddit
docker run -d --name troddit -p 3000:3000 bsyed/troddit
```

### To Build the Image Yourself

By default, the Docker will expose port 3000, so change this within the
Dockerfile if necessary. When ready, simply use the Dockerfile to
build the image.

Clone and navigate to the repository 

```sh
git clone https://github.com/burhan-syed/troddit
cd troddit
```

To build the image and run container

Create `.env.local` from `.env.example` and supply your deployment values first.
Compose loads that file at runtime; environment files are excluded from the image.

```sh
docker-compose up
```

Or to just build

```sh
docker build . -t troddit
```

This will create the troddit image and pull in the necessary dependencies. To run:

```sh
docker run --env-file .env.local -p 3000:3000 troddit
```

### AI Studio (optional)

Digests, community suggestions, and interesting stories have a dedicated mobile
tab and desktop section. Uses your Codex/ChatGPT OAuth subscription only, with
source previews, owner access, and no API-key fallback. See [AI.md](AI.md) for
setup, Docker credential persistence, privacy boundaries, and limitations.

### Support

If you like the project feel free to share and leave a star. If you're feeling generous you can support me on Ko-fi.

<span align="center">[![ko-fi](https://ko-fi.com/img/githubbutton_sm.svg)](https://ko-fi.com/K3K47IYH1)</span>
