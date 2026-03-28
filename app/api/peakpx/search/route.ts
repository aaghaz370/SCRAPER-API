import { NextRequest, NextResponse } from "next/server";
import { fetchPeakPX, parseWallpaperGrid, parsePagination } from "../_utils";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || searchParams.get("query") || "";
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;

    if (!q.trim()) {
      return NextResponse.json(
        { error: "Missing query. Use ?q=nature" },
        { status: 400 }
      );
    }

    const encodedQ = encodeURIComponent(q.trim());
    const url =
      page > 1
        ? `https://www.peakpx.com/en/search?q=${encodedQ}&page=${page}`
        : `https://www.peakpx.com/en/search?q=${encodedQ}`;

    const html = await fetchPeakPX(url);
    const wallpapers = parseWallpaperGrid(html);
    const { totalPages, hasNextPage } = parsePagination(html, page);

    return NextResponse.json({
      success: true,
      query: q,
      page,
      totalPages,
      hasNextPage,
      count: wallpapers.length,
      wallpapers,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[peakpx/search] ERROR:", msg);
    return NextResponse.json(
      { error: "Search failed", message: msg },
      { status: 500 }
    );
  }
}
