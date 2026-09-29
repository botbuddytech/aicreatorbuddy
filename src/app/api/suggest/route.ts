import { clientIpFromRequest, createSuggestHandler } from "./suggestHandler";

export const dynamic = "force-dynamic";

const handler = createSuggestHandler();

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q");
  const result = await handler.handle(query, clientIpFromRequest(request));
  return Response.json(result.body, {
    status: result.status,
    headers: { "cache-control": "no-store" },
  });
}
