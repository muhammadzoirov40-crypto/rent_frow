import type { Category, SubCategory } from '../api/index';

type Named = Partial<Pick<Category, 'name' | 'name_tj' | 'name_en'>> &
  Partial<Pick<SubCategory, 'name' | 'name_tj' | 'name_en'>>;

/**
 * Picks the best localised label for a category/subcategory.
 * Falls back to the Russian `name` which is what the database is keyed on.
 */
export function localizeCategoryName(item: Named | null | undefined, lang: string): string {
  if (!item) return '';
  if (lang === 'tj' && item.name_tj) return item.name_tj;
  if (lang === 'en' && item.name_en) return item.name_en;
  return item.name || item.name_tj || item.name_en || '';
}
