// Cloudflare Worker — proxies Claude + Synthflow APIs with PostHog LLM tracing
// Deploy: npx wrangler deploy worker.js --name synthflow-proxy
//
// Secrets: ANTHROPIC_API_KEY (set via `wrangler secret put ANTHROPIC_API_KEY`)
// Users pass their own Synthflow key per request.

const POSTHOG_KEY = "phc_dlyyp4oL77penk6jXtJRUUpotT7eiUk3wRSY1KzzpLi";
const POSTHOG_HOST = "https://eu.i.posthog.com";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, x-synthflow-key, x-trace-id",
};

export default {
  async fetch(request, env, ctx) {
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: CORS_HEADERS });
    }

    const url = new URL(request.url);

    const userId = request.headers.get("x-synthflow-key") || "anonymous";

    if (url.pathname === "/api/claude" && request.method === "POST") {
      const traceId = request.headers.get("x-trace-id");
      return handleClaude(request, env, ctx, userId, traceId);
    }

    if (url.pathname === "/api/synthflow" && request.method === "POST") {
      const traceId = request.headers.get("x-trace-id");
      return handleSynthflow(request, ctx, userId, traceId);
    }

    return new Response("Not found", { status: 404 });
  },
};

// ── Claude proxy with LLM tracing ──────────────────────────────────
async function handleClaude(request, env, ctx, userId, traceId) {
  const apiKey = env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return jsonResponse({ error: "ANTHROPIC_API_KEY secret not configured" }, 500);
  }

  const body = await request.text();
  const start = Date.now();

  const upstream = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body,
  });

  const result = await upstream.text();
  const durationMs = Date.now() - start;

  // Send PostHog LLM trace after response (kept alive by waitUntil)
  ctx.waitUntil(traceGeneration(body, result, durationMs, userId, traceId));

  return new Response(result, {
    status: upstream.status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ── Synthflow proxy ─────────────────────────────────────────────────
async function handleSynthflow(request, ctx, userId, traceId) {
  const apiKey = request.headers.get("x-synthflow-key");
  if (!apiKey) {
    return jsonResponse({ error: "Missing x-synthflow-key header" }, 401);
  }

  const { method, path, payload } = await request.json();
  const start = Date.now();

  const upstream = await fetch(`https://api.synthflow.ai/v2${path}`, {
    method: method || "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    ...(payload ? { body: JSON.stringify(payload) } : {}),
  });

  const result = await upstream.text();
  const durationMs = Date.now() - start;

  // Trace tool call to PostHog
  ctx.waitUntil(traceToolCall(method || "POST", path, payload, result, upstream.status, durationMs, userId, traceId));

  return new Response(result, {
    status: upstream.status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}

// ── PostHog LLM trace ───────────────────────────────────────────────
async function traceGeneration(requestBody, responseBody, durationMs, userId, traceId) {
  try {
    const input = JSON.parse(requestBody);
    const output = JSON.parse(responseBody);

    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        distinct_id: userId,
        event: "$ai_generation",
        properties: {
          $ai_provider: "anthropic",
          $ai_model: input.model,
          $ai_input_tokens: output.usage?.input_tokens ?? 0,
          $ai_output_tokens: output.usage?.output_tokens ?? 0,
          $ai_latency: durationMs / 1000,
          $ai_trace_id: traceId || output.id,
          $ai_input: JSON.stringify(input.messages?.slice(-3)),
          $ai_output_choices: JSON.stringify([{ role: "assistant", content: output.content }]),
          $ai_is_error: output.type === "error",
          $ai_http_status: output.type === "error" ? 400 : 200,
          tool_count: (output.content || []).filter((b) => b.type === "tool_use").length,
          stop_reason: output.stop_reason,
          has_system_prompt: !!input.system,
          has_tools: (input.tools || []).length > 0,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error("PostHog trace error:", e.message);
  }
}

// ── PostHog tool call trace ─────────────────────────────────────────
async function traceToolCall(method, path, payload, responseBody, httpStatus, durationMs, userId, traceId) {
  try {
    const toolName = path.replace(/^\//, "").split("/")[0].split("?")[0];

    await fetch(`${POSTHOG_HOST}/capture/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: POSTHOG_KEY,
        distinct_id: userId,
        event: "tool_executed",
        properties: {
          $ai_trace_id: traceId,
          tool_name: toolName,
          tool_method: method,
          tool_path: path,
          tool_input: payload ? JSON.stringify(payload) : null,
          tool_output: responseBody.slice(0, 2000),
          tool_http_status: httpStatus,
          tool_latency: durationMs / 1000,
          tool_is_error: httpStatus >= 400,
        },
        timestamp: new Date().toISOString(),
      }),
    });
  } catch (e) {
    console.error("PostHog tool trace error:", e.message);
  }
}

// ── Helpers ──────────────────────────────────────────────────────────
function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
