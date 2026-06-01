import { NextRequest, NextResponse } from 'next/server';
import { getHistory } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit  = parseInt(searchParams.get('limit')  ?? '100', 10);
    const offset = parseInt(searchParams.get('offset') ?? '0',   10);
    const from   = searchParams.get('from') ?? undefined;
    const to     = searchParams.get('to')   ?? undefined;

    if (isNaN(limit) || limit < 1 || limit > 1000) {
      return NextResponse.json({ error: 'limit must be between 1 and 1000' }, { status: 400 });
    }

    const result = getHistory({ limit, offset, from, to });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[GET /api/history] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
