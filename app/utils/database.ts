import { createClient } from '@supabase/supabase-js'
import { ProductData } from '@/app/types/ProductData'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL as string,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string
)

export async function saveProduct(productData: ProductData) {
  try {
    // If price is null, set it to 0 or any default value you prefer
    // If vitamins is null, set it to an empty object
    const dataToInsert = {
      ...productData,
      price: productData.price === null ? 0 : productData.price,
      vitamins: productData.vitamins === null ? {} : productData.vitamins
    };

    const { data, error } = await supabase
      .from('products_scanned')
      .insert(dataToInsert)
      .select()

    if (error) {
      console.error('Error saving product:', error)
      throw error
    }

    console.log('Product saved successfully:', data)
    return data
  } catch (error) {
    console.error('Error in saveProduct function:', error)
    throw error
  }
}