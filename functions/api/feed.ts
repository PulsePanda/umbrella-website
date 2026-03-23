const SUBSTACK_FEED_URL = "https://umbrellasystems.substack.com/feed";

export const onRequestGet: PagesFunction = async () => {
  try {
    const response = await fetch(SUBSTACK_FEED_URL, {
      headers: { "User-Agent": "UmbrellaSystemsWebsite/1.0" },
    });

    if (!response.ok) {
      return new Response("Feed unavailable", { status: 502 });
    }

    const xml = await response.text();

    return new Response(xml, {
      headers: {
        "Content-Type": "application/xml",
        "Cache-Control": "public, max-age=300",
      },
    });
  } catch {
    return new Response("Feed fetch failed", { status: 502 });
  }
};
