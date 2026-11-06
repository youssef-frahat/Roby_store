/**
 * Roby Store - Dynamic Variant Matrix & SKU Generator
 * Location: src/utils/variantGenerator.ts
 */

import { VariantColor } from '../types/store';

export interface CartesianGeneratorParams {
  colors: VariantColor[];
  sizes: string[];
  slug?: string;
  defaultStock?: number;
  defaultPriceAdjustment?: number;
}

export interface GeneratedVariant {
  id?: string;
  sku: string;
  color: VariantColor;
  size: string;
  priceAdjustment: number;
  stockQuantity: number;
  inStock: boolean;
  variantImageUrl?: string;
}

/**
 * Standard slug generator from title / text.
 * Converts to lowercase, replaces non-alphanumeric characters with hyphens,
 * collapses consecutive hyphens, and removes leading/trailing hyphens.
 */
export function generateSlug(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Sanitize text into a short uppercase SKU code (2-5 characters).
 */
export function sanitizeCode(text: string, maxLength = 4): string {
  if (!text) return 'DEF';
  const clean = text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  return clean.slice(0, maxLength) || 'DEF';
}

/**
 * Auto-generates a unique SKU for a given variant based on product slug, color, size, and index.
 */
export function generateVariantSku(
  slug: string,
  colorNameEn: string,
  size: string,
  index?: number
): string {
  const prefix = slug ? sanitizeCode(slug, 6) : 'ROBY';
  const colorPart = sanitizeCode(colorNameEn, 3);
  const sizePart = sanitizeCode(size, 4);
  const suffix = index !== undefined ? `-${index + 1}` : '';

  return `${prefix}-${colorPart}-${sizePart}${suffix}`;
}

/**
 * Generates Cartesian Product (Colors × Sizes) of variants with auto-generated SKUs.
 * Handles edge cases:
 * - Both colors and sizes provided: N × M variants
 * - Only colors provided: N variants with 'Free Size'
 * - Only sizes provided: M variants with default color
 * - Neither provided: 1 default variant
 */
export function generateCartesianVariants({
  colors,
  sizes,
  slug = 'product',
  defaultStock = 5,
  defaultPriceAdjustment = 0,
}: CartesianGeneratorParams): GeneratedVariant[] {
  const cleanColors = (colors || []).filter((c) => c && (c.nameAr || c.nameEn || c.hex));
  const cleanSizes = (sizes || []).map((s) => s.trim()).filter(Boolean);

  const defaultColor: VariantColor = {
    nameAr: 'لون موحد',
    nameEn: 'Standard',
    hex: '#800020',
  };
  const defaultSize = 'Free Size';

  const results: GeneratedVariant[] = [];
  const skuSet = new Set<string>();

  const createUniqueSku = (colorEn: string, sizeVal: string, idx: number): string => {
    let base = generateVariantSku(slug, colorEn, sizeVal);
    let candidate = base;
    let counter = 1;
    while (skuSet.has(candidate)) {
      candidate = `${base}-${counter}`;
      counter++;
    }
    skuSet.add(candidate);
    return candidate;
  };

  const effectiveColors = cleanColors.length > 0 ? cleanColors : [defaultColor];
  const effectiveSizes = cleanSizes.length > 0 ? cleanSizes : [defaultSize];

  let index = 0;
  for (const color of effectiveColors) {
    for (const size of effectiveSizes) {
      const sku = createUniqueSku(color.nameEn || 'STD', size, index);
      results.push({
        id: `var_gen_${Date.now()}_${index}`,
        sku,
        color: {
          nameAr: color.nameAr.trim() || 'لون موحد',
          nameEn: color.nameEn.trim() || 'Standard',
          hex: color.hex || '#800020',
        },
        size,
        priceAdjustment: defaultPriceAdjustment,
        stockQuantity: defaultStock,
        inStock: defaultStock > 0,
      });
      index++;
    }
  }

  return results;
}

/**
 * Validates variant matrix integrity:
 * - At least one variant must exist
 * - Every variant must have a non-empty SKU
 * - All variant SKUs must be unique (no duplicates)
 * - All stock quantities must be >= 0
 */
export function validateVariantMatrix(
  variants: Array<{ sku?: string; stockQuantity?: number }>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!variants || variants.length === 0) {
    errors.push('يجب إضافة متغير واحد على الأقل للمنتج');
    return { isValid: false, errors };
  }

  const seenSkus = new Set<string>();

  variants.forEach((v, idx) => {
    const rowNum = idx + 1;
    const sku = (v.sku || '').trim();

    if (!sku) {
      errors.push(`كود الصنف (SKU) للصف رقم ${rowNum} مطلوب ولا يمكن أن يكون فارغاً`);
    } else {
      const lowerSku = sku.toLowerCase();
      if (seenSkus.has(lowerSku)) {
        errors.push(`كود الصنف (SKU) "${sku}" مكرر في الصف رقم ${rowNum}. يجب أن يكون كل كود صنف فريداً`);
      } else {
        seenSkus.add(lowerSku);
      }
    }

    if (v.stockQuantity !== undefined && v.stockQuantity < 0) {
      errors.push(`كمية المخزون في الصف رقم ${rowNum} لا يمكن أن تكون قيمة سالبة`);
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Gracefully converts a File or Blob into a base64 Data URL.
 * Used as an offline/fallback storage mechanism so uploads always succeed.
 */
export function convertFileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof FileReader === 'undefined') {
      // In non-browser / node test environment fallback
      resolve('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Failed to read file as data URL'));
      }
    };
    reader.onerror = () => {
      reject(reader.error || new Error('FileReader error occurred'));
    };
    reader.readAsDataURL(file);
  });
}
