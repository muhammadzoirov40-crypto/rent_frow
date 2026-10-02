/**
 * Quick price brackets shared by the search filter sidebar and the sub-navbar,
 * so both surfaces always offer the same ranges and the same i18n keys.
 */
export const PRICE_PRESETS: { min: string; max: string; labelKey: string }[] = [
  { min: '', max: '100', labelKey: 'search.presetUnder100' },
  { min: '100', max: '500', labelKey: 'search.preset100to500' },
  { min: '500', max: '1000', labelKey: 'search.preset500to1000' },
  { min: '1000', max: '', labelKey: 'search.presetOver1000' },
];
