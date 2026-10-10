// A deploy should reach people who never press F5.
//
// Every build stamps itself: vite writes __BUILD_ID__ into the bundle and
// emits version.json carrying the same id. An open tab compares the two, and
// the moment they differ it knows a newer build is live and reloads itself.
//
// Two rules keep this from being a nuisance rather than a help:
//
// * it never runs while the tab is hidden — nobody wants to come back to a
//   page that reloaded while they were away mid-flow;
// * it never yanks the page out from under someone mid-sentence — if a field
//   has the caret, the reload waits for the next check to find them idle.
//
// The fetch is a cache-busted no-store read, so a proxy that answers from
// memory cannot keep a tab believing it is current.

const CHECK_MS = 60_000;

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

export function startAutoUpdate(): void {
  if (started) return;
  // A dev server rewrites the bundle in place; only a real build carries an
  // id worth comparing, so development never reloads itself.
  if (typeof __BUILD_ID__ !== "string" || !__BUILD_ID__) return;
  started = true;

  let busy = false;
  let sawNewer = false;

  const reloadIfIdle = () => {
    if (sawNewer && !hasCaret()) window.location.reload();
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
      if (data?.buildId && data.buildId !== __BUILD_ID__) {
        sawNewer = true;
        reloadIfIdle();
      }
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
