import type { MetadataRoute } from "next";
import { getAllCategories } from "@/lib/tools/categories";
import { getAllTools } from "@/lib/tools/registry";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  for (const tool of getAllTools()) {
    entries.push({
      url: `${SITE_URL}/tools/${tool.id}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  for (const category of getAllCategories()) {
    entries.push({
      url: `${SITE_URL}/categories/${category.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  return entries;
}
