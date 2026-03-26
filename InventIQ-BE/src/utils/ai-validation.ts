export const getMissingFields = (
  entityType: 'product' | 'category' | 'supplier',
  data: any
): string[] => {
  const hasValue = (value: unknown): boolean =>
    value !== undefined &&
    value !== null &&
    !(typeof value === 'string' && value.trim() === '');

  if (entityType === 'product') {
    const required = [
      'name',
      'category',
      'supplier',
      'sku',
      'quantity',
      'costPrice',
      'sellingPrice',
      'reorderLevel'
    ];
    return required.filter((field) => !hasValue(data?.[field]));
  }

  if (entityType === 'category') {
    const required = ['name'];
    return required.filter((field) => !hasValue(data?.[field]));
  }

  if (entityType === 'supplier') {
    const required = ['name', 'email'];
    return required.filter((field) => !hasValue(data?.[field]));
  }

  return [];
};
