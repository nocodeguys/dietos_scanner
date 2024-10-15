Key Components
ProductScanner Component:
export default function ProductScanner() {
  const [scanning, setScanning] = useState(false)
  const [result, setResult] = useState<ProductData | null>(null)
  const [savedToDatabase, setSavedToDatabase] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [scanId, setScanId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleCapture = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setScanning(true)
      setError(null)
      setSavedToDatabase(false)
      setResult(null)
      try {
        const { scanId } = await scanImage(file)
        setScanId(scanId)
        await pollScanStatus(scanId)
      } catch (error) {
        console.error('Error initiating scan:', error)
        setError('Failed to initiate scan. Please try again.')
      }
      setScanning(false)
    }
  }

  const pollScanStatus = async (id: string) => {
    try {
      const response: ScanStatusResponse = await checkScanStatus(id)
      if (response.status === 'completed' && response.scannedData) {
        setResult(response.scannedData)
        setSavedToDatabase(!!response.savedData)
        setScanId(null)
      } else if (response.status === 'processing') {
        setTimeout(() => pollScanStatus(id), 5000) // Poll every 5 seconds
      } else {
        throw new Error(response.error || 'Scan failed')
      }
    } catch (error) {
      console.error('Error checking scan status:', error)
      setError('Failed to retrieve scan results. Please try again.')
      setScanId(null)
    }
  }
  return (
    <div className="w-full max-w-md">
      <input
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleCapture}
        ref={fileInputRef}
        className="hidden"
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="w-full bg-blue-500 text-white py-2 px-4 rounded disabled:bg-blue-300"
        disabled={scanning || !!scanId}
      >
        {scanning ? 'Initiating Scan...' : scanId ? 'Processing...' : 'Scan Product'}
      </button>
      {error && (
        <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          <strong>Error:</strong> {error}
        </div>
      )}
      {scanId && (
        <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 text-yellow-700 rounded">
          Scan in progress. This may take a few moments...
        </div>
      )}
      {result && (
        <div className="mt-4">
          <h2 className="text-xl font-bold">Scanned Result:</h2>
          <div className="bg-gray-100 p-4 rounded mt-2">
            <p><strong>Name:</strong> {result.name}</p>
            <p><strong>Price:</strong> {result.price !== null ? `$${result.price.toFixed(2)}` : 'Not available'}</p>
            <p><strong>Ingredients:</strong> {result.ingredients.length > 0 ? result.ingredients.join(', ') : 'Not available'}</p>
            <p><strong>Macronutrients:</strong></p>
            <ul className="list-disc list-inside pl-4">
              <li>Calories: {result.macronutrients.calories}</li>
              <li>Protein: {result.macronutrients.protein}g</li>
              <li>Carbohydrates: {result.macronutrients.carbohydrates}g</li>
              <li>Fat: {result.macronutrients.fat}g</li>
            </ul>
            {result.vitamins && Object.keys(result.vitamins).length > 0 ? (
              <>
                <p><strong>Vitamins:</strong></p>
                <ul className="list-disc list-inside pl-4">
                  {Object.entries(result.vitamins).map(([vitamin, amount]) => (
                    <li key={vitamin}>{vitamin}: {amount}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p><strong>Vitamins:</strong> Not available</p>
            )}
          </div>
          {savedToDatabase && (
            <div className="mt-2 p-2 bg-green-100 text-green-700 rounded">
              Product successfully saved to database.
            </div>
          )}
        </div>
      )}
    </div>
  )
}

This is the main component handling the user interface for scanning products and displaying results.
Image Processing API:

import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { v4 as uuidv4 } from 'uuid';
import { ProductData } from '../../types/ProductData';
import { saveProduct } from '../../utils/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

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

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const scanId = uuidv4();
    global.scanJobs[scanId] = { status: 'processing' };

    processImage(scanId, image).catch(error => {
      console.error('Error processing image:', error);
      global.scanJobs[scanId] = { status: 'failed', error: 'Failed to process image' };
    });

    return NextResponse.json({ scanId });
  } catch (error) {
    console.error('Error initiating scan:', error);
    return NextResponse.json({ error: 'Failed to initiate scan' }, { status: 500 });
  }
}
async function processImage(scanId: string, image: File) {
  try {
    const base64Image = await fileToBase64(image);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a product label analyzer. Extract information from the image and return it in JSON format matching the ProductData interface. The product may be in Polish. Use 'name' for the product name field. Do not include any markdown formatting or code block syntax in your response."
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Analyze this product label. Extract the product name (use 'name' field), price (if available), list of ingredients, macronutrients (calories, protein, carbohydrates, fat), and vitamins (if available). Format the response as JSON matching the ProductData interface. If price or vitamins are not available, use null." 
            },
            {
              type: "image_url",
              image_url: {
                "url": `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
    });
    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content in OpenAI response');

    console.log('Raw OpenAI response:', content);

    // Remove any potential markdown formatting
    const cleanedContent = content.replace(/```json\s*|\s*```/g, '').trim();

    let parsedResult: Partial<ProductData>;
    try {
      parsedResult = JSON.parse(cleanedContent);
    } catch (parseError) {
      console.error('Error parsing OpenAI response as JSON:', parseError);
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    // Transform the parsed result to match ProductData interface
    const transformedResult: ProductData = {
      name: parsedResult.name || 'Unknown Product',
      price: parsedResult.price !== undefined ? parsedResult.price : null,
      ingredients: Array.isArray(parsedResult.ingredients) ? parsedResult.ingredients : [],
      macronutrients: {
        calories: parsedResult.macronutrients?.calories || 0,
        protein: parsedResult.macronutrients?.protein || 0,
        carbohydrates: parsedResult.macronutrients?.carbohydrates || 0,
        fat: parsedResult.macronutrients?.fat || 0
      },
      vitamins: parsedResult.vitamins || null
    };
    // Validate the transformed result
    if (!isValidProductData(transformedResult)) {
      console.error('Invalid ProductData structure:', transformedResult);
      throw new Error('Invalid ProductData structure');
    }

    // Save the product data to the database
    try {
      const savedData = await saveProduct(transformedResult);
      global.scanJobs[scanId] = { 
        status: 'completed', 
        scannedData: transformedResult,
        savedData: true
      };
      console.log('Product saved to database:', savedData);
    } catch (dbError) {
      console.error('Error saving product to database:', dbError);
      global.scanJobs[scanId] = { 
        status: 'completed', 
        scannedData: transformedResult,
        savedData: false,
        error: 'Failed to save product to database'
      };
    }
  } catch (error) {
    console.error('Error processing image:', error);
    global.scanJobs[scanId] = { status: 'failed', error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

function isValidProductData(data: unknown): data is ProductData {
  if (typeof data !== 'object' || data === null) {
    return false;
  }
  
  const productData = data as Partial<ProductData>;
  
  return (
    typeof productData.name === 'string' &&
    (typeof productData.price === 'number' || productData.price === null) &&
    Array.isArray(productData.ingredients) &&
    typeof productData.macronutrients === 'object' &&
    typeof productData.macronutrients?.calories === 'number' &&
    typeof productData.macronutrients?.protein === 'number' &&
    typeof productData.macronutrients?.carbohydrates === 'number' &&
    typeof productData.macronutrients?.fat === 'number' &&
    (productData.vitamins === null || typeof productData.vitamins === 'object')
  );
}

This API route handles image upload, processing with OpenAI, and storing results in the database.
Database Utilities:

import { createClient } from '@supabase/supabase-js'
import { ProductData } from '@/app/types/ProductData'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

export async function saveProduct(productData: ProductData) {
  try {
    const dataToInsert = {
      ...productData,
      price: productData.price ?? 0,
      vitamins: productData.vitamins ?? {},
      macronutrients: {
        calories: productData.macronutrients.calories ?? 0,
        protein: productData.macronutrients.protein ?? 0,
        carbohydrates: productData.macronutrients.carbohydrates ?? 0,
        fat: productData.macronutrients.fat ?? 0
      }
    };

    const { data, error } = await supabase
      .from('products_scanned')
      .insert(dataToInsert)
      .select()

    if (error) {
      console.error('Error saving product:', error)
      throw new Error(`Failed to save product: ${error.message}`)
    }

    if (!data || data.length === 0) {
      throw new Error('No data returned after inserting product')
    }

    console.log('Product saved successfully:', data[0])
    return data[0]
  } catch (error) {
    console.error('Error in saveProduct function:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred while saving product')
  }
}
export async function getProductById(id: number) {
  try {
    const { data, error } = await supabase
      .from('products_scanned')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      throw new Error(`Failed to fetch product: ${error.message}`)
    }

    if (!data) {
      throw new Error('Product not found')
    }

    return data as ProductData
  } catch (error) {
    console.error('Error in getProductById function:', error)
    throw error instanceof Error ? error : new Error('Unknown error occurred while fetching product')
  }
}