import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/router";
import { useSession } from "next-auth/react";
import { Dialog } from "@headlessui/react";
import { useTheme } from "next-themes";
import {
  FiArrowUpRight,
  FiBookmark,
  FiCompass,
  FiCpu,
  FiGrid,
  FiHash,
  FiHome,
  FiMenu,
  FiMoon,
  FiPlus,
  FiSearch,
  FiSettings,
  FiSun,
  FiStar,
  FiUser,
  FiX,
} from "react-icons/fi";
import Search from "./Search";
import NavMenu from "./NavMenu";
import LoginProfile from "./LoginProfile";
import { useMainContext } from "../MainContext";
import { useSubsContext } from "../MySubs";
import { constructMultiLink } from "../../lib/navigation";
import { isDarkPalette } from "../../lib/appearance";
import toast from "react-hot-toast";

export default function NavBar({ toggleSideNav = 0 }) {
  const router = useRouter();
  const { data: session } = useSession();
  const context: any = useMainContext();
  const subs: any = useSubsContext();
  const { resolvedTheme, setTheme } = useTheme();
  const [drawer, setDrawer] = useState(false);
  const [search, setSearch] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [shortcut, setShortcut] = useState("Ctrl K");
  const [pins, setPins] = useState<string[]>([]);

  useEffect(() => {
    setMounted(true);
    setShortcut(/Mac|iPhone|iPad/.test(navigator.platform) ? "⌘ K" : "Ctrl K");
    try {
      setCollapsed(localStorage.getItem("troddit:sidebar") === "collapsed");
      const stored = JSON.parse(
        localStorage.getItem("troddit:pinnedCollections") || "[]",
      );
      if (Array.isArray(stored))
        setPins(stored.filter((key) => typeof key === "string"));
    } catch {
      /* Navigation remains usable without storage. */
    }
    const keydown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setSearch((value) => !value);
      }
    };
    window.addEventListener("keydown", keydown);
    return () => window.removeEventListener("keydown", keydown);
  }, []);
  useEffect(() => {
    document.documentElement.dataset.sidebar = collapsed
      ? "collapsed"
      : "expanded";
  }, [collapsed]);
  useEffect(() => {
    setDrawer(false);
    setSearch(false);
  }, [router.asPath]);
  useEffect(() => {
    if (toggleSideNav) setDrawer(true);
  }, [toggleSideNav]);

  const profile = session?.user?.name ? `/u/${session.user.name}` : "/settings";
  const saved = session?.user?.name
    ? `/u/${session.user.name}/saved`
    : "/bookmarks";
  const links = [
    { label: "Home", href: "/", icon: FiHome },
    { label: "Discover", href: "/r/popular", icon: FiCompass },
    { label: session ? "Saved" : "Bookmarks", href: saved, icon: FiBookmark },
    { label: "AI Studio", href: "/studio", icon: FiCpu },
  ];
  const communities = session
    ? (subs.mySubs ?? []).map((sub) => sub.data?.display_name).filter(Boolean)
    : (context.localSubs ?? []);
  const collections = session
    ? (subs.myMultis ?? [])
    : (subs.myLocalMultis ?? []);
  const active = (href: string) =>
    href === "/" ? router.asPath === "/" : router.asPath.split("?")[0] === href;
  const navLink = ({ label, href, icon: Icon }, mobile = false) =>
    href ? (
      <Link
        key={label}
        href={href}
        className={mobile ? "mobile-destination" : "rail-link"}
        aria-current={active(href) ? "page" : undefined}
        title={label}
      >
        <Icon aria-hidden="true" />
        <span>{label}</span>
      </Link>
    ) : (
      <button
        key={label}
        className={mobile ? "mobile-destination" : "rail-link"}
        title={label}
        onClick={() => context.setLoginModal(true)}
      >
        <Icon aria-hidden="true" />
        <span>{label}</span>
      </button>
    );
  const navigation = (
    <>
      <nav aria-label="Main navigation" className="rail-primary">
        {links.map((link) => navLink(link))}
        {session &&
          navLink({
            label: "Local bookmarks",
            href: "/bookmarks",
            icon: FiBookmark,
          })}
      </nav>
      <div className="rail-library">
        <div className="rail-section-heading">
          <span>Your collections</span>
          <Link href="/subreddits" aria-label="Manage collections">
            <FiPlus />
          </Link>
        </div>
        {[...collections]
          .sort(
            (a, b) =>
              Number(pins.includes(constructMultiLink(b))) -
              Number(pins.includes(constructMultiLink(a))),
          )
          .map((multi) => (
            <div className="collection-link" key={constructMultiLink(multi)}>
              <Link
                key={multi.data?.name}
                href={constructMultiLink(multi)}
                className="rail-link"
              >
                <FiGrid />
                <span>{multi.data?.display_name ?? multi.data?.name}</span>
              </Link>
              <button
                aria-label={`${pins.includes(constructMultiLink(multi)) ? "Unpin" : "Pin"} collection ${multi.data?.display_name ?? multi.data?.name}`}
                aria-pressed={pins.includes(constructMultiLink(multi))}
                onClick={() => {
                  const key = constructMultiLink(multi);
                  const next = pins.includes(key)
                    ? pins.filter((pin) => pin !== key)
                    : [...pins, key];
                  setPins(next);
                  try {
                    localStorage.setItem(
                      "troddit:pinnedCollections",
                      JSON.stringify(next),
                    );
                  } catch {
                    toast.error(
                      "Pinned for this visit only. Browser storage is unavailable.",
                    );
                  }
                }}
              >
                <FiStar />
              </button>
            </div>
          ))}
        {!collections.length && (
          <p className="rail-hint">
            Organize your favorite communities into a personal feed.
          </p>
        )}
        <div className="rail-section-heading">
          <span>Communities</span>
          <Link href="/subreddits" aria-label="Browse communities">
            <FiPlus />
          </Link>
        </div>
        {communities.slice(0, 30).map((name: string) => (
          <Link
            key={name}
            href={name.startsWith("u_") ? `/u/${name.slice(2)}` : `/r/${name}`}
            className="rail-link"
            title={name.startsWith("u_") ? `u/${name.slice(2)}` : `r/${name}`}
          >
            <span className="community-avatar">{name.slice(0, 1)}</span>
            <span>{name}</span>
          </Link>
        ))}
        <Link href="/subreddits" className="rail-link rail-muted">
          <FiHash />
          <span>Browse communities</span>
        </Link>
        <Link href="/r/all" className="rail-link rail-muted">
          <FiArrowUpRight />
          <span>All of Reddit</span>
        </Link>
      </div>
      <div className="rail-footer">
        {navLink({ label: "Settings", href: "/settings", icon: FiSettings })}
        <div className="rail-note">
          <span className="connection-dot" />
          Your space. Your pace.
        </div>
      </div>
    </>
  );

  return (
    <>
      <a className="skip-link" href="#app-content">
        Skip to content
      </a>
      <header
        className={`app-header ${context.mediaMode ? "app-header-hidden" : ""}`}
      >
        <div className="app-brand-area">
          <button
            className="icon-button desktop-menu"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => {
              setCollapsed(!collapsed);
              localStorage.setItem(
                "troddit:sidebar",
                !collapsed ? "collapsed" : "expanded",
              );
            }}
          >
            <FiMenu />
          </button>
          <button
            className="icon-button mobile-menu"
            aria-label="Open navigation"
            onClick={() => setDrawer(true)}
          >
            <FiMenu />
          </button>
          <Link href="/" className="app-brand" aria-label="Troddit home">
            <span className="brand-symbol">
              t<span>•</span>
            </span>
            <span>
              troddit<span className="brand-period">.</span>
            </span>
          </Link>
        </div>
        <button className="search-trigger" onClick={() => setSearch(true)}>
          <FiSearch />
          <span>Search communities, posts, people</span>
          <kbd>{shortcut}</kbd>
        </button>
        <div className="header-actions">
          <button
            className="icon-button mobile-search"
            aria-label="Search"
            onClick={() => setSearch(true)}
          >
            <FiSearch />
          </button>
          <button
            className="icon-button"
            aria-label="Toggle light and dark theme"
            onClick={() =>
              setTheme(isDarkPalette(resolvedTheme) ? "light" : "dark")
            }
          >
            {mounted && isDarkPalette(resolvedTheme) ? <FiSun /> : <FiMoon />}
          </button>
          <div className="header-account">
            <LoginProfile />
          </div>
          <div className="legacy-options">
            <NavMenu hide={false} />
          </div>
        </div>
      </header>
      <aside className="app-sidebar" aria-label="Your library">
        {navigation}
      </aside>
      {!context.postOpen && (
        <nav className="mobile-navigation" aria-label="Mobile navigation">
          {links.map((link) => navLink(link, true))}
          {navLink({ label: "You", href: profile, icon: FiUser }, true)}
        </nav>
      )}
      <Dialog open={drawer} onClose={setDrawer} className="shell-dialog">
        <Dialog.Overlay className="shell-overlay" />
        <div className="navigation-drawer">
          <div className="drawer-heading">
            <Dialog.Title>Your space</Dialog.Title>
            <button
              className="icon-button"
              aria-label="Close navigation"
              onClick={() => setDrawer(false)}
            >
              <FiX />
            </button>
          </div>
          {navigation}
        </div>
      </Dialog>
      <Dialog open={search} onClose={setSearch} className="shell-dialog">
        <Dialog.Overlay className="shell-overlay" />
        <div className="search-dialog">
          <div className="drawer-heading">
            <Dialog.Title>Find your next rabbit hole</Dialog.Title>
            <button
              className="icon-button"
              aria-label="Close search"
              onClick={() => setSearch(false)}
            >
              <FiX />
            </button>
          </div>
          <Search id="global-search" setShowSearch={setSearch} />
          <p className="search-hint">
            Search posts, communities, and people. Press Esc to close.
          </p>
        </div>
      </Dialog>
    </>
  );
}
