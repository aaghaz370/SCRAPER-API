import { NextRequest, NextResponse } from "next/server";
import { fetchPeakPXPuppeteer } from "../_utils";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const slugParam = searchParams.get("slug") || "";
    const urlParam = searchParams.get("url") || "";

    let pageUrl = "";
    if (urlParam) {
      pageUrl = urlParam.startsWith("http") ? urlParam : `https://www.peakpx.com${urlParam}`;
    } else if (slugParam) {
      pageUrl = slugParam.startsWith("http") ? slugParam : slugParam.startsWith("/") ? `https://www.peakpx.com${slugParam}` : `https://www.peakpx.com/en/${slugParam}`;
    } else {
      return NextResponse.json({ error: "Missing required param: ?slug=xx" }, { status: 400 });
    }

    const html = await fetchPeakPXPuppeteer(pageUrl, "#fig img");
    
    // Parse it quickly
    let title = "";
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch) title = titleMatch[1].replace(/ (?:hd )?wallpaper.*/i, "").trim();

    let imageUrl = "";
    const figMatch = html.match(/id="fig"[\s\S]{0,500}?<img[^>]+src="([^"]+)"/i);
    if (figMatch) imageUrl = figMatch[1];
    
    // Fallback parsing (since we use exact page loading)
    if (!imageUrl) {
      const ogImgMatch = html.match(/<meta[^>]+property="og:image"[^>]+content="([^"]+)"/i);
      if (ogImgMatch) imageUrl = ogImgMatch[1];
    }

    const wMatch = html.match(/<meta[^>]+property="og:image:width"[^>]+content="(\d+)"/i);
    const hMatch = html.match(/<meta[^>]+property="og:image:height"[^>]+content="(\d+)"/i);
    const width = wMatch ? parseInt(wMatch[1]) : undefined;
    const height = hMatch ? parseInt(hMatch[1]) : undefined;
    const resolution = width && height ? `${width}x${height}` : undefined;

    return NextResponse.json({
      success: true,
      wallpaper: {
        id: slugParam || "",
        slug: slugParam || "",
        title: title || "Wallpaper",
        pageUrl,
        thumbnailUrl: imageUrl,
        imageUrl,
        downloadUrl: imageUrl,
        resolution,
        width,
        height,
      }
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error("[peakpx/wallpaper] ERROR:", msg);
    return NextResponse.json({ error: "Wallpaper fetch failed", message: msg }, { status: 500 });
  }
}
