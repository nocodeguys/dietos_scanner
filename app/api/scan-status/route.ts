import { NextRequest, NextResponse } from 'next/server';

// This should be replaced with a proper database or caching solution
declare global {
  var scanJobs: Record<string, any>;
}

if (!global.scanJobs) {
  global.scanJobs = {};
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'No scan ID provided' }, { status: 400 });
  }

  const scanJob = global.scanJobs[id];

  if (!scanJob) {
    return NextResponse.json({ error: 'Scan job not found' }, { status: 404 });
  }

  return NextResponse.json(scanJob);
}