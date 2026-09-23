import type { MetadataRoute } from "next";
import { getAllCategories } from "@/lib/tools/categories";
import { getSiteUrl } from "@/lib/site-url";
import { getAllTools } from "@/lib/tools/registry";

export default function sitemap(): MetadataRoute.Sitemap {
  const siteUrl = getSiteUrl();
  const now = new Date();

  const entries: MetadataRoute.Sitemap = [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  for (const tool of getAllTools()) {
    entries.push({
      url: `${siteUrl}/tools/${tool.id}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  for (const category of getAllCategories()) {
    entries.push({
      url: `${siteUrl}/categories/${category.slug}`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    });
  }

  return entries;
}
