export interface ShoppingCategory {
  id: string;
  name: string;
  icon: string;
  library: 'MaterialCommunityIcons' | 'MaterialIcons' | 'FontAwesome5' | 'Ionicons';
  color?: string;
}

export const shoppingCategories: ShoppingCategory[] = [
  { id: 'Groceries', name: 'Groceries', icon: 'cart-outline', library: 'MaterialCommunityIcons', color: '#0ea5e9' },
  { id: 'Electronics', name: 'Electronics', icon: 'laptop', library: 'MaterialCommunityIcons', color: '#6366f1' },
  { id: 'Clothing', name: 'Clothing', icon: 'tshirt-crew-outline', library: 'MaterialCommunityIcons', color: '#f97316' },
  { id: 'Footwear', name: 'Footwear', icon: 'shoe-sneaker', library: 'MaterialCommunityIcons', color: '#a855f7' },
  { id: 'Beauty & Personal Care', name: 'Beauty & Personal Care', icon: 'lipstick', library: 'MaterialCommunityIcons', color: '#ec4899' },
  { id: 'Home & Kitchen', name: 'Home & Kitchen', icon: 'silverware-fork-knife', library: 'MaterialCommunityIcons', color: '#facc15' },
  { id: 'Furniture', name: 'Furniture', icon: 'sofa-outline', library: 'MaterialCommunityIcons', color: '#64748b' },
  { id: 'Sports & Fitness', name: 'Sports & Fitness', icon: 'dumbbell', library: 'MaterialCommunityIcons', color: '#14b8a6' },
  { id: 'Books & Stationery', name: 'Books & Stationery', icon: 'book-open-outline', library: 'MaterialCommunityIcons', color: '#0284c7' },
  { id: 'Toys & Kids', name: 'Toys & Kids', icon: 'teddy-bear', library: 'MaterialCommunityIcons', color: '#f472b6' },
  { id: 'Automotive', name: 'Automotive', icon: 'car-outline', library: 'MaterialCommunityIcons', color: '#22c55e' },
  { id: 'Health & Pharmacy', name: 'Health & Pharmacy', icon: 'medical-bag', library: 'MaterialCommunityIcons', color: '#0f766e' },
  { id: 'Jewelry & Accessories', name: 'Jewelry & Accessories', icon: 'diamond-stone', library: 'MaterialCommunityIcons', color: '#f97316' },
  { id: 'Pet Supplies', name: 'Pet Supplies', icon: 'paw', library: 'MaterialCommunityIcons', color: '#f59e0b' },
  { id: 'Other', name: 'Other', icon: 'dots-horizontal', library: 'MaterialCommunityIcons', color: '#94a3b8' },
];
