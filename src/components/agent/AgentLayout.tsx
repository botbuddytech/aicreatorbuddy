"use client";

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { AgentPanel } from "@/components/agent/AgentPanel";
import { registerProjectBridge } from "@/components/agent/bridge";
import {
  AGENT_PANEL_MAX,
  AGENT_PANEL_MIN,
  clampPanelWidth,
  useAgentStore,
} from "@/components/agent/store";
import { useVideoProject } from "@/components/create/VideoProjectProvider";
import type { ConnectedChannel } from "@/lib/youtube/repo";

function useDesktop() {
  const [desktop, setDesktop] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(min-width: 1024px)");
    const apply = () => setDesktop(query.matches);
    apply();
    query.addEventListener("change", apply);
    return () => query.removeEventListener("change", apply);
  }, []);
  return desktop;
}

export function AgentLayout({
  channels,
  children,
}: {
  channels: ConnectedChannel[];
  children: ReactNode;
}) {
  const { project, dispatch, setActiveStep, activeStep } = useVideoProject();
  const open = useAgentStore((state) => state.panelOpen);
  const width = useAgentStore((state) => state.width);
  const setWidth = useAgentStore((state) => state.setWidth);
  const setPanelOpen = useAgentStore((state) => state.setPanelOpen);
  const togglePanel = useAgentStore((state) => state.togglePanel);
  const loadPrefs = useAgentStore((state) => state.loadPrefs);
  const bindVideo = useAgentStore((state) => state.bindVideo);
  const setChannelName = useAgentStore((state) => state.setChannelName);
  const reduced = useReducedMotion();
  const desktop = useDesktop();
  const [dragging, setDragging] = useState(false);
  const wasOpen = useRef(false);
  const dispatchRef = useRef(dispatch);
  const setStepRef = useRef(setActiveStep);
  const projectRef = useRef(project);
  const stepRef = useRef(activeStep);
  useEffect(() => {
    dispatchRef.current = dispatch;
    setStepRef.current = setActiveStep;
    projectRef.current = project;
    stepRef.current = activeStep;
    registerProjectBridge({
      dispatch: (action) => dispatchRef.current(action),
      setActiveStep: (step) => {
        stepRef.current = step;
        setStepRef.current(step);
      },
      getProject: () => projectRef.current,
      getStep: () => stepRef.current,
    });
  }, [dispatch, setActiveStep, project, activeStep]);

  useEffect(() => {
    loadPrefs();
    bindVideo(project.id);
  }, [loadPrefs, bindVideo, project.id]);

  useEffect(() => {
    const name = channels.find((channel) => channel.id === project.channelId)?.title ?? "";
    setChannelName(name);
  }, [channels, project.channelId, setChannelName]);

  useLayoutEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--agent-panel-width", desktop && open ? `${width}px` : "0px");
    root.style.setProperty("--agent-panel-ms", dragging || reduced ? "0ms" : "220ms");
  }, [desktop, open, width, dragging, reduced]);

  useEffect(() => {
    return () => {
      const root = document.documentElement;
      root.style.setProperty("--agent-panel-width", "0px");
      root.style.setProperty("--agent-panel-ms", "220ms");
    };
  }, []);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "i") {
        event.preventDefault();
        togglePanel();
        return;
      }
      if (event.key !== "Escape" || !useAgentStore.getState().panelOpen) return;
      if (useAgentStore.getState().mentionOpen) return;
      const panel = document.getElementById("agent-panel");
      if (!panel || !(event.target instanceof Node) || !panel.contains(event.target)) return;
      if (panel.querySelector("[aria-expanded='true']")) return;
      event.preventDefault();
      setPanelOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setPanelOpen, togglePanel]);

  useEffect(() => {
    if (open && !wasOpen.current) {
      window.requestAnimationFrame(() => document.getElementById("agent-composer")?.focus());
    }
    if (!open && wasOpen.current) {
      document.getElementById("agent-panel-toggle")?.focus();
    }
    wasOpen.current = open;
  }, [open]);

  useEffect(() => {
    if (!open || desktop) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onTab(event: KeyboardEvent) {
      if (event.key !== "Tab") return;
      const panel = document.getElementById("agent-panel");
      if (!panel) return;
      const focusable = [...panel.querySelectorAll<HTMLElement>("button, textarea, input, [tabindex]:not([tabindex='-1'])")].filter(
        (node) => !node.hasAttribute("disabled"),
      );
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    window.addEventListener("keydown", onTab);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onTab);
    };
  }, [open, desktop]);

  function onResizeDown(event: ReactPointerEvent<HTMLDivElement>) {
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    setDragging(true);
    const startX = event.clientX;
    const startW = useAgentStore.getState().width;
    function move(next: PointerEvent) {
      setWidth(clampPanelWidth(startW - (next.clientX - startX)));
    }
    function up(next: PointerEvent) {
      setDragging(false);
      if (handle.hasPointerCapture(next.pointerId)) handle.releasePointerCapture(next.pointerId);
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", up);
    }
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", up);
  }

  function onResizeKey(event: ReactKeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") setWidth(clampPanelWidth(width + 24));
    if (event.key === "ArrowRight") setWidth(clampPanelWidth(width - 24));
  }

  const motionOff = dragging || Boolean(reduced);
  const panelWidth = desktop && open ? width : 0;

  const resizeHandle = (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-valuemin={AGENT_PANEL_MIN}
      aria-valuemax={AGENT_PANEL_MAX}
      aria-valuenow={width}
      aria-label="Resize agent panel"
      tabIndex={0}
      onPointerDown={onResizeDown}
      onKeyDown={onResizeKey}
      className="absolute top-0 left-0 z-10 h-full w-1.5 cursor-col-resize touch-none hover:bg-accent/50"
    />
  );

  return (
    <div className="flex min-w-0 items-start">
      <div className="min-w-0 flex-1">{children}</div>
      {desktop ? (
        <div
          aria-hidden
          className={`shrink-0 self-stretch ${motionOff ? "" : "transition-[width] duration-[220ms] ease-out"}`}
          style={{ width: panelWidth }}
        />
      ) : null}
      {desktop ? (
        <aside
          id="agent-panel"
          aria-label="Agent"
          aria-hidden={!open}
          inert={!open}
          className={`fixed top-0 right-0 z-30 h-[100dvh] overflow-hidden bg-background ${
            open ? "border-l border-border" : "pointer-events-none border-0"
          } ${motionOff ? "" : "transition-[width] duration-[220ms] ease-out"}`}
          style={{ width: panelWidth }}
        >
          {open ? resizeHandle : null}
          <AgentPanel onClose={() => setPanelOpen(false)} />
        </aside>
      ) : null}
      <AnimatePresence>
        {!desktop && open ? (
          <motion.div key="agent-overlay" className="fixed inset-0 z-40" initial={false}>
            <motion.button
              type="button"
              aria-label="Close agent"
              className="absolute inset-0 bg-black/55"
              initial={reduced ? false : { opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={reduced ? undefined : { opacity: 0 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
              onClick={() => setPanelOpen(false)}
            />
            <motion.aside
              id="agent-panel"
              aria-label="Agent"
              role="dialog"
              aria-modal="true"
              className="absolute inset-y-0 right-0 overflow-hidden border-l border-border bg-background"
              style={{ width: `min(92vw, ${width}px)` }}
              initial={reduced ? false : { x: 28 }}
              animate={{ x: 0 }}
              exit={reduced ? undefined : { x: 28 }}
              transition={{ duration: reduced ? 0 : 0.22, ease: "easeOut" }}
            >
              {resizeHandle}
              <AgentPanel onClose={() => setPanelOpen(false)} />
            </motion.aside>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}
