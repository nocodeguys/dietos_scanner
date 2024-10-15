import { ProductData } from '../types/ProductData';

interface ScanImageResponse {
  scannedData: ProductData;
  savedData: unknown;
  dbError: string | null;
}

export async function scanImage(file: File): Promise<ScanImageResponse> {
  const formData = new FormData();
  formData.append('image', file);

  const response = await fetch('/api/scan-image', {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    throw new Error('Failed to scan image');
  }

  const result = await response.json();
  return result as ScanImageResponse;
}