import { NextRequest, NextResponse } from 'next/server';
import { insertReading } from '@/lib/db';
import type { SensorPayload } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as Partial<SensorPayload>;

    // Validate required fields
    const required: (keyof SensorPayload)[] = ['pm25', 'temperature', 'humidity', 'pressure', 'uv', 'date', 'time'];
    for (const field of required) {
      if (body[field] === undefined || body[field] === null) {
        return NextResponse.json({ error: `Missing field: ${field}` }, { status: 400 });
      }
    }

    // Type validation for numeric fields
    const numFields: (keyof SensorPayload)[] = ['pm25', 'temperature', 'humidity', 'pressure', 'uv'];
    for (const field of numFields) {
      if (typeof body[field] !== 'number' || isNaN(body[field] as number)) {
        return NextResponse.json({ error: `Field "${field}" must be a valid number` }, { status: 400 });
      }
    }

    const payload = body as SensorPayload;
    const id = insertReading(payload);

    return NextResponse.json({ status: 'ok', id }, { status: 201 });
  } catch (err) {
    console.error('[POST /api/data] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Allow CORS for ESP32 (no browser origin)
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
