import { NextRequest, NextResponse } from 'next/server';
import Database from 'better-sqlite3';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const isVercel = !!process.env.VERCEL;
    const DB_PATH = isVercel
      ? '/tmp/aqi.db'
      : (process.env.DB_PATH ?? path.join(process.cwd(), 'data', 'aqi.db'));

    const db = new Database(DB_PATH);
    
    const searchParams = req.nextUrl.searchParams;
    const action = searchParams.get('action');

    if (action === 'delete-all') {
      const result = db.prepare('DELETE FROM readings').run();
      db.close();
      return NextResponse.json({ message: 'Deleted all readings', changes: result.changes });
    }

    if (action === 'delete-test') {
      // Deletes typical test data, e.g. date '01/06/2026' or values that match seed data,
      // or we can delete all data if the user wants a clean slate.
      const result = db.prepare("DELETE FROM readings WHERE sensor_date = '01/06/2026' OR sensor_date = '01/01/2026'").run();
      db.close();
      return NextResponse.json({ message: 'Deleted test readings', changes: result.changes });
    }

    if (action === 'delete-id') {
      const id = searchParams.get('id');
      const result = db.prepare('DELETE FROM readings WHERE id = ?').run(id);
      db.close();
      return NextResponse.json({ message: `Deleted reading id ${id}`, changes: result.changes });
    }

    const readings = db.prepare('SELECT * FROM readings ORDER BY received_at DESC').all();
    db.close();
    return NextResponse.json({ count: readings.length, readings });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
