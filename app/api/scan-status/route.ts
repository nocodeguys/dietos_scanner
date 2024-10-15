import { NextRequest, NextResponse } from 'next/server';
import { ProductData } from '../../types/ProductData';

declare global {
  var scanJobs: Record<string, any>;
}

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const scanId = searchParams.get('scanId');

  if (!scanId) {
    return NextResponse.json({ error: 'No scanId provided' }, { status: 400 });
  }

  const scanJob = global.scanJobs[scanId];

  if (!scanJob) {
    return NextResponse.json({ error: 'Scan job not found' }, { status: 404 });
  }

  if (scanJob.status === 'completed') {
    const response: ScanStatusResponse = {
      status: 'completed',
      scannedData: scanJob.scannedData as ProductData,
      savedData: scanJob.savedData
    };
    return NextResponse.json(response);
  } else if (scanJob.status === 'processing') {
    return NextResponse.json({ status: 'processing' });
  } else {
    return NextResponse.json({ status: 'failed', error: scanJob.error }, { status: 500 });
  }
}

interface ScanStatusResponse {
  status: 'completed' | 'processing' | 'failed';
  scannedData?: ProductData;
  savedData?: boolean;
  error?: string;
}