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