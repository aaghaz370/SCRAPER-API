import { NextRequest, NextResponse } from 'next/server';
import { fetchMoviesPage } from '../../core';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ site: string }> }
) {
    try {
        const { site } = await context.params;
        const typedSite = site as 'moviesmod' | 'moviesleech' | 'animeflix' | 'uhdmovies';
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const q = searchParams.get('q');
        
        // Validate site
        if(!['moviesmod', 'moviesleech', 'animeflix', 'uhdmovies'].includes(typedSite)) {
            return NextResponse.json({ success: false, error: 'Invalid site parameter' }, { status: 400 });
        }
        
        if (!q) {
            return NextResponse.json({ success: false, error: 'Query parameter "q" is required' }, { status: 400 });
        }
        
        const data = await fetchMoviesPage(typedSite, page, q);
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
