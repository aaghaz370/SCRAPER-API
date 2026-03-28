import { NextRequest, NextResponse } from "next/server";
import { fetchDDGImages } from "../_utils";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;

    // A generic query for trending wallpapers
    const searchQuery = `site:peakpx.com popular nature gaming anime movies 4k HD wallpaper 2024`;
    const wallpapers = await fetchDDGImages(searchQuery, page);

    return NextResponse.json({
      success: true,
      page,
      hasMore: wallpapers.length > 0,
      count: wallpapers.length,
      wallpapers
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[peakpx/trending] DDG Bypass ERROR:", msg);
    return NextResponse.json({ error: "Trending fetch failed", message: msg }, { status: 500 });
  }
}
