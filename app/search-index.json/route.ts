import { getSearchIndex } from "@/lib/posts";

/** 静态导出要求：仅 GET、构建期产出静态文件 */
export const dynamic = "force-static";

export function GET() {
  return Response.json(getSearchIndex(), {
    headers: { "Cache-Control": "public, max-age=3600" },
  });
}
