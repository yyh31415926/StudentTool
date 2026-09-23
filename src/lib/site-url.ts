const LOCAL_SITE_URL = "http://localhost:3000";

/**
 * Resolve the public origin used by metadata and crawler-facing resources.
 * Development and tests retain a localhost default; production must be
 * explicitly configured so we never publish localhost links by accident.
 */
export function getSiteUrl(): string {
  const configuredUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();

  if (configuredUrl) {
    const url = new URL(configuredUrl);

    if (
      process.env.NODE_ENV === "production" &&
      (url.hostname === "localhost" || url.hostname === "127.0.0.1")
    ) {
      throw new Error(
        "NEXT_PUBLIC_SITE_URL must be a public URL in production.",
      );
    }

    return url.origin;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "NEXT_PUBLIC_SITE_URL is required in production for SEO URLs.",
    );
  }

  return LOCAL_SITE_URL;
}
