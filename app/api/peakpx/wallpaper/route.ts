import { NextRequest, NextResponse } from "next/server";
import { fetchDDGImages } from "../_utils";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slugParam = searchParams.get("slug") || "";
    const urlParam = searchParams.get("url") || "";

    if (!slugParam && !urlParam) {
      return NextResponse.json({
        error: "Missing required param.",
        usage: ["?slug=hd-wallpaper-desktop-xxxxx", "?url=https://www.peakpx.com/en/hd-wallpaper-desktop-xxxxx"]
      }, { status: 400 });
    }

    let searchTarget = slugParam;
    if (urlParam) {
      const parts = urlParam.split("/");
      searchTarget = parts[parts.length - 1] || parts[parts.length - 2];
    } else if (slugParam) {
      const parts = slugParam.split("/");
      searchTarget = parts[parts.length - 1] || parts[parts.length - 2];
    }
    
    // Convert slug to readable words for DDG
    const keywords = searchTarget.replace(/-/g, " ").replace(/\.(html|php|aspx)/i, "").trim();
    
    // Force DDG to find exact peakpx wallpaper using its slug
    const searchQuery = `site:peakpx.com "${keywords}"`;
    const wallpapers = await fetchDDGImages(searchQuery, 1);
    
    if (wallpapers.length === 0) {
      return NextResponse.json({ error: "Wallpaper not found or blocked.", keywords }, { status: 404 });
    }

    // Usually the first result is the exact match for the slug 
    const wallpaper = wallpapers[0];

    return NextResponse.json({
      success: true,
      wallpaper
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[peakpx/wallpaper] ERROR:", msg);
    return NextResponse.json({ error: "Wallpaper fetch failed", message: msg }, { status: 500 });
  }
}
