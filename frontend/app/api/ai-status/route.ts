import { NextResponse } from 'next/server';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL ?? 'http://localhost:8000';

export const dynamic = 'force-dynamic';

/** GET /api/ai-status — model status + trigger train */
export async function GET() {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/model/status`, {
      signal: AbortSignal.timeout(5_000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ trained: false, last_error: 'AI service offline' }, { status: 503 });
  }
}

/** POST /api/ai-status — trigger (re)training */
export async function POST() {
  try {
    const res = await fetch(`${AI_SERVICE_URL}/train`, {
      method: 'POST',
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.ok ? 200 : res.status });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'AI service unavailable';
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
