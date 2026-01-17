import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 10;

export async function GET() {
  return NextResponse.json({ 
    status: 'ok',
    message: 'Test route works!' 
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return NextResponse.json({ 
    status: 'ok',
    message: 'Test POST route works!',
    received: body 
  });
}

