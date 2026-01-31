
export enum Category {
  TOP = 'Üst Giyim',
  BOTTOM = 'Alt Giyim',
  OUTERWEAR = 'Dış Giyim',
  SHOES = 'Ayakkabı',
  ACCESSORY = 'Aksesuar',
  DRESS = 'Elbise'
}

export type Gender = 'Erkek' | 'Kadın';

export interface WardrobeItem {
  id: string;
  imageUrl: string;
  category: Category;
  color: string;
  tags: string[];
}

export interface Combination {
  title: string;
  description: string;
  itemsIds: string[];
  stylingTips: string[];
  occasion: string;
}

export type StylePreference = 'Günlük' | 'Resmi' | 'Sokak Stili' | 'Randevu' | 'Minimalist' | 'Gece Şıklığı';

export interface AppState {
  wardrobe: WardrobeItem[];
  selectedStyle: StylePreference;
  selectedGender: Gender;
  customPrompt: string;
  lastCombination: Combination | null;
  isLoading: boolean;
}
