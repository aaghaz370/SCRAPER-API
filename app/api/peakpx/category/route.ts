import { NextRequest, NextResponse } from "next/server";
import { fetchPeakPX, parseWallpaperGrid, parsePagination } from "../_utils";

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
    const category = (
      searchParams.get("name") || searchParams.get("category") || ""
    )
      .toLowerCase()
      .trim();
    const page = parseInt(searchParams.get("page") || "1", 10) || 1;

    if (!category) {
      return NextResponse.json(
        {
          error: "Missing category name. Use ?name=nature",
          availableCategories: PEAKPX_CATEGORIES,
        },
        { status: 400 }
      );
    }

    const url =
      page > 1
        ? `https://www.peakpx.com/en/category/${encodeURIComponent(category)}/page/${page}`
        : `https://www.peakpx.com/en/category/${encodeURIComponent(category)}`;

    const html = await fetchPeakPX(url);
    const wallpapers = parseWallpaperGrid(html);
    const { totalPages, hasNextPage } = parsePagination(html, page);

    return NextResponse.json({
      success: true,
      category,
      page,
      totalPages,
      hasNextPage,
      count: wallpapers.length,
      wallpapers,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[peakpx/category] ERROR:", msg);
    return NextResponse.json(
      { error: "Category fetch failed", message: msg },
      { status: 500 }
    );
  }
}
