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

    // Boundary validation for physical metrics to ensure data integrity
    if (body.pm25! < 0 || body.pm25! > 1000) {
      return NextResponse.json({ error: 'pm25 out of range [0, 1000]' }, { status: 400 });
    }
    if (body.temperature! < -50 || body.temperature! > 100) {
      return NextResponse.json({ error: 'temperature out of range [-50, 100]' }, { status: 400 });
    }
    if (body.humidity! < 0 || body.humidity! > 100) {
      return NextResponse.json({ error: 'humidity out of range [0, 100]' }, { status: 400 });
    }
    if (body.pressure! < 800 || body.pressure! > 1200) {
      return NextResponse.json({ error: 'pressure out of range [800, 1200]' }, { status: 400 });
    }
    if (body.uv! < 0 || body.uv! > 25) {
      return NextResponse.json({ error: 'uv out of range [0, 25]' }, { status: 400 });
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
