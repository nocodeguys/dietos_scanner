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