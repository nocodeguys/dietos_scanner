import { NextRequest, NextResponse } from 'next/server';
import { ProductData } from '../../types/ProductData';

interface ScanJob {
  status: 'processing' | 'completed' | 'failed';
  scannedData?: ProductData;
  savedData?: boolean;
  error?: string;
}

declare global {
  // eslint-disable-next-line no-var
  var scanJobs: Record<string, ScanJob>;
}

if (typeof global.scanJobs === 'undefined') {
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