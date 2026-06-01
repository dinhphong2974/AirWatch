import { NextResponse } from 'next/server';
import { getLatestReading } from '@/lib/db';
import { getAqiInfo } from '@/lib/aqi';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const reading = getLatestReading();

    if (!reading) {
      return NextResponse.json({ error: 'No data available yet' }, { status: 404 });
    }

    const aqiInfo = getAqiInfo(reading.aqi);

    return NextResponse.json({
      ...reading,
      aqiColor:   aqiInfo.color,
      aqiMessage: aqiInfo.message,
      aqiAction:  aqiInfo.action,
    });
  } catch (err) {
    console.error('[GET /api/latest] Error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
