import { NextResponse } from 'next/server';
import { getMoviesUI } from './ui';

export async function GET(request: Request) {
  return new NextResponse(getMoviesUI(), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
