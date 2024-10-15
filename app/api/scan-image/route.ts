import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { saveProduct } from '../../utils/database';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export interface ProductData {
  name: string;
  price: number | null;
  ingredients: string[];
  macronutrients: {
    calories: number;
    protein: number;
    carbohydrates: number;
    fat: number;
  };
  vitamins: Record<string, number> | null;
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const base64Image = await fileToBase64(image);

    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "You are a product label analyzer. Extract information from the image and return it in JSON format matching the ProductData interface. The product may be in Polish."
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Analyze this product label. Extract the product name, price (if available), list of ingredients, macronutrients (calories, protein, carbohydrates, fat), and vitamins (if available). Format the response as JSON matching the ProductData interface. If price or vitamins are not available, use null." 
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
      max_tokens: 500,
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No content in OpenAI response');

    console.log('Raw OpenAI response:', content);

    // Attempt to parse the content as JSON
    let result: ProductData;
    try {
      // Try to extract JSON from the response if it's wrapped in code blocks
      const jsonMatch = content.match(/```json\s*([\s\S]*?)\s*```/);
      const jsonString = jsonMatch ? jsonMatch[1] : content;
      const parsedResult = JSON.parse(jsonString);
      
      // Map the parsed result to our ProductData interface
      result = {
        name: parsedResult.product_name || parsedResult.name || 'Unknown Product',
        price: parsedResult.price,
        ingredients: parsedResult.ingredients || [],
        macronutrients: parsedResult.macronutrients || {
          calories: 0,
          protein: 0,
          carbohydrates: 0,
          fat: 0
        },
        vitamins: parsedResult.vitamins
      };
    } catch (parseError) {
      console.error('Error parsing OpenAI response as JSON:', parseError);
      throw new Error('Failed to parse OpenAI response as JSON');
    }

    // Validate the parsed result
    if (!isValidProductData(result)) {
      console.error('Invalid ProductData structure:', result);
      throw new Error('Invalid ProductData structure');
    }

    // Save the product data to the database
    let savedData = null;
    let dbError = null;
    try {
      savedData = await saveProduct(result);
      console.log('Product saved to database:', savedData);
    } catch (error) {
      console.error('Error saving product to database:', error);
      dbError = error;
      // We'll continue and return the scanned data to the client, even if saving to the database fails
    }

    return NextResponse.json({ 
      scannedData: result, 
      savedData: savedData, 
      dbError: dbError ? (dbError as Error).message : null 
    });
  } catch (error) {
    console.error('Error processing image:', error);
    return NextResponse.json({ error: 'Failed to process image' }, { status: 500 });
  }
}

async function fileToBase64(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  return buffer.toString('base64');
}

function isValidProductData(data: any): data is ProductData {
  return (
    typeof data === 'object' &&
    typeof data.name === 'string' &&
    (typeof data.price === 'number' || data.price === null) &&
    Array.isArray(data.ingredients) &&
    typeof data.macronutrients === 'object' &&
    typeof data.macronutrients.calories === 'number' &&
    typeof data.macronutrients.protein === 'number' &&
    typeof data.macronutrients.carbohydrates === 'number' &&
    typeof data.macronutrients.fat === 'number' &&
    (typeof data.vitamins === 'object' || data.vitamins === null)
  );
}