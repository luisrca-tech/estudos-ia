import type { MetadataRoute } from "next";

/** Personal app behind a login: nothing to crawl. */
export default function robots(): MetadataRoute.Robots {
  return { rules: { userAgent: "*", disallow: "/" } };
}
