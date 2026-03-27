import { NextRequest, NextResponse } from 'next/server';
import { fetchMovieDetails } from '../../core';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ site: string }> }
) {
    try {
        const { site } = await context.params;
        const typedSite = site as 'moviesmod' | 'moviesleech' | 'animeflix' | 'uhdmovies';
        
        // Validate site
        if(!['moviesmod', 'moviesleech', 'animeflix', 'uhdmovies'].includes(typedSite)) {
            return NextResponse.json({ success: false, error: 'Invalid site parameter' }, { status: 400 });
        }
        
        const searchParams = request.nextUrl.searchParams;
        const url = searchParams.get('url');

        if (!url) {
            return NextResponse.json({ success: false, error: 'URL parameter is required' }, { status: 400 });
        }
        
        const data = await fetchMovieDetails(url);
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
