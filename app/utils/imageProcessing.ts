import { ProductData } from '../types/ProductData';

export interface ScanStatusResponse {
  status: 'processing' | 'completed' | 'failed';
  scannedData?: ProductData;
  savedData?: boolean;
  error?: string;
}

export async function scanImage(file: File): Promise<{ scanId: string }> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/scan-image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to initiate scan');
  }

  return response.json();
}

export async function checkScanStatus(scanId: string): Promise<ScanStatusResponse> {
  const response = await fetch(`/api/scan-status?id=${scanId}`);

  if (!response.ok) {
    throw new Error('Failed to check scan status');
  }

  return response.json();
}