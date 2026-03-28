import { NextRequest, NextResponse } from "next/server";
import { fetchDDGImages } from "../_utils";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export const PEAKPX_CATEGORIES = [
  "nature", "abstract", "animals", "anime", "cars", "city",
  "dark", "fantasy", "flowers", "food", "games", "girls",
  "love", "minimalism", "motorcycles", "movies", "music",
  "space", "sports", "technology", "travel",
];

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = (searchParams.get("name") || searchParams.get("category") || "").toLowerCase().trim();
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;

    if (!category || !PEAKPX_CATEGORIES.includes(category)) {
      return NextResponse.json({
        error: "Missing or invalid category name",
        availableCategories: PEAKPX_CATEGORIES
      }, { status: 400 });
    }

    const searchQuery = `site:peakpx.com ${category} 4k HD wallpaper`;
    const wallpapers = await fetchDDGImages(searchQuery, page);

    return NextResponse.json({
      success: true,
      category,
      page,
      hasMore: wallpapers.length > 0,
      count: wallpapers.length,
      wallpapers
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[peakpx/category] DDG Bypass ERROR:", msg);
    return NextResponse.json({ error: "Category fetch failed", message: msg }, { status: 500 });
  }
}
