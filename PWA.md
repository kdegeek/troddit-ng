# iOS PWA compatibility and Liquid Glass

## Target and verification boundary

Target: iPhone/iPad Home Screen web apps and Safari, including iOS/iPadOS 27.
Apple's available [Safari 27 release notes](https://developer.apple.com/documentation/safari-release-notes/safari-27-release-notes)
are beta documentation. This is compatibility hardening, not a claim of device certification.
Linux Chromium viewport tests do not reproduce WebKit, the iOS keyboard, installation,
storage eviction, Low Power Mode, or native share sheets. Record the actual OS build
when running the device checklist below. No OS-version sniffing is used.

## Implemented / retained

- Stable manifest ID, root scope, standalone launch, orientation flexibility, and
  bookmark/settings shortcuts where supported. iOS may ignore manifest shortcuts.
- One opaque 180px Apple touch icon derived from the existing icon. No device-specific
  startup-image matrix: launch behavior should be verified on devices rather than
  shipping a brittle set of resolution-specific splash images.
- Safe-area top/left/right/bottom layout, 44px primary mobile targets, 16px form text
  to avoid focus zoom, and preserved pinch zoom. Dynamic viewport sizing for gallery.
- VisualViewport-aware search/drawer bounds; bottom navigation hides when an editable
  field has focus and a substantial, unzoomed viewport reduction suggests a keyboard.
  Hardware keyboards and pinch zoom must not trigger the keyboard layout.
- Reduced motion, higher contrast, and reduced-transparency fallbacks.
- Explicit update checks, user-approved activation, no-store service-worker response,
  and updateViaCache=none. Reverse proxies must preserve these headers.
- Storage persistence request with honest denied/unsupported states. Persistence is
  not a backup; user clearing website data still removes local records.
- Native sharing uses the self-hosted origin. Cancellation does nothing; clipboard
  success is announced only after the write succeeds, with a visible failure fallback.
- Existing inline-video, muted-autoplay handling and native-HLS fallback retained.
- API/auth/Next-data responses are not cached. Offline launch shows an explanatory
  fallback, not an offline Reddit reader. Cached static assets alone cannot restore
  a server-rendered route or make bookmarks/drafts accessible on a cold offline launch.
- No push or background-sync implementation: these require separate product decisions,
  permissions and server infrastructure. The app does not rely on background execution.

## Device acceptance checklist (not yet executed in the orb)

Test a notched iPhone, a small iPhone viewport, and iPad split view; light/dark themes,
portrait/landscape; Safari and Home Screen standalone. Use HTTPS on the actual host.

1. Install using Safari Share / More → Add to Home Screen; keep Open as Web App enabled
   if offered. Verify icon, standalone launch, title and status bar; launch a deep link.
2. Log in via Reddit and return to the same origin/app. Confirm account switching and
   logout. Safari and installed app storage/session behavior must not be assumed identical.
3. Open search and a comment draft, type with software keyboard, rotate, dismiss it,
   use a hardware keyboard, and pinch zoom. No covered input/actions or horizontal bleed.
4. Scroll long feeds, open/close posts, use back, collapse replies, and switch views.
   Confirm modal scroll lock is released and reading position returns correctly.
5. Play Reddit HLS, MP4 and embedded video. Test muted autoplay, tap to unmute,
   fullscreen, Low Power Mode, background/resume, and an interrupted connection.
6. Cancel the native share sheet, complete a share, and deny clipboard access. No
   misleading success toast; the shared URL belongs to this deployment.
7. Relaunch offline after an online visit; verify fallback and retry after reconnect.
   Inspect Cache Storage: no /api, /_next/data, OAuth or Reddit response bodies.
8. Leave an app version open, serve a new build, choose Check for updates. Do not
   reload until explicitly accepted; check a saved draft and preferences after updating.
9. Request storage persistence; test denial/private browsing. Export/import preferences.
   Bookmarks and drafts are NOT included in preference exports. Verify those warnings.
10. VoiceOver labels/focus, keyboard navigation, larger text/zoom, Reduce Motion,
    Reduce Transparency, contrast settings, and touch targets. Browser support for
    OS accessibility media queries varies; do not assume every setting is exposed.

## Liquid Glass feasibility

Apple's [Liquid Glass APIs](https://developer.apple.com/documentation/technologyoverviews/adopting-liquid-glass)
are SwiftUI/UIKit/AppKit APIs, not web components. A PWA can approximate the material,
not inherit system optics, native morphing, layered Icon Composer assets or every OS setting.

| Approach | Difficulty / tradeoff |
| --- | --- |
| CSS glass navigation, tab bar and sheets | Moderate, localized styling pass; use blur/saturate, translucent theme tint, a subtle rim, and solid fallbacks. Keep reading cards opaque. No library necessary. |
| SVG/WebGL refractive effects | Higher effort; compositor cost, scrolling video, SSR and Safari differences require device profiling. Not recommended for the whole navigation layer. |
| Actual native Liquid Glass | Substantially larger native SwiftUI/UIKit shell project. A WebView wrapper alone does not turn web controls into native controls. |

### Toolkit assessment

- [rdev/liquid-glass-react](https://github.com/rdev/liquid-glass-react): React >=18;
  README explicitly says Safari lacks displacement. Component render accesses navigator
  without an SSR guard, requiring a client-only boundary in Next.js. Canvas/SVG maps,
  pointer-driven React updates and layered effects offer little benefit for an iOS nav.
- [@samasante/liquid-glass](https://github.com/samasante/liquid-glass): React >=18,
  zero runtime dependencies and SSR-safe mount-time browser checks. Better candidate
  for a small experimental lens. Its [browser matrix](https://github.com/samasante/liquid-glass/blob/main/BROWSERS.md)
  distinguishes real wrapped/copied-content refraction from ordinary overlays: Safari
  overlays get frost, not arbitrary live-page bending. Copying a virtualized feed behind
  navigation would introduce synchronization, performance and accessibility costs.
- Both require app-owned semantic controls and accessibility verification. Neither is
  Apple's native material. No glass toolkit was installed in this compatibility pass.

Recommendation: CSS-only progressive enhancement on navigation/sheets first, profiled
on an actual iPhone. Preserve the current palette system and include an explicit solid
surface option, not only a media-query fallback. Avoid animated displacement over media.
