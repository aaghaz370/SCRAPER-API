import { NextRequest, NextResponse } from 'next/server';
import { fetchMoviesPage } from '../core';

export async function GET(
    request: NextRequest,
    context: { params: Promise<{ site: string }> }
) {
    try {
        const { site } = await context.params;
        const typedSite = site as 'moviesmod' | 'moviesleech' | 'animeflix' | 'uhdmovies';
        const searchParams = request.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        
        // Validate site
        if(!['moviesmod', 'moviesleech', 'animeflix', 'uhdmovies'].includes(typedSite)) {
            return NextResponse.json({ success: false, error: 'Invalid site parameter' }, { status: 400 });
        }
        
        const data = await fetchMoviesPage(typedSite, page, '');
        return NextResponse.json(data);
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
