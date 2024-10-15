export interface ProductData {
    name: string;
    product_name?: string; // Add this line
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