'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Save,
  ArrowRight,
  Plus,
  Trash2,
  Copy,
  Image as ImageIcon,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Star,
  UploadCloud,
  Check,
  Tag,
  DollarSign,
  Layers,
  Wand2,
  HelpCircle,
} from 'lucide-react';
import { Product, Category, VariantColor, CreateProductInput } from '@/types/store';
import { getStoreService } from '@/services/storeService';
import { formatEGP } from '@/utils/pricing';
import {
  generateSlug,
  generateCartesianVariants,
  validateVariantMatrix,
  convertFileToDataUrl,
  GeneratedVariant,
} from '@/utils/variantGenerator';

interface ProductFormProps {
  initialData?: Product | null;
  mode: 'create' | 'edit';
  categories: Category[];
  onSuccess?: (product: Product) => void;
}

// Preset luxury fashion color palette for fast entry
const PRESET_COLORS = [
  { nameAr: 'أسود فاحم', nameEn: 'Black', hex: '#111111' },
  { nameAr: 'نبيتي ملكي', nameEn: 'Burgundy', hex: '#800020' },
  { nameAr: 'كحلي داكن', nameEn: 'Navy', hex: '#0F1E36' },
  { nameAr: 'كشمير ناعم', nameEn: 'Dusty Rose', hex: '#D4A5A5' },
  { nameAr: 'بيج عاجي', nameEn: 'Ivory Beige', hex: '#E8D8C8' },
  { nameAr: 'أبيض لؤلؤي', nameEn: 'White', hex: '#FFFFFF' },
  { nameAr: 'زيتي غامق', nameEn: 'Olive', hex: '#2F4F4F' },
  { nameAr: 'بترولي', nameEn: 'Teal', hex: '#005A60' },
];

// Preset apparel & bedding sizes
const PRESET_SIZES = ['S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size', '160×200cm', '180×200cm'];

export default function ProductForm({
  initialData,
  mode,
  categories,
  onSuccess,
}: ProductFormProps) {
  const router = useRouter();

  // Basic Details
  const [titleAr, setTitleAr] = useState(initialData?.titleAr || '');
  const [titleEn, setTitleEn] = useState(initialData?.titleEn || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [descriptionAr, setDescriptionAr] = useState(initialData?.descriptionAr || '');
  const [descriptionEn, setDescriptionEn] = useState(initialData?.descriptionEn || '');
  const [categoryIds, setCategoryIds] = useState<string[]>(initialData?.categoryIds || []);
  const [tagsInput, setTagsInput] = useState(initialData?.tags?.join(', ') || '');
  const [isFeatured, setIsFeatured] = useState<boolean>(initialData?.isFeatured ?? false);
  const [isNewArrival, setIsNewArrival] = useState<boolean>(initialData?.isNewArrival ?? true);

  // Pricing
  const [basePrice, setBasePrice] = useState<string>(
    initialData?.basePrice !== undefined ? String(initialData.basePrice) : ''
  );
  const [discountPrice, setDiscountPrice] = useState<string>(
    initialData?.discountPrice !== undefined ? String(initialData.discountPrice) : ''
  );

  // Images
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [externalImageUrl, setExternalImageUrl] = useState('');
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Cartesian Generator State
  const [selectedGeneratorColors, setSelectedGeneratorColors] = useState<VariantColor[]>([]);
  const [selectedGeneratorSizes, setSelectedGeneratorSizes] = useState<string[]>([]);
  const [customColorNameAr, setCustomColorNameAr] = useState('');
  const [customColorNameEn, setCustomColorNameEn] = useState('');
  const [customColorHex, setCustomColorHex] = useState('#800020');
  const [customSizeInput, setCustomSizeInput] = useState('');

  // Variant Matrix Rows
  const [variants, setVariants] = useState<GeneratedVariant[]>(() => {
    if (initialData?.variants && initialData.variants.length > 0) {
      return initialData.variants.map((v) => ({
        id: v.id,
        sku: v.sku,
        color: v.color || { nameAr: 'لون موحد', nameEn: 'Standard', hex: '#800020' },
        size: v.size || 'Free Size',
        priceAdjustment: v.priceAdjustment ?? 0,
        stockQuantity: v.stockQuantity ?? 0,
        inStock: v.inStock ?? (v.stockQuantity > 0),
        variantImageUrl: v.variantImageUrl,
      }));
    }
    // Default 1 row for new product
    return [
      {
        id: `var_${Date.now()}_0`,
        sku: 'ROBY-NEW-01',
        color: { nameAr: 'لون موحد', nameEn: 'Standard', hex: '#800020' },
        size: 'Free Size',
        priceAdjustment: 0,
        stockQuantity: 10,
        inStock: true,
      },
    ];
  });

  // Submission & Validation States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Auto-generate slug from English title if empty
  const handleAutoSlug = () => {
    const generated = generateSlug(titleEn || titleAr);
    if (generated) {
      setSlug(generated);
    }
  };

  // Toggle category
  const toggleCategory = (catId: string) => {
    if (categoryIds.includes(catId)) {
      setCategoryIds(categoryIds.filter((id) => id !== catId));
    } else {
      setCategoryIds([...categoryIds, catId]);
    }
  };

  // ==========================================
  // Image Upload Handlers
  // ==========================================

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsUploadingImage(true);
    setFormError(null);

    const service = getStoreService();
    const newImages: string[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      try {
        // 1. Attempt upload via store service (Supabase Storage)
        if (service.uploadProductImage) {
          const res = await service.uploadProductImage(file);
          if (res?.url) {
            newImages.push(res.url);
            continue;
          }
        }
        // 2. Fallback to Data URL
        const dataUrl = await convertFileToDataUrl(file);
        newImages.push(dataUrl);
      } catch (err) {
        // Fallback on any error
        try {
          const dataUrl = await convertFileToDataUrl(file);
          newImages.push(dataUrl);
        } catch (readErr) {
          console.error('Failed to process image file:', readErr);
        }
      }
    }

    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
    }
    setIsUploadingImage(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAddExternalImage = () => {
    const trimmed = externalImageUrl.trim();
    if (!trimmed) return;
    if (!trimmed.startsWith('http') && !trimmed.startsWith('data:')) {
      setFormError('يرجى إدخال رابط صورة صالح يبدأ بـ http:// أو https://');
      return;
    }
    setImages((prev) => [...prev, trimmed]);
    setExternalImageUrl('');
  };

  const handleSetPrimaryImage = (index: number) => {
    if (index === 0) return;
    setImages((prev) => {
      const selected = prev[index];
      const rest = prev.filter((_, i) => i !== index);
      return [selected, ...rest];
    });
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  // ==========================================
  // Quick Cartesian Variant Generator Handlers
  // ==========================================

  const handleAddPresetColor = (preset: typeof PRESET_COLORS[0]) => {
    if (selectedGeneratorColors.some((c) => c.hex.toLowerCase() === preset.hex.toLowerCase())) {
      setSelectedGeneratorColors(
        selectedGeneratorColors.filter((c) => c.hex.toLowerCase() !== preset.hex.toLowerCase())
      );
    } else {
      setSelectedGeneratorColors([...selectedGeneratorColors, preset]);
    }
  };

  const handleAddCustomColor = () => {
    if (!customColorNameAr.trim() && !customColorNameEn.trim()) return;
    const newColor: VariantColor = {
      nameAr: customColorNameAr.trim() || 'لون مخصص',
      nameEn: customColorNameEn.trim() || 'Custom',
      hex: customColorHex || '#800020',
    };
    setSelectedGeneratorColors((prev) => [...prev, newColor]);
    setCustomColorNameAr('');
    setCustomColorNameEn('');
  };

  const handleToggleGeneratorSize = (size: string) => {
    if (selectedGeneratorSizes.includes(size)) {
      setSelectedGeneratorSizes(selectedGeneratorSizes.filter((s) => s !== size));
    } else {
      setSelectedGeneratorSizes([...selectedGeneratorSizes, size]);
    }
  };

  const handleAddCustomSize = () => {
    const trimmed = customSizeInput.trim();
    if (!trimmed) return;
    if (!selectedGeneratorSizes.includes(trimmed)) {
      setSelectedGeneratorSizes([...selectedGeneratorSizes, trimmed]);
    }
    setCustomSizeInput('');
  };

  const handleGenerateCartesianMatrix = () => {
    if (selectedGeneratorColors.length === 0 && selectedGeneratorSizes.length === 0) {
      setFormError('يرجى تحديد ألوان أو مقاسات لتوليد مصفوفة المتغيرات تلقائياً');
      return;
    }

    const generated = generateCartesianVariants({
      colors: selectedGeneratorColors,
      sizes: selectedGeneratorSizes,
      slug: slug || generateSlug(titleEn) || 'prod',
      defaultStock: 5,
      defaultPriceAdjustment: 0,
    });

    setVariants(generated);
    setFormSuccess(`تم توليد ${generated.length} متغير بنجاح طبقاً للألوان والمقاسات المحددة.`);
    setTimeout(() => setFormSuccess(null), 4000);
  };

  // ==========================================
  // Variant Matrix Table Row Handlers
  // ==========================================

  const handleAddManualVariant = () => {
    const newIndex = variants.length + 1;
    const newRow: GeneratedVariant = {
      id: `var_${Date.now()}_${newIndex}`,
      sku: `${slug ? slug.toUpperCase().slice(0, 6) : 'ROBY'}-VAR-${newIndex}`,
      color: { nameAr: 'لون جديد', nameEn: 'New Color', hex: '#800020' },
      size: 'Free Size',
      priceAdjustment: 0,
      stockQuantity: 5,
      inStock: true,
    };
    setVariants([...variants, newRow]);
  };

  const handleDuplicateVariant = (index: number) => {
    const source = variants[index];
    const newRow: GeneratedVariant = {
      ...source,
      id: `var_${Date.now()}_dup`,
      sku: `${source.sku}-COPY`,
    };
    const updated = [...variants];
    updated.splice(index + 1, 0, newRow);
    setVariants(updated);
  };

  const handleRemoveVariant = (index: number) => {
    if (variants.length <= 1) {
      setFormError('يجب أن يحتوي المنتج على متغير واحد على الأقل في المخزون');
      return;
    }
    setVariants(variants.filter((_, i) => i !== index));
  };

  const handleUpdateVariantField = <K extends keyof GeneratedVariant>(
    index: number,
    field: K,
    value: GeneratedVariant[K]
  ) => {
    setVariants((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      // auto sync inStock when stockQuantity changes
      if (field === 'stockQuantity') {
        const qty = Number(value);
        updated[index].inStock = qty > 0;
      }
      return updated;
    });
  };

  // ==========================================
  // Submit Form Handler
  // ==========================================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    // Client-side validations
    if (!titleAr.trim()) {
      setFormError('اسم المنتج بالعربية مطلوب');
      return;
    }
    if (!titleEn.trim()) {
      setFormError('اسم المنتج بالإنجليزية مطلوب');
      return;
    }
    const numBasePrice = Number(basePrice);
    if (!basePrice || isNaN(numBasePrice) || numBasePrice <= 0) {
      setFormError('السعر الأساسي يجب أن يكون رقماً موجباً أكبر من صفر');
      return;
    }

    let numDiscountPrice: number | undefined = undefined;
    if (discountPrice && discountPrice.trim()) {
      numDiscountPrice = Number(discountPrice);
      if (isNaN(numDiscountPrice) || numDiscountPrice <= 0) {
        setFormError('سعر الخصم يجب أن يكون رقماً موجباً');
        return;
      }
      if (numDiscountPrice >= numBasePrice) {
        setFormError('سعر الخصم المخفض يجب أن يكون أقل تماماً من السعر الأساسي');
        return;
      }
    }

    if (categoryIds.length === 0) {
      setFormError('يجب اختيار قسم واحد على الأقل من أقسام المتجر');
      return;
    }

    if (images.length === 0) {
      setFormError('يجب إضافة صورة واحدة على الأقل في معرض صور المنتج');
      return;
    }

    // Validate variant matrix
    const matrixValidation = validateVariantMatrix(variants);
    if (!matrixValidation.isValid) {
      setFormError(matrixValidation.errors.join(' | '));
      return;
    }

    setIsSubmitting(true);

    try {
      const finalSlug = slug.trim() || generateSlug(titleEn) || `prod-${Date.now()}`;
      const primaryCat = categories.find((c) => categoryIds.includes(c.id));
      const primaryCategorySlug = primaryCat?.slug || (categories[0]?.slug ?? 'womens-fashion');

      const parsedTags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);

      const payload: CreateProductInput = {
        titleAr: titleAr.trim(),
        titleEn: titleEn.trim(),
        slug: finalSlug,
        descriptionAr: descriptionAr.trim(),
        descriptionEn: descriptionEn.trim(),
        basePrice: numBasePrice,
        discountPrice: numDiscountPrice,
        currency: 'EGP',
        images,
        categoryIds,
        primaryCategorySlug,
        tags: parsedTags,
        isFeatured,
        isNewArrival,
        variants: variants.map((v) => ({
          id: v.id,
          sku: v.sku.trim(),
          color: v.color,
          size: v.size.trim(),
          priceAdjustment: Number(v.priceAdjustment) || 0,
          stockQuantity: Number(v.stockQuantity) || 0,
          inStock: Number(v.stockQuantity) > 0,
          variantImageUrl: v.variantImageUrl,
        })),
      };

      const service = getStoreService();
      let resultProduct: Product;

      if (mode === 'create') {
        resultProduct = await service.createProduct(payload);
        setFormSuccess('تم إنشاء المنتج وإدراجه بالكتالوج بنجاح!');
      } else {
        const prodId = initialData?.id || '';
        resultProduct = await service.updateProduct(prodId, payload);
        setFormSuccess('تم تحديث بيانات المنتج والمتغيرات بنجاح!');
      }

      if (onSuccess) {
        onSuccess(resultProduct);
      } else {
        setTimeout(() => {
          router.push('/admin/products');
          router.refresh();
        }, 800);
      }
    } catch (err: any) {
      setFormError(err?.message || 'حدث خطأ أثناء حفظ المنتج، يرجى مراجعة البيانات والمحاولة مجدداً');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8" dir="rtl">
      {/* Notifications */}
      {formError && (
        <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-3 animate-shake">
          <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
          <div className="flex-1">{formError}</div>
        </div>
      )}

      {formSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="flex-1">{formSuccess}</div>
        </div>
      )}

      {/* ==========================================
          Section 1: General Metadata (Bilingual)
      ========================================== */}
      <div className="bg-white rounded-3xl p-6 border border-rose-100 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-rose-100">
          <div>
            <h2 className="text-base font-bold font-serif text-charcoal-900">
              1. البيانات الأساسية وهوية المنتج
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              العناوين والوصف ثنائي اللغة مع توليد الرابط الدائم (Slug)
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#800020]/10 text-[#800020]">
            إلزامي
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Title Arabic */}
          <div>
            <label className="block text-xs font-bold text-charcoal-800 mb-2">
              اسم المنتج بالعربية <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={titleAr}
              onChange={(e) => setTitleAr(e.target.value)}
              placeholder="مثال: عباية كريب رويال مطرزة بخرز يدوي"
              className="w-full px-4 py-2.5 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-xs font-bold text-charcoal-900 placeholder:text-charcoal-400"
            />
          </div>

          {/* Title English */}
          <div>
            <label className="block text-xs font-bold text-charcoal-800 mb-2">
              اسم المنتج بالإنجليزية (English Title) <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={titleEn}
              onChange={(e) => setTitleEn(e.target.value)}
              placeholder="e.g. Royal Embroidered Crepe Abaya"
              className="w-full px-4 py-2.5 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-xs font-medium text-charcoal-900 placeholder:text-charcoal-400"
              dir="ltr"
            />
          </div>

          {/* Slug with Auto-generator */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-charcoal-800 mb-2">
              الرابط الدائم للمنتج (Slug) <span className="text-red-500">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="royal-embroidered-crepe-abaya"
                className="flex-1 px-4 py-2.5 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-xs font-mono text-charcoal-800"
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleAutoSlug}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-[#800020] text-xs font-bold transition-colors"
                title="توليد الرابط تلقائياً من الاسم الإنجليزي"
              >
                <Wand2 className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span>توليد تلقائي</span>
              </button>
            </div>
            <p className="text-[11px] text-charcoal-400 mt-1">
              يستخدم هذا الرابط في عنوان صفحة تفاصيل المنتج: <span dir="ltr">/products/{slug || '...'}</span>
            </p>
          </div>

          {/* Category Selector */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-charcoal-800 mb-2">
              أقسام المتجر المرتبطة <span className="text-red-500">*</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => {
                const isSelected = categoryIds.includes(cat.id);
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggleCategory(cat.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                      isSelected
                        ? 'bg-[#800020] text-white border-[#800020] shadow-xs'
                        : 'bg-white text-charcoal-700 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-[#D4AF37]" />}
                    <span>{cat.nameAr}</span>
                    <span className="text-[10px] opacity-70 font-mono">({cat.slug})</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Description Arabic */}
          <div>
            <label className="block text-xs font-bold text-charcoal-800 mb-2">
              الوصف التفصيلي بالعربية
            </label>
            <textarea
              rows={4}
              value={descriptionAr}
              onChange={(e) => setDescriptionAr(e.target.value)}
              placeholder="اكتبي تفاصيل خامة المنتج، العناية بالقماش، والمميزات الفاخرة..."
              className="w-full px-4 py-2.5 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-xs text-charcoal-800"
            />
          </div>

          {/* Description English */}
          <div>
            <label className="block text-xs font-bold text-charcoal-800 mb-2">
              الوصف التفصيلي بالإنجليزية (English Description)
            </label>
            <textarea
              rows={4}
              value={descriptionEn}
              onChange={(e) => setDescriptionEn(e.target.value)}
              placeholder="Detailed description of premium fabric, craftsmanship, and care instructions..."
              className="w-full px-4 py-2.5 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-xs text-charcoal-800"
              dir="ltr"
            />
          </div>

          {/* Tags */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-charcoal-800 mb-2">
              الكلمات المفتاحية والوسوم (Tags)
            </label>
            <input
              type="text"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="عبايات, فاخر, رمضاني, قطن-100, الأكثر-مبيعا (افصلي بين الكلمات بفاصلة)"
              className="w-full px-4 py-2.5 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-xs text-charcoal-800"
            />
          </div>

          {/* Toggles: Featured & New Arrival */}
          <div className="md:col-span-2 flex flex-wrap gap-6 pt-2">
            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isFeatured}
                onChange={(e) => setIsFeatured(e.target.checked)}
                className="w-4 h-4 accent-[#800020] rounded"
              />
              <span className="text-xs font-bold text-charcoal-800">
                عرض المنتج في قائمة "المختارات المميزة" بالصفحة الرئيسية
              </span>
            </label>

            <label className="inline-flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isNewArrival}
                onChange={(e) => setIsNewArrival(e.target.checked)}
                className="w-4 h-4 accent-[#800020] rounded"
              />
              <span className="text-xs font-bold text-charcoal-800">
                تمييز المنتج كـ "وصل حديثاً"
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* ==========================================
          Section 2: Pricing (Base & Discount)
      ========================================== */}
      <div className="bg-white rounded-3xl p-6 border border-rose-100 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-rose-100">
          <div>
            <h2 className="text-base font-bold font-serif text-charcoal-900">
              2. التسعير والعروض بالجنيه المصري (EGP)
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              السعر الأساسي وسعر الخصم مع التحقق التلقائي من صحة النسبة
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#D4AF37]/10 text-[#800020] border border-[#D4AF37]/30">
            EGP
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Base Price */}
          <div>
            <label className="block text-xs font-bold text-charcoal-800 mb-2">
              السعر الأصلي الأساسي (ج.م) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                min="1"
                step="0.01"
                required
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                placeholder="مثال: 1250"
                className="w-full pl-12 pr-4 py-2.5 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-sm font-bold text-charcoal-900"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-charcoal-400">
                ج.م
              </span>
            </div>
          </div>

          {/* Discount Price */}
          <div>
            <label className="block text-xs font-bold text-charcoal-800 mb-2">
              سعر التخفيض / العرض (اختياري)
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                step="0.01"
                value={discountPrice}
                onChange={(e) => setDiscountPrice(e.target.value)}
                placeholder="مثال: 950 (يجب أن يكون أقل من السعر الأصلي)"
                className="w-full pl-12 pr-4 py-2.5 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-sm font-bold text-charcoal-900"
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xs font-bold text-charcoal-400">
                ج.م
              </span>
            </div>
            {basePrice && discountPrice && Number(discountPrice) < Number(basePrice) && (
              <p className="text-[11px] font-bold text-emerald-700 mt-1">
                نسبة الخصم:{' '}
                {Math.round(((Number(basePrice) - Number(discountPrice)) / Number(basePrice)) * 100)}%
                (توفير {formatEGP(Number(basePrice) - Number(discountPrice))})
              </p>
            )}
          </div>
        </div>
      </div>

      {/* ==========================================
          Section 3: Dual-Mode Image Uploader
      ========================================== */}
      <div className="bg-white rounded-3xl p-6 border border-rose-100 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-rose-100">
          <div>
            <h2 className="text-base font-bold font-serif text-charcoal-900">
              3. معرض صور المنتج (مع السقوط التلقائي للذاكرة)
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              رفع متعدد للصور مع دعم Supabase Storage والسقوط التلقائي الآمن (Base64)
            </p>
          </div>
          <span className="text-xs font-bold text-charcoal-500 bg-rose-50 px-3 py-1 rounded-full border border-rose-100">
            {images.length} صور
          </span>
        </div>

        {/* Dropzone & File Picker */}
        <div className="border-2 border-dashed border-rose-200 rounded-3xl p-6 text-center hover:bg-rose-50/40 transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => handleFileUpload(e.target.files)}
          />

          <div className="max-w-md mx-auto space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-[#800020] flex items-center justify-center mx-auto">
              <UploadCloud className="w-6 h-6" />
            </div>
            <div>
              <button
                type="button"
                disabled={isUploadingImage}
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 rounded-xl bg-[#800020] hover:bg-[#5B0017] text-white text-xs font-bold transition-all shadow-xs disabled:opacity-50"
              >
                {isUploadingImage ? 'جارٍ رفع الصور...' : 'اختيار صور من الجهاز'}
              </button>
              <p className="text-[11px] text-charcoal-400 mt-2">
                يدعم صيغ JPG، PNG، WEBP. يمكن اختيار أكثر من صورة معاً.
              </p>
            </div>
          </div>
        </div>

        {/* External URL Adder */}
        <div className="flex gap-2">
          <input
            type="url"
            value={externalImageUrl}
            onChange={(e) => setExternalImageUrl(e.target.value)}
            placeholder="أو أدخلي رابط صورة مباشر (https://images.unsplash.com/...)"
            className="flex-1 px-4 py-2 rounded-2xl border border-rose-200 focus:outline-none focus:border-[#800020] text-xs font-mono"
            dir="ltr"
          />
          <button
            type="button"
            onClick={handleAddExternalImage}
            className="px-4 py-2 rounded-2xl bg-white border border-rose-200 hover:bg-rose-50 text-charcoal-800 text-xs font-bold transition-colors"
          >
            إضافة الرابط
          </button>
        </div>

        {/* Gallery Preview Grid */}
        {images.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 pt-2">
            {images.map((imgUrl, index) => {
              const isPrimary = index === 0;
              return (
                <div
                  key={`${imgUrl.slice(0, 30)}-${index}`}
                  className={`relative group rounded-2xl overflow-hidden border bg-white shadow-2xs ${
                    isPrimary ? 'border-[#800020] ring-2 ring-[#800020]/20' : 'border-rose-100'
                  }`}
                >
                  <div className="aspect-square relative overflow-hidden bg-rose-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={`Product image ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  </div>

                  {/* Primary Badge */}
                  {isPrimary && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#800020] text-white shadow-xs">
                      الرئيسية
                    </span>
                  )}

                  {/* Actions overlay */}
                  <div className="p-2 bg-white/95 border-t border-rose-100 flex items-center justify-between gap-1">
                    {!isPrimary ? (
                      <button
                        type="button"
                        onClick={() => handleSetPrimaryImage(index)}
                        className="text-[10px] font-bold text-[#800020] hover:underline"
                        title="تعيين كصورة الغلاف الرئيسية"
                      >
                        تعيين كرئيسية
                      </button>
                    ) : (
                      <span className="text-[10px] font-bold text-charcoal-500">غلاف الكتالوج</span>
                    )}

                    <button
                      type="button"
                      onClick={() => handleRemoveImage(index)}
                      className="p-1 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                      title="حذف الصورة"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-charcoal-400 text-center py-4">
            لم يتم رفع أي صور بعد. الصورة الأولى ستكون صورة الغلاف الرئيسية في الكتالوج.
          </p>
        )}
      </div>

      {/* ==========================================
          Section 4: Dynamic Variant Matrix Builder
      ========================================== */}
      <div className="bg-white rounded-3xl p-6 border border-rose-100 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-rose-100">
          <div>
            <h2 className="text-base font-bold font-serif text-charcoal-900">
              4. مصفوفة المتغيرات والألوان والمقاسات (Cartesian Variant Matrix)
            </h2>
            <p className="text-xs text-charcoal-500 mt-0.5">
              مولد سريع لحاصل الضرب الديكارتي (الألوان × المقاسات) مع إدارة المخزون وأكواد SKU
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAddManualVariant}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-rose-200 text-charcoal-700 hover:bg-rose-50 text-xs font-bold transition-colors"
            >
              <Plus className="w-3.5 h-3.5 text-[#800020]" />
              <span>إضافة صف يدوياً</span>
            </button>
          </div>
        </div>

        {/* Quick Cartesian Matrix Generator Panel */}
        <div className="p-5 rounded-2xl bg-rose-50/40 border border-rose-100 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-charcoal-900">
            <Sparkles className="w-4 h-4 text-[#D4AF37]" />
            <span>المولد التلقائي السريع للمتغيرات (Quick Generator)</span>
          </div>

          {/* Color Palettes Picker */}
          <div>
            <div className="text-[11px] font-bold text-charcoal-600 mb-2">
              أ) اختاري ألوان المنتج:
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((preset) => {
                const isSelected = selectedGeneratorColors.some(
                  (c) => c.hex.toLowerCase() === preset.hex.toLowerCase()
                );
                return (
                  <button
                    key={preset.hex}
                    type="button"
                    onClick={() => handleAddPresetColor(preset)}
                    className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-[#800020] text-white border-[#800020] shadow-2xs'
                        : 'bg-white text-charcoal-700 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/20"
                      style={{ backgroundColor: preset.hex }}
                    />
                    <span>{preset.nameAr}</span>
                  </button>
                );
              })}
            </div>

            {/* Custom Color Input */}
            <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-rose-100">
              <span className="text-[11px] text-charcoal-500 font-bold">لون مخصص:</span>
              <input
                type="color"
                value={customColorHex}
                onChange={(e) => setCustomColorHex(e.target.value)}
                className="w-8 h-8 rounded-lg cursor-pointer border border-rose-200 p-0.5"
              />
              <input
                type="text"
                placeholder="اسم اللون بالعربية"
                value={customColorNameAr}
                onChange={(e) => setCustomColorNameAr(e.target.value)}
                className="px-3 py-1 rounded-xl border border-rose-200 text-xs w-32"
              />
              <input
                type="text"
                placeholder="Color Name (EN)"
                value={customColorNameEn}
                onChange={(e) => setCustomColorNameEn(e.target.value)}
                className="px-3 py-1 rounded-xl border border-rose-200 text-xs w-32"
                dir="ltr"
              />
              <button
                type="button"
                onClick={handleAddCustomColor}
                className="px-3 py-1 rounded-xl bg-white border border-rose-200 text-xs font-bold text-charcoal-800 hover:bg-rose-50"
              >
                + إضافة اللون
              </button>
            </div>
          </div>

          {/* Sizes Picker */}
          <div>
            <div className="text-[11px] font-bold text-charcoal-600 mb-2">
              ب) اختاري المقاسات المطلوبة:
            </div>
            <div className="flex flex-wrap gap-2">
              {PRESET_SIZES.map((size) => {
                const isSelected = selectedGeneratorSizes.includes(size);
                return (
                  <button
                    key={size}
                    type="button"
                    onClick={() => handleToggleGeneratorSize(size)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                      isSelected
                        ? 'bg-[#800020] text-white border-[#800020] shadow-2xs'
                        : 'bg-white text-charcoal-700 border-rose-200 hover:bg-rose-50'
                    }`}
                  >
                    {size}
                  </button>
                );
              })}
            </div>

            {/* Custom Size Input */}
            <div className="flex items-center gap-2 mt-3 pt-2 border-t border-rose-100">
              <span className="text-[11px] text-charcoal-500 font-bold">مقاس مخصص:</span>
              <input
                type="text"
                placeholder="مثال: 140×200cm أو مقاس 42"
                value={customSizeInput}
                onChange={(e) => setCustomSizeInput(e.target.value)}
                className="px-3 py-1 rounded-xl border border-rose-200 text-xs w-48"
              />
              <button
                type="button"
                onClick={handleAddCustomSize}
                className="px-3 py-1 rounded-xl bg-white border border-rose-200 text-xs font-bold text-charcoal-800 hover:bg-rose-50"
              >
                + إضافة المقاس
              </button>
            </div>
          </div>

          {/* Generate Button */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleGenerateCartesianMatrix}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-[#800020] hover:bg-[#5B0017] text-white text-xs font-bold shadow-xs transition-all"
            >
              <Wand2 className="w-4 h-4 text-[#D4AF37]" />
              <span>توليد المتغيرات تلقائياً (Cartesian Product)</span>
            </button>
            <span className="text-[11px] text-charcoal-500 mr-3">
              سيقوم بإنشاء ({selectedGeneratorColors.length} ألوان × {selectedGeneratorSizes.length} مقاسات ={' '}
              {Math.max(1, selectedGeneratorColors.length || 1) * Math.max(1, selectedGeneratorSizes.length || 1)} متغير)
            </span>
          </div>
        </div>

        {/* Variant Matrix Table */}
        <div className="overflow-x-auto border border-rose-100 rounded-2xl">
          <table className="w-full text-right text-xs">
            <thead className="bg-rose-50/60 text-charcoal-700 font-bold border-b border-rose-100">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">اللون</th>
                <th className="p-3">المقاس</th>
                <th className="p-3">كود الصنف (SKU) *</th>
                <th className="p-3">فرق السعر (+/- ج.م)</th>
                <th className="p-3">كمية المخزون</th>
                <th className="p-3">الحالة</th>
                <th className="p-3 text-center">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-rose-50">
              {variants.map((v, index) => (
                <tr key={v.id || index} className="hover:bg-rose-50/30 transition-colors">
                  <td className="p-3 text-charcoal-400 font-mono text-[11px]">{index + 1}</td>

                  {/* Color Swatch & Names */}
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={v.color?.hex || '#800020'}
                        onChange={(e) =>
                          handleUpdateVariantField(index, 'color', {
                            ...v.color,
                            hex: e.target.value,
                          })
                        }
                        className="w-7 h-7 rounded-lg cursor-pointer border border-rose-200 p-0.5 shrink-0"
                      />
                      <div className="space-y-1">
                        <input
                          type="text"
                          value={v.color?.nameAr || ''}
                          onChange={(e) =>
                            handleUpdateVariantField(index, 'color', {
                              ...v.color,
                              nameAr: e.target.value,
                            })
                          }
                          placeholder="اللون بالعربية"
                          className="px-2 py-1 rounded-lg border border-rose-200 text-xs w-24 block"
                        />
                        <input
                          type="text"
                          value={v.color?.nameEn || ''}
                          onChange={(e) =>
                            handleUpdateVariantField(index, 'color', {
                              ...v.color,
                              nameEn: e.target.value,
                            })
                          }
                          placeholder="Color EN"
                          className="px-2 py-1 rounded-lg border border-rose-200 text-xs w-24 block font-mono"
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </td>

                  {/* Size */}
                  <td className="p-3">
                    <input
                      type="text"
                      value={v.size}
                      onChange={(e) => handleUpdateVariantField(index, 'size', e.target.value)}
                      placeholder="المقاس"
                      className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-xs w-24 font-bold text-charcoal-800"
                    />
                  </td>

                  {/* SKU */}
                  <td className="p-3">
                    <input
                      type="text"
                      required
                      value={v.sku}
                      onChange={(e) => handleUpdateVariantField(index, 'sku', e.target.value)}
                      placeholder="SKU"
                      className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-xs font-mono w-36 font-bold text-[#800020]"
                      dir="ltr"
                    />
                  </td>

                  {/* Price Adjustment */}
                  <td className="p-3">
                    <input
                      type="number"
                      step="1"
                      value={v.priceAdjustment}
                      onChange={(e) =>
                        handleUpdateVariantField(index, 'priceAdjustment', Number(e.target.value))
                      }
                      className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-xs w-20 font-bold text-center"
                    />
                  </td>

                  {/* Stock Quantity */}
                  <td className="p-3">
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={v.stockQuantity}
                      onChange={(e) =>
                        handleUpdateVariantField(index, 'stockQuantity', Number(e.target.value))
                      }
                      className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-xs w-20 font-bold text-center"
                    />
                  </td>

                  {/* inStock badge */}
                  <td className="p-3">
                    <span
                      className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                        v.stockQuantity > 0
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          : 'bg-red-50 text-red-800 border-red-200'
                      }`}
                    >
                      {v.stockQuantity > 0 ? `متوفر (${v.stockQuantity})` : 'نفد (0)'}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleDuplicateVariant(index)}
                        className="p-1.5 rounded-lg text-charcoal-600 hover:text-[#800020] hover:bg-rose-50 transition-colors"
                        title="تكرار هذا المتغير"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleRemoveVariant(index)}
                        className="p-1.5 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
                        title="حذف المتغير"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==========================================
          Section 5: Actions & Persistence
      ========================================== */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-6 bg-white rounded-3xl border border-rose-100 shadow-sm sticky bottom-4 z-20">
        <Link
          href="/admin/products"
          className="inline-flex items-center gap-2 text-xs font-bold text-charcoal-600 hover:text-[#800020] transition-colors"
        >
          <ArrowRight className="w-4 h-4" />
          <span>إلغاء والعودة لقائمة المنتجات</span>
        </Link>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-[#800020] hover:bg-[#5B0017] text-white text-xs font-bold shadow-md transition-all disabled:opacity-50"
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin text-[#D4AF37]" />
            ) : (
              <Save className="w-4 h-4 text-[#D4AF37]" />
            )}
            <span>
              {mode === 'create'
                ? isSubmitting
                  ? 'جارٍ حفظ وإدراج المنتج...'
                  : 'حفظ المنتج وإدراجه بالكتالوج'
                : isSubmitting
                ? 'جارٍ تحديث المنتج...'
                : 'حفظ التعديلات على المنتج'}
            </span>
          </button>
        </div>
      </div>
    </form>
  );
}
