interface Env {
  ZAPIER_WEBHOOK_URL: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ZAPIER_WEBHOOK_URL) {
    return new Response("Webhook not configured", { status: 500 });
  }

  try {
    const body = await request.text();

    const upstream = await fetch(env.ZAPIER_WEBHOOK_URL, {
      method: "POST",
      body,
      headers: { "Content-Type": "application/json" },
    });

    if (!upstream.ok) {
      return new Response("Upstream error", { status: 502 });
    }

    return new Response(null, { status: 204 });
  } catch {
    return new Response("Submission failed", { status: 502 });
  }
};
