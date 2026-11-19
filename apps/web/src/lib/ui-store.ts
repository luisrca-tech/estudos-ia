"use client";

import { useSyncExternalStore } from "react";

/**
 * Small client state shared by the layout and the pages: whether the ⌘K
 * palette is open and which module page is on screen (for S and N).
 */
export type CurrentModule = { id: string; slug: string; kicker: string; title: string };

type UiState = { paletteOpen: boolean; currentModule: CurrentModule | null };

let state: UiState = { paletteOpen: false, currentModule: null };
const listeners = new Set<() => void>();

function set(next: Partial<UiState>) {
  state = { ...state, ...next };
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverState: UiState = { paletteOpen: false, currentModule: null };

export function useUiState(): UiState {
  return useSyncExternalStore(subscribe, () => state, () => serverState);
}

export const uiActions = {
  setPaletteOpen: (paletteOpen: boolean) => set({ paletteOpen }),
  setCurrentModule: (currentModule: CurrentModule | null) => set({ currentModule }),
  getCurrentModule: () => state.currentModule,
};
