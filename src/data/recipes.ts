export interface Ingredient {
  name: string;
  quantity: number;
  unit: string;
}

export interface Recipe {
  id: number;
  name: string;
  image: string;
  time: string;
  servings: number;
  tags: string[];
  saved: boolean;
  ingredients: Ingredient[];
  nutrition?: {
    kcal: string;
    protein: string;
    carbs: string;
    fats: string;
  };
}

export const recipes: Recipe[] = [
  {
    id: 1,
    name: 'Paneer Butter Masala',
    image: '🍛',
    time: '30 min',
    servings: 4,
    tags: ['High Protein', 'Vegetarian'],
    saved: true,
    ingredients: [
      { name: 'Paneer', quantity: 400, unit: 'g' },
      { name: 'Tomatoes', quantity: 4, unit: 'pcs' },
      { name: 'Onion', quantity: 2, unit: 'pcs' },
      { name: 'Butter', quantity: 50, unit: 'g' },
      { name: 'Cream', quantity: 100, unit: 'ml' },
      { name: 'Ginger', quantity: 1, unit: 'inch' },
      { name: 'Garlic', quantity: 4, unit: 'cloves' },
      { name: 'Garam Masala', quantity: 1, unit: 'tsp' },
      { name: 'Turmeric', quantity: 0.5, unit: 'tsp' },
      { name: 'Red Chili Powder', quantity: 1, unit: 'tsp' },
      { name: 'Coriander', quantity: 1, unit: 'bunch' },
      { name: 'Salt', quantity: 1, unit: 'tsp' },
    ],
  },
  {
    id: 2,
    name: 'Chicken Biryani',
    image: '🍚',
    time: '45 min',
    servings: 6,
    tags: ['High Protein', 'Spicy'],
    saved: false,
    ingredients: [
      { name: 'Chicken', quantity: 500, unit: 'g' },
      { name: 'Basmati Rice', quantity: 500, unit: 'g' },
      { name: 'Onion', quantity: 3, unit: 'pcs' },
      { name: 'Yogurt', quantity: 200, unit: 'ml' },
      { name: 'Ginger', quantity: 2, unit: 'inch' },
      { name: 'Garlic', quantity: 6, unit: 'cloves' },
      { name: 'Green Chili', quantity: 4, unit: 'pcs' },
      { name: 'Mint Leaves', quantity: 1, unit: 'bunch' },
      { name: 'Coriander', quantity: 1, unit: 'bunch' },
      { name: 'Saffron', quantity: 1, unit: 'pinch' },
      { name: 'Ghee', quantity: 50, unit: 'g' },
      { name: 'Biryani Masala', quantity: 2, unit: 'tbsp' },
      { name: 'Bay Leaves', quantity: 2, unit: 'pcs' },
      { name: 'Cardamom', quantity: 4, unit: 'pcs' },
      { name: 'Cinnamon', quantity: 1, unit: 'stick' },
      { name: 'Cloves', quantity: 4, unit: 'pcs' },
      { name: 'Salt', quantity: 2, unit: 'tsp' },
      { name: 'Oil', quantity: 3, unit: 'tbsp' },
    ],
  },
  {
    id: 3,
    name: 'Pasta Primavera',
    image: '🍝',
    time: '20 min',
    servings: 4,
    tags: ['Quick', 'Kids Friendly'],
    saved: true,
    ingredients: [
      { name: 'Penne Pasta', quantity: 400, unit: 'g' },
      { name: 'Bell Pepper', quantity: 2, unit: 'pcs' },
      { name: 'Zucchini', quantity: 1, unit: 'pcs' },
      { name: 'Cherry Tomatoes', quantity: 200, unit: 'g' },
      { name: 'Olive Oil', quantity: 3, unit: 'tbsp' },
      { name: 'Garlic', quantity: 3, unit: 'cloves' },
      { name: 'Parmesan', quantity: 50, unit: 'g' },
      { name: 'Basil', quantity: 1, unit: 'bunch' },
      { name: 'Salt', quantity: 1, unit: 'tsp' },
      { name: 'Black Pepper', quantity: 0.5, unit: 'tsp' },
    ],
  },
  {
    id: 4,
    name: 'Fruit Smoothie Bowl',
    image: '🥣',
    time: '10 min',
    servings: 2,
    tags: ['Healthy', 'Low Sugar'],
    saved: false,
    ingredients: [
      { name: 'Banana', quantity: 2, unit: 'pcs' },
      { name: 'Strawberries', quantity: 150, unit: 'g' },
      { name: 'Blueberries', quantity: 100, unit: 'g' },
      { name: 'Greek Yogurt', quantity: 200, unit: 'g' },
      { name: 'Honey', quantity: 2, unit: 'tbsp' },
      { name: 'Granola', quantity: 50, unit: 'g' },
      { name: 'Chia Seeds', quantity: 1, unit: 'tbsp' },
      { name: 'Almond Milk', quantity: 100, unit: 'ml' },
    ],
  },
  {
    id: 5,
    name: 'Grilled Chicken Salad',
    image: '🥗',
    time: '25 min',
    servings: 2,
    tags: ['Healthy', 'High Protein'],
    saved: true,
    ingredients: [
      { name: 'Chicken Breast', quantity: 300, unit: 'g' },
      { name: 'Mixed Greens', quantity: 200, unit: 'g' },
      { name: 'Cherry Tomatoes', quantity: 100, unit: 'g' },
      { name: 'Cucumber', quantity: 1, unit: 'pcs' },
      { name: 'Avocado', quantity: 1, unit: 'pcs' },
      { name: 'Olive Oil', quantity: 2, unit: 'tbsp' },
      { name: 'Lemon', quantity: 1, unit: 'pcs' },
      { name: 'Salt', quantity: 0.5, unit: 'tsp' },
      { name: 'Black Pepper', quantity: 0.25, unit: 'tsp' },
    ],
  },
  {
    id: 6,
    name: 'Oatmeal & Fruits',
    image: '🥞',
    time: '15 min',
    servings: 2,
    tags: ['Breakfast', 'Healthy'],
    saved: true,
    ingredients: [
      { name: 'Oats', quantity: 100, unit: 'g' },
      { name: 'Milk', quantity: 400, unit: 'ml' },
      { name: 'Banana', quantity: 1, unit: 'pcs' },
      { name: 'Berries', quantity: 100, unit: 'g' },
      { name: 'Honey', quantity: 2, unit: 'tbsp' },
      { name: 'Cinnamon', quantity: 0.5, unit: 'tsp' },
    ],
  },
  {
    id: 7,
    name: 'Dal Tadka',
    image: '🍲',
    time: '35 min',
    servings: 4,
    tags: ['Vegetarian', 'Comfort Food'],
    saved: false,
    ingredients: [
      { name: 'Toor Dal', quantity: 200, unit: 'g' },
      { name: 'Onion', quantity: 1, unit: 'pcs' },
      { name: 'Tomatoes', quantity: 2, unit: 'pcs' },
      { name: 'Garlic', quantity: 4, unit: 'cloves' },
      { name: 'Cumin Seeds', quantity: 1, unit: 'tsp' },
      { name: 'Ghee', quantity: 2, unit: 'tbsp' },
      { name: 'Red Chili', quantity: 2, unit: 'pcs' },
      { name: 'Turmeric', quantity: 0.5, unit: 'tsp' },
      { name: 'Coriander', quantity: 1, unit: 'bunch' },
      { name: 'Salt', quantity: 1, unit: 'tsp' },
    ],
  },
];

export const collections = [
  { id: 1, name: '🧒 Kids Tiffin', count: 12, color: 'rgba(123, 164, 208, 0.2)', description: 'Healthy and tasty lunchbox ideas for kids.' }, // bg-secondary
  { id: 2, name: '💪 Gym Diet', count: 8, color: 'rgba(46, 94, 153, 0.15)', description: 'High protein meals for post-workout recovery.' }, // bg-success-light
  { id: 3, name: '🏠 Family Meals', count: 24, color: 'rgba(123, 164, 208, 0.2)', description: 'Perfect recipes for the whole family.' }, // bg-primary-light
  { id: 4, name: '🎉 Party Specials', count: 6, color: 'rgba(245, 158, 11, 0.15)', description: 'Crowd-pleasers for your next gathering.' }, // bg-warning-light
];
