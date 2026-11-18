import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { CollapsedPill } from "./components/CollapsedPill";
import { ExpandedCard } from "./components/ExpandedCard";
import { EMPTY_SNAPSHOT, type TimeframeKey, type UsageSnapshot } from "./types/usage";

const COLLAPSED_SIZE = { width: 196, height: 56, borderRadius: 28 };
const EXPANDED_SIZE = { width: 372, height: 494, borderRadius: 34 };

const APPLE_SPRING = {
  type: "spring" as const,
  stiffness: 400,
  damping: 34,
  mass: 0.75,
};

function isTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}

export function App() {
  const [snapshot, setSnapshot] = useState<UsageSnapshot>(EMPTY_SNAPSHOT);
  const [expanded, setExpanded] = useState(false);
  const [timeframe, setTimeframe] = useState<TimeframeKey>("today");
  const surfaceRef = useRef<HTMLDivElement | null>(null);

  const syncInteractiveRect = useCallback(() => {
    if (!isTauriRuntime() || !surfaceRef.current) return;
    const rect = surfaceRef.current.getBoundingClientRect();
    invoke("set_interactive_rect", {
      x: rect.left,
      y: rect.top,
      width: rect.width,
      height: rect.height,
    }).catch(() => {});
  }, []);

  // Load initial snapshot & subscribe to live updates from Rust backend
  useEffect(() => {
    if (!isTauriRuntime()) return;

    let unlisten: (() => void) | undefined;

    invoke<UsageSnapshot>("get_usage_snapshot")
      .then((snap) => setSnapshot(snap))
      .catch(() => {});

    listen<UsageSnapshot>("usage-updated", (event) => {
      setSnapshot(event.payload);
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch(() => {});

    return () => {
      unlisten?.();
    };
  }, []);

  // Keep click-through hit-box tightly synced with the morphing glass rectangle
  useLayoutEffect(() => {
    syncInteractiveRect();
    const el = surfaceRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      syncInteractiveRect();
    });
    observer.observe(el);

    const t1 = window.setTimeout(syncInteractiveRect, 120);
    const t2 = window.setTimeout(syncInteractiveRect, 360);

    return () => {
      observer.disconnect();
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [expanded, syncInteractiveRect]);

  // Press Escape to collapse cleanly
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && expanded) {
        setExpanded(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [expanded]);

  const handleRefresh = useCallback(() => {
    if (!isTauriRuntime()) return;
    setSnapshot((prev) => ({ ...prev, syncing: true }));
    invoke<UsageSnapshot>("refresh_usage", { full: true })
      .then((snap) => setSnapshot(snap))
      .catch(() => {});
  }, []);

  const handleToggleTheme = useCallback(() => {
    const nextTheme: "light" | "dark" = snapshot.theme === "dark" ? "light" : "dark";
    setSnapshot((prev) => ({ ...prev, theme: nextTheme }));
    if (isTauriRuntime()) {
      invoke<UsageSnapshot>("set_theme", { theme: nextTheme })
        .then((snap) => setSnapshot(snap))
        .catch(() => {});
    }
  }, [snapshot.theme]);

  const handleQuit = useCallback(() => {
    if (isTauriRuntime()) {
      invoke("quit_app").catch(() => {});
    }
  }, []);

  const target = expanded ? EXPANDED_SIZE : COLLAPSED_SIZE;

  return (
    <div
      data-glass={snapshot.theme}
      className="flex h-full w-full items-end justify-end p-[20px]"
    >
      <motion.div
        ref={surfaceRef}
        initial={false}
        animate={{
          width: target.width,
          height: target.height,
          borderRadius: target.borderRadius,
        }}
        transition={APPLE_SPRING}
        onUpdate={() => syncInteractiveRect()}
        className="ios-glass origin-bottom-right"
      >
        <AnimatePresence mode="wait" initial={false}>
          {expanded ? (
            <ExpandedCard
              key="expanded"
              snapshot={snapshot}
              timeframe={timeframe}
              onTimeframeChange={setTimeframe}
              onCollapse={() => setExpanded(false)}
              onRefresh={handleRefresh}
              onToggleTheme={handleToggleTheme}
              onQuit={handleQuit}
            />
          ) : (
            <CollapsedPill
              key="collapsed"
              todayTokens={snapshot.today.totalTokens}
              todayCostUsd={snapshot.today.estimatedCostUsd}
              syncing={snapshot.syncing}
              hasSynced={snapshot.lastUpdated !== null}
              onExpand={() => setExpanded(true)}
            />
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

export default App;
