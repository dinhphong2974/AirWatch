import { NextRequest, NextResponse } from 'next/server';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const steps = searchParams.get('steps') ?? '6';

    const res = await fetch(`${AI_SERVICE_URL}/predict?steps=${steps}`, {
      signal: AbortSignal.timeout(10_000), // 10s timeout
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: 'AI service error' }));
      return NextResponse.json(err, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service unavailable';
    // Return a graceful fallback so the dashboard still renders
    return NextResponse.json(
      { error: message, predictions: [], method: 'unavailable' },
      { status: 503 }
    );
  }
}
