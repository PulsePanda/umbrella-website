export interface SubstackPost {
  title: string;
  link: string;
  pubDate: string;
  description: string;
  category: string;
}

/**
 * Extract text content from an XML tag. Returns the first match or the fallback.
 */
function getTagContent(xml: string, tag: string, fallback = ""): string {
  const pattern = new RegExp(
    `<${tag}[^>]*>(?:<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>|([\\s\\S]*?))</${tag}>`,
    "i"
  );
  const match = xml.match(pattern);
  if (!match) return fallback;
  return (match[1] ?? match[2] ?? fallback).trim();
}

/**
 * Strip HTML tags and decode common HTML entities, then truncate.
 */
function stripHtml(html: string, maxLength = 150): string {
  const text = html
    .replace(/<[^>]*>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength);
  const lastSpace = truncated.lastIndexOf(" ");
  return (lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated) + "...";
}

/**
 * Format an RSS date string into a readable format (e.g., "Mar 21, 2026").
 */
export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

/**
 * Parse RSS XML string into SubstackPost array.
 */
export function parseSubstackFeed(xml: string, limit?: number): SubstackPost[] {
  const items = xml.split(/<item>/i).slice(1);

  const posts: SubstackPost[] = items.map((itemXml) => {
    const title = getTagContent(itemXml, "title", "Untitled");
    const link = getTagContent(itemXml, "link");
    const pubDate = getTagContent(itemXml, "pubDate");
    const contentEncoded = getTagContent(itemXml, "content:encoded");
    const rawDescription = getTagContent(itemXml, "description");
    const description = stripHtml(contentEncoded || rawDescription, 150);
    const category = getTagContent(itemXml, "category", "Blog");

    return { title, link, pubDate, description, category };
  });

  if (limit && limit > 0) {
    return posts.slice(0, limit);
  }

  return posts;
}

/**
 * Fetch Substack posts via the /api/feed proxy. Works client-side.
 */
export async function fetchSubstackPosts(limit?: number): Promise<SubstackPost[]> {
  try {
    const response = await fetch("/api/feed");
    if (!response.ok) return [];
    const xml = await response.text();
    return parseSubstackFeed(xml, limit);
  } catch {
    return [];
  }
}
