import {
  LayoutGrid,
  Grid2X2,
  Home,
  Car,
  Wrench,
  Laptop,
  Shirt,
  Dumbbell,
  WashingMachine,
  Camera,
  Music,
  PartyPopper,
  TreePine,
  HardHat,
  Truck,
  Utensils,
  Ship,
  Baby,
} from 'lucide-react';
import type { ElementType } from 'react';
import type { Category } from '../api/index';
import { localizeCategoryName } from './categoryName';

/** Localised category label → lucide icon. */
export const ICON_MAP: Record<string, ElementType> = {
  'Транспорт': Car,
  'Нақлиёт': Car,
  'Transport': Car,
  'Инструменты': Wrench,
  'Асбобҳо': Wrench,
  'Таҷҳизот': Wrench,
  'Tools & Equipment': Wrench,
  'Недвижимость': Home,
  'Моликият': Home,
  'Property': Home,
  'Фото и видео': Camera,
  'Аудио и видео': Music,
  'Для мероприятий': PartyPopper,
  'Барои чорабиниҳо': PartyPopper,
  'Чорабиниҳо': PartyPopper,
  'Events': PartyPopper,
  'Сад и огород': TreePine,
  'Строительство': HardHat,
  'Электроника': Laptop,
  'Electronics': Laptop,
  'Спорт': Dumbbell,
  'Варзиш': Dumbbell,
  'Sports': Dumbbell,
  'Дигар': Grid2X2,
  'Другое': Grid2X2,
  'Other': Grid2X2,
  'Детские товары': Baby,
  'Спецтехника': Truck,
  'Кафе и кухня': Utensils,
  'Водный транспорт': Ship,
  'Одежда': Shirt,
  'Либос': Shirt,
  'Clothing': Shirt,
  'Бытовая техника': WashingMachine,
  'Техникаи хонагӣ': WashingMachine,
  'Home appliances': WashingMachine,
};

/** Maps the `icon` column stored in the database to a lucide icon. */
export const ICON_NAME_MAP: Record<string, ElementType> = {
  home: Home,
  house: Home,
  building: Home,
  car: Car,
  truck: Truck,
  bike: Car,
  wrench: Wrench,
  tools: Wrench,
  calendar: Music,
  laptop: Laptop,
  electronics: Laptop,
  shirt: Shirt,
  dumbbell: Dumbbell,
  sport: Dumbbell,
  camera: Camera,
  music: Music,
  tree: TreePine,
  hardhat: HardHat,
  utensils: Utensils,
  ship: Ship,
  baby: Baby,
  'washing-machine': WashingMachine,
  appliance: WashingMachine,
};

/** Best matching icon for a category: label → label fragment → db icon → fallback. */
export function iconFor(category: Category, lang: string): ElementType {
  const label = localizeCategoryName(category, lang);
  if (ICON_MAP[label]) return ICON_MAP[label];
  for (const [key, Icon] of Object.entries(ICON_MAP)) {
    if (label.toLowerCase().includes(key.toLowerCase())) return Icon;
  }
  if (category.icon) {
    const named = ICON_NAME_MAP[category.icon.toLowerCase()];
    if (named) return named;
    const match = Object.entries(ICON_NAME_MAP).find(([k]) =>
      category.icon!.toLowerCase().includes(k),
    );
    if (match) return match[1];
  }
  return LayoutGrid;
}
