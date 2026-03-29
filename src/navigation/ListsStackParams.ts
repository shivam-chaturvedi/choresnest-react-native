import { IconLibrary } from '../components/ui/CategoryIcon';

export type ListsStackParamList = {
  ListsMain: undefined;
  CreateListFlow: undefined;
  CategoryDetail: {
    categoryId: string;
    mode: 'current' | 'purchased';
    categoryName?: string;
    categoryIcon?: string;
    categoryLibrary?: IconLibrary;
    categoryColor?: string;
  };
};
