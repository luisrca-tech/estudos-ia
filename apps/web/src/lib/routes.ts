import type { Route } from "next";

/** Typed hrefs for dynamic routes (the app uses Next typed routes). */
export const routes = {
  module: (slug: string) => `/modules/${slug}` as Route,
  note: (id: string) => `/notes/${id}` as Route,
  newNote: (slug: string, options: { type?: string; sessionId?: string } = {}) => {
    const query = new URLSearchParams();
    if (options.type) query.set("type", options.type);
    if (options.sessionId) query.set("sessionId", options.sessionId);
    const suffix = query.size > 0 ? `?${query}` : "";
    return `/modules/${slug}/notes/new${suffix}` as Route;
  },
};
