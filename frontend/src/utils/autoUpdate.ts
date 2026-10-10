// A deploy should reach people who never press F5.
//
// Every build stamps itself: vite writes __BUILD_ID__ into the bundle and
// emits version.json carrying the same id. An open tab compares the two, and
// the moment they differ it knows a newer build is live and reloads itself.
//
// Three rules keep this from being a nuisance rather than a help:
//
// * it never runs while the tab is hidden — nobody wants to come back to a
//   page that reloaded while they were away mid-flow;
// * it never yanks the page out from under someone mid-sentence — if a field
//   has the caret, the reload waits for the next check to find them idle;
// * it gives up rather than spin. If the server keeps announcing a build it
//   does not actually serve — a stale index.html, a half-copied deploy — the
//   tab would reload itself every tick, forever, and never get anywhere. A
//   few reloads towards the same target with no arrival means something is
//   wrong on the serving side, and that is not a browser problem to solve.
//
// The fetch is a cache-busted no-store read, so a proxy that answers from
// memory cannot keep a tab believing it is current.

// Short enough that a deploy is visible while the owner is still looking,
// long enough to be one request every few seconds rather than a poll.
const CHECK_MS = 20_000;

// Three reloads towards one build id with the tab still running another one
// is a loop, not a delay.
const MAX_RELOADS_AT_SAME_TARGET = 3;

const STORE_KEY = "renthub:auto-update:attempts";

let started = false;

function hasCaret(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  return (
    el.tagName === "INPUT" ||
    el.tagName === "TEXTAREA" ||
    el.tagName === "SELECT" ||
    el.isContentEditable
  );
}

// sessionStorage, not memory: the count has to survive the very reload it is
// counting, which is the whole point.
function loadAttempts(): { target: string; count: number } | null {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return typeof parsed?.target === "string" && typeof parsed?.count === "number"
      ? parsed
      : null;
  } catch {
    // Private mode, or unreadable data — behave as if there were no history.
    return null;
  }
}

function saveAttempts(target: string, count: number): void {
  try {
    sessionStorage.setItem(STORE_KEY, JSON.stringify({ target, count }));
  } catch {
    // Private mode: the reload still happens, we just cannot remember it.
  }
}

export function startAutoUpdate(): void {
  if (started) return;
  // A dev server rewrites the bundle in place; only a real build carries an
  // id worth comparing, so development never reloads itself.
  if (typeof __BUILD_ID__ !== "string" || !__BUILD_ID__) return;
  started = true;

  // Landing on this build clears the counter: the reload we made worked, and
  // whatever trouble there was has passed.
  if (loadAttempts()?.target === __BUILD_ID__) {
    try {
      sessionStorage.removeItem(STORE_KEY);
    } catch {
      // Nothing to recover from — a stale counter only ever delays a reload.
    }
  }

  let busy = false;
  // The build id we intend to move to, or null when everything is current.
  let newerBuild: string | null = null;
  let gaveUp = false;

  const reloadIfIdle = () => {
    if (!newerBuild || hasCaret()) return;
    const previous = loadAttempts();
    const count =
      previous && previous.target === newerBuild ? previous.count + 1 : 1;
    saveAttempts(newerBuild, count);
    window.location.reload();
  };

  const check = async () => {
    if (busy || document.visibilityState !== "visible") return;
    busy = true;
    try {
      const res = await fetch(`/version.json?t=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data?.buildId || data.buildId === __BUILD_ID__) return;

      const attempts = loadAttempts();
      if (
        attempts &&
        attempts.target === data.buildId &&
        attempts.count >= MAX_RELOADS_AT_SAME_TARGET
      ) {
        if (!gaveUp) {
          gaveUp = true;
          console.warn(
            `[auto-update] the server announces build ${data.buildId} but this tab keeps loading another one after ${attempts.count} reloads. Stopping until the page is served consistently again.`
          );
        }
        return;
      }

      newerBuild = data.buildId;
      reloadIfIdle();
    } catch {
      // Offline or a transient blip — the next tick simply tries again.
    } finally {
      busy = false;
    }
  };

  const tick = () => {
    reloadIfIdle();
    void check();
  };

  window.setInterval(tick, CHECK_MS);
  document.addEventListener("visibilitychange", tick);
  window.addEventListener("focus", tick);
}
