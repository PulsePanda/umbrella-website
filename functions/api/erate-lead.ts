interface Env {
  ERATE_WEBHOOK_URL: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.ERATE_WEBHOOK_URL) {
    return new Response("Webhook not configured", { status: 500 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return new Response("Invalid request", { status: 400 });
  }

  const name = (body.name as string)?.trim();
  const email = (body.email as string)?.trim();
  const schoolName = (body.schoolName as string)?.trim();

  if (!name || !email || !schoolName) {
    return new Response("Missing required fields", { status: 400 });
  }

  const payload = {
    leadName: name,
    leadEmail: email,
    schoolName,
    auditData: body.auditData || {},
    submittedAt: new Date().toISOString(),
  };

  try {
    const upstream = await fetch(env.ERATE_WEBHOOK_URL, {
      method: "POST",
      body: JSON.stringify(payload),
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
