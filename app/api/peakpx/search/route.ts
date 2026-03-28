import { NextRequest, NextResponse } from "next/server";
import { fetchDDGImages } from "../_utils";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;

    if (!q.trim()) {
      return NextResponse.json({ error: "Missing query. Use ?q=nature" }, { status: 400 });
    }

    const searchQuery = `site:peakpx.com ${q} wallpaper`;
    const wallpapers = await fetchDDGImages(searchQuery, page);

    return NextResponse.json({
      success: true,
      query: q,
      page,
      hasMore: wallpapers.length > 0,
      count: wallpapers.length,
      wallpapers
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[peakpx/search] DDG Bypass ERROR:", msg);
    return NextResponse.json({ error: "Search failed", message: msg }, { status: 500 });
  }
}
