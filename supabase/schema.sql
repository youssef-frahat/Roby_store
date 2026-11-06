-- ============================================================================
-- ROBY STORE — SUPABASE PRODUCTION RELATIONAL DATABASE SCHEMA
-- File: supabase/schema.sql
-- Covers: R1 (Relational Tables, Constraints, Indexes, RLS, Storage & Seeds)
-- ============================================================================

-- 0. EXTENSIONS & PREREQUISITES
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. TABLE DEFINITIONS
-- ============================================================================

-- 1.1 Categories Table (Hierarchical Category Tree)
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    icon_name TEXT NOT NULL DEFAULT 'Sparkles',
    parent_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    level INTEGER NOT NULL DEFAULT 0 CHECK (level >= 0),
    display_order INTEGER NOT NULL DEFAULT 0,
    product_count INTEGER NOT NULL DEFAULT 0 CHECK (product_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.2 Products Table
CREATE TABLE IF NOT EXISTS public.products (
    id TEXT PRIMARY KEY,
    slug TEXT NOT NULL UNIQUE,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    description_ar TEXT NOT NULL DEFAULT '',
    description_en TEXT NOT NULL DEFAULT '',
    base_price NUMERIC(10, 2) NOT NULL CHECK (base_price >= 0),
    discount_price NUMERIC(10, 2) CHECK (discount_price IS NULL OR (discount_price >= 0 AND discount_price < base_price)),
    currency TEXT NOT NULL DEFAULT 'EGP' CHECK (currency = 'EGP'),
    primary_category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    primary_category_slug TEXT NOT NULL,
    category_ids TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    rating NUMERIC(2, 1) NOT NULL DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
    review_count INTEGER NOT NULL DEFAULT 0 CHECK (review_count >= 0),
    is_featured BOOLEAN NOT NULL DEFAULT false,
    is_new_arrival BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.3 Product Variants Table (SKU, Color, Size, Stock)
CREATE TABLE IF NOT EXISTS public.product_variants (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    sku TEXT NOT NULL UNIQUE,
    color_name_ar TEXT NOT NULL,
    color_name_en TEXT NOT NULL,
    color_hex TEXT NOT NULL CHECK (color_hex ~* '^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$'),
    size TEXT NOT NULL,
    price_adjustment NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    price_override NUMERIC(10, 2) CHECK (price_override IS NULL OR price_override >= 0),
    stock_quantity INTEGER NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
    in_stock BOOLEAN NOT NULL DEFAULT true,
    variant_image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.4 Product Images Table
CREATE TABLE IF NOT EXISTS public.product_images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER NOT NULL DEFAULT 0,
    is_primary BOOLEAN NOT NULL DEFAULT false,
    alt_text TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.5 Orders Table (Customer Checkout & Social Commerce Records)
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL UNIQUE,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_alt_phone TEXT,
    customer_governorate TEXT NOT NULL,
    customer_city TEXT NOT NULL,
    delivery_address TEXT NOT NULL,
    customer_notes TEXT,
    customer_details JSONB NOT NULL,
    items JSONB NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    shipping_fee NUMERIC(10, 2) NOT NULL CHECK (shipping_fee >= 0),
    total_savings NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (total_savings >= 0),
    grand_total NUMERIC(10, 2) NOT NULL CHECK (grand_total >= 0),
    currency TEXT NOT NULL DEFAULT 'EGP',
    pricing_summary JSONB NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_dispatch' CHECK (
        status IN ('pending_dispatch', 'dispatched_whatsapp', 'confirmed', 'shipped', 'delivered', 'cancelled', 'cancelled_or_returned')
    ),
    dispatch_channel TEXT NOT NULL DEFAULT 'whatsapp' CHECK (
        dispatch_channel IN ('whatsapp', 'instagram', 'facebook', 'web')
    ),
    formatted_social_message TEXT NOT NULL DEFAULT '',
    whatsapp_direct_url TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.6 Store Settings Table (Singleton Configuration Row)
CREATE TABLE IF NOT EXISTS public.store_settings (
    id TEXT PRIMARY KEY DEFAULT 'default' CHECK (id = 'default'),
    store_name TEXT NOT NULL DEFAULT 'روبي ستور - Roby Store',
    store_name_en TEXT DEFAULT 'Roby Store',
    tagline TEXT NOT NULL DEFAULT 'أزياء حريمي ومفروشات راقية',
    whatsapp_number TEXT NOT NULL DEFAULT '201000000000',
    whatsapp_message_template TEXT DEFAULT 'مرحباً، أود تأكيد هذا الطلب من متجركم.',
    instagram_url TEXT DEFAULT 'https://instagram.com/roby_store',
    instagram_handle TEXT DEFAULT '@roby_store',
    facebook_url TEXT DEFAULT 'https://facebook.com/robystore.eg',
    messenger_url TEXT DEFAULT 'https://m.me/robystore.eg',
    tiktok_url TEXT DEFAULT 'https://tiktok.com/@roby_store',
    contact_phone TEXT DEFAULT '01000000000',
    contact_email TEXT DEFAULT 'contact@robystore.com',
    store_address TEXT DEFAULT 'القاهرة، جمهورية مصر العربية',
    currency TEXT NOT NULL DEFAULT 'ج.م',
    currency_en TEXT NOT NULL DEFAULT 'EGP',
    free_shipping_threshold NUMERIC(10, 2) DEFAULT 1500,
    enable_social_ordering BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.7 Promotional Banners Table
CREATE TABLE IF NOT EXISTS public.promotional_banners (
    id TEXT PRIMARY KEY,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL,
    subtitle_ar TEXT NOT NULL DEFAULT '',
    subtitle_en TEXT NOT NULL DEFAULT '',
    badge_text_ar TEXT,
    badge_text_en TEXT,
    button_text_ar TEXT NOT NULL,
    button_text_en TEXT NOT NULL,
    image_url TEXT NOT NULL,
    target_category_slug TEXT,
    target_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 1.8 Egyptian Governorates & Shipping Rates
CREATE TABLE IF NOT EXISTS public.governorates (
    code TEXT PRIMARY KEY,
    name_ar TEXT NOT NULL,
    name_en TEXT NOT NULL,
    shipping_fee NUMERIC(10, 2) NOT NULL CHECK (shipping_fee >= 0),
    shipping_zone INTEGER NOT NULL CHECK (shipping_zone BETWEEN 1 AND 4),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 2. PERFORMANCE INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_categories_parent_id ON public.categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories(slug);
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON public.categories(display_order);

CREATE INDEX IF NOT EXISTS idx_products_slug ON public.products(slug);
CREATE INDEX IF NOT EXISTS idx_products_primary_category_slug ON public.products(primary_category_slug);
CREATE INDEX IF NOT EXISTS idx_products_is_featured ON public.products(is_featured);
CREATE INDEX IF NOT EXISTS idx_products_is_new_arrival ON public.products(is_new_arrival);
CREATE INDEX IF NOT EXISTS idx_products_base_price ON public.products(base_price);
CREATE INDEX IF NOT EXISTS idx_products_created_at ON public.products(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_category_ids ON public.products USING GIN (category_ids);
CREATE INDEX IF NOT EXISTS idx_products_tags ON public.products USING GIN (tags);

CREATE INDEX IF NOT EXISTS idx_variants_product_id ON public.product_variants(product_id);
CREATE INDEX IF NOT EXISTS idx_variants_sku ON public.product_variants(sku);

CREATE INDEX IF NOT EXISTS idx_images_product_id ON public.product_images(product_id, display_order);

CREATE INDEX IF NOT EXISTS idx_orders_order_id ON public.orders(order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_customer_phone ON public.orders(customer_phone);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- ============================================================================
-- 3. STORED FUNCTIONS & TRIGGERS (ACID INVENTORY DEDUCTION)
-- ============================================================================

-- Function to safely decrement stock atomically during checkout
CREATE OR REPLACE FUNCTION public.decrement_variant_stock(p_sku TEXT, p_quantity INTEGER)
RETURNS VOID AS $$
BEGIN
    UPDATE public.product_variants
    SET stock_quantity = GREATEST(0, stock_quantity - p_quantity),
        in_stock = (GREATEST(0, stock_quantity - p_quantity) > 0),
        updated_at = timezone('utc'::text, now())
    WHERE sku = p_sku;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.promotional_banners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.governorates ENABLE ROW LEVEL SECURITY;

-- 4.1 Catalog Public Read Policies (Allow anonymous storefront visitors to view products)
CREATE POLICY "Public Read: Categories" ON public.categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read: Products" ON public.products FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read: Product Variants" ON public.product_variants FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read: Product Images" ON public.product_images FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read: Store Settings" ON public.store_settings FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read: Promotional Banners" ON public.promotional_banners FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "Public Read: Governorates" ON public.governorates FOR SELECT TO anon, authenticated USING (true);

-- 4.2 Customer Checkout Order Insertion
CREATE POLICY "Public Checkout: Insert Orders" ON public.orders FOR INSERT TO anon, authenticated WITH CHECK (true);

-- 4.3 Administrator Full Access (Authenticated users or Service Role)
-- Categories
CREATE POLICY "Admin Full Access: Categories" ON public.categories FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Products
CREATE POLICY "Admin Full Access: Products" ON public.products FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Product Variants
CREATE POLICY "Admin Full Access: Product Variants" ON public.product_variants FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Product Images
CREATE POLICY "Admin Full Access: Product Images" ON public.product_images FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Orders (Only Admin can view, update, delete order details)
CREATE POLICY "Admin Full Access: Orders" ON public.orders FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Store Settings
CREATE POLICY "Admin Full Access: Store Settings" ON public.store_settings FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Promotional Banners
CREATE POLICY "Admin Full Access: Promotional Banners" ON public.promotional_banners FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Governorates
CREATE POLICY "Admin Full Access: Governorates" ON public.governorates FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 5. SUPABASE STORAGE BUCKET CONFIGURATION (`product-images`)
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'product-images',
    'product-images',
    true,
    5242880, -- 5 Megabytes
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 5242880,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'];

-- Storage RLS Policies
CREATE POLICY "Public Storage Read: View Product Images"
ON storage.objects FOR SELECT TO public USING (bucket_id = 'product-images');

CREATE POLICY "Admin Storage Insert: Upload Product Images"
ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Admin Storage Update: Modify Product Images"
ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'product-images');

CREATE POLICY "Admin Storage Delete: Remove Product Images"
ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'product-images');

-- ============================================================================
-- 6. FULL CATALOG SEED DATA (Exact match to src/data/)
-- ============================================================================

-- 6.1 Seed Categories
INSERT INTO public.categories (id, name_ar, name_en, slug, description, image_url, icon_name, parent_id, level, display_order, product_count)
VALUES
('cat_womens_fashion', 'ملابس حريمي', 'Women''s Fashion', 'womens-fashion', 'أحدث صيحات الموضة النسائية، عبايات راقية، فساتين أنيقة، وملابس بيت مريحة بأعلى جودة', 'https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=800&q=80', 'Sparkles', NULL, 0, 1, 24),
('cat_home_textiles', 'مفروشات ومنسوجات منزلية', 'Home Textiles', 'home-textiles', 'مفروشات قطنية فاخرة، أطقم سرير، ألحفة، ستائر، وخداديات لإضفاء الدفء على منزلك', 'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=800&q=80', 'Home', NULL, 0, 2, 30),
('cat_abayas', 'عبايات وقفاطين', 'Abayas & Kaftans', 'abayas-and-kaftans', 'عبايات خليجية، كاجوال وسواريه مطرزة بأعلى خامات الكريب والحرير', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80', 'Shirt', 'cat_womens_fashion', 1, 1, 10),
('cat_dresses', 'فساتين محتشمة', 'Modest Dresses', 'modest-dresses', 'فساتين طويلة بتصميمات عصرية تناسب كل الخروجات والمناسبات', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80', 'HeartHandshake', 'cat_womens_fashion', 1, 2, 8),
('cat_scarves', 'طرح وشالات', 'Hijabs & Scarves', 'hijabs-and-scarves', 'طرح شيفون، كريب، وحرير تركي بألوان ونقشات تناسب كل الإطلالات', 'https://images.unsplash.com/photo-1609357605129-26f69add5d6e?auto=format&fit=crop&w=800&q=80', 'Layers', 'cat_womens_fashion', 1, 3, 6),
('cat_bedding', 'ملايات وأطقم سرير', 'Bedding & Bed Sheets', 'bedding-and-sheets', 'أطقم ملايات قطن مصري 100% مطرزة ومطبوعة بجميع المقاسات', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80', 'BedDouble', 'cat_home_textiles', 1, 1, 14),
('cat_quilts', 'ألحفة ومفارش سرير', 'Duvet Covers & Quilts', 'duvet-covers-and-quilts', 'ألحفة فيبر دبل وجهين ومفارش عرائس فاخرة بأجود خامات المايكروفايبر', 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80', 'Feather', 'cat_home_textiles', 1, 2, 9),
('cat_cushions', 'خداديات وأغطية كنب', 'Cushions & Throws', 'cushions-and-throws', 'كفرات كنب وخداديات قطيفة وشانيليا بألوان مبهجة تناسب غرفة المعيشة', 'https://images.unsplash.com/photo-1584100936730-80415a77bcbf?auto=format&fit=crop&w=800&q=80', 'Armchair', 'cat_home_textiles', 1, 3, 7)
ON CONFLICT (id) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    slug = EXCLUDED.slug,
    description = EXCLUDED.description,
    image_url = EXCLUDED.image_url,
    icon_name = EXCLUDED.icon_name,
    parent_id = EXCLUDED.parent_id,
    level = EXCLUDED.level,
    display_order = EXCLUDED.display_order,
    product_count = EXCLUDED.product_count;

-- 6.2 Seed Products
INSERT INTO public.products (id, slug, title_ar, title_en, description_ar, description_en, base_price, discount_price, currency, primary_category_id, primary_category_slug, category_ids, tags, rating, review_count, is_featured, is_new_arrival, created_at, updated_at)
VALUES
(
    'prod_abaya_royal_crepe',
    'royal-embroidered-crepe-abaya',
    'عباية كريب رويال مطرزة يدوياً',
    'Royal Hand-Embroidered Crepe Abaya',
    'عباية خليجية أنيقة مصنوعة من أجود خامات كريب رويال الكوري الفاخر، تتميز بتطريز يدوي متقن على الأكمام والصدر، قصة واسعة مريحة وعملية تناسب المناسبات والزيارات الرسمية.',
    'Elegant Gulf-style abaya made from premium Korean Royal Crepe fabric. Features intricate hand-embroidery on sleeves and chest with a comfortable modest cut.',
    1250.00,
    950.00,
    'EGP',
    'cat_abayas',
    'abayas-and-kaftans',
    ARRAY['cat_womens_fashion', 'cat_abayas'],
    ARRAY['bestseller', 'ramadan-collection', 'featured', 'abaya'],
    4.9,
    38,
    true,
    true,
    '2026-10-01T10:00:00Z',
    '2026-10-25T14:30:00Z'
),
(
    'prod_01',
    'luxury-silk-abaya',
    'عباية حرير فاخرة',
    'Luxury Silk Abaya',
    'عباية مصنوعة من الحرير الطبيعي الناعم بقصة ملكية واسعة وتطريز فاخر.',
    'Abaya crafted from natural silk with elegant royal cut and delicate embroidery.',
    800.00,
    650.00,
    'EGP',
    'cat_abayas',
    'abayas-and-kaftans',
    ARRAY['cat_womens_fashion', 'cat_abayas'],
    ARRAY['luxury', 'abaya', 'featured'],
    4.9,
    28,
    true,
    true,
    '2026-10-28T00:00:00Z',
    '2026-10-28T00:00:00Z'
),
(
    'prod_bedsheet_egyptian_cotton',
    'luxury-egyptian-cotton-bedsheet-set',
    'طقم ملاية قطن مصري 100% تطريز فاخر (5 قطع)',
    'Luxury 100% Egyptian Cotton Bed Sheet Set (5 Pcs)',
    'طقم ملاية مصنوع من أجود خيوط القطن المصري طويل التيلة بعدد خيوط 400 غرزة لنعومة لا تضاهى وملمس حريري بارد في الصيف ودافيء في الشتاء. يشتمل على: ملاية أستيك + كيس لحاف + 2 كيس مخدة + 2 كيس خدادية.',
    '400 thread-count 100% long-staple Egyptian cotton bedding set. Includes fitted sheet, duvet cover, 2 pillowcases, and 2 cushion covers.',
    850.00,
    690.00,
    'EGP',
    'cat_bedding',
    'bedding-and-sheets',
    ARRAY['cat_home_textiles', 'cat_bedding'],
    ARRAY['bestseller', 'cotton-100', 'home-luxury', 'Cotton'],
    4.8,
    52,
    true,
    false,
    '2026-10-05T12:00:00Z',
    '2026-10-26T16:00:00Z'
),
(
    'prod_dress_floral_chiffon',
    'modest-floral-chiffon-dress',
    'فستان شيفون طويل مشجر بأكمام واسعة',
    'Modest Long Floral Chiffon Dress',
    'فستان محتشم بقصة واسعة ومريح مبطن بالكامل بخامة ناعمة، يتميز بنقوشات زهور رقيقة وحزام خصر لضبط المقاس.',
    'Modest flowy floral dress fully lined with soft breathable fabric. Features wide balloon sleeves and matching waist belt.',
    980.00,
    750.00,
    'EGP',
    'cat_dresses',
    'modest-dresses',
    ARRAY['cat_womens_fashion', 'cat_dresses'],
    ARRAY['summer-collection', 'dresses', 'bestseller'],
    4.7,
    27,
    true,
    true,
    '2026-10-10T09:00:00Z',
    '2026-10-27T11:00:00Z'
),
(
    'prod_quilt_double_face',
    'luxury-double-face-microfiber-quilt',
    'لحاف فيبر وجهين مايكروفايبر حراري',
    'Luxury Double-Faced Thermal Microfiber Quilt',
    'لحاف شتوي دافي وخفيف الوزن بحشوة فيبر كوري معالج ضد البكتيريا وجهين بلونين مختلفين لتغيير ديكور الغرفة بسهولة.',
    'Warm lightweight winter quilt with anti-bacterial Korean fiber filling. Double-faced dual-color design for easy room styling.',
    1400.00,
    NULL,
    'EGP',
    'cat_quilts',
    'duvet-covers-and-quilts',
    ARRAY['cat_home_textiles', 'cat_quilts'],
    ARRAY['winter-essentials', 'luxury-quilt'],
    4.9,
    19,
    false,
    true,
    '2026-10-15T14:00:00Z',
    '2026-10-27T18:00:00Z'
)
ON CONFLICT (id) DO UPDATE SET
    slug = EXCLUDED.slug,
    title_ar = EXCLUDED.title_ar,
    title_en = EXCLUDED.title_en,
    description_ar = EXCLUDED.description_ar,
    description_en = EXCLUDED.description_en,
    base_price = EXCLUDED.base_price,
    discount_price = EXCLUDED.discount_price,
    primary_category_id = EXCLUDED.primary_category_id,
    primary_category_slug = EXCLUDED.primary_category_slug,
    category_ids = EXCLUDED.category_ids,
    tags = EXCLUDED.tags,
    rating = EXCLUDED.rating,
    review_count = EXCLUDED.review_count,
    is_featured = EXCLUDED.is_featured,
    is_new_arrival = EXCLUDED.is_new_arrival,
    updated_at = EXCLUDED.updated_at;

-- 6.3 Seed Product Variants
INSERT INTO public.product_variants (id, product_id, sku, color_name_ar, color_name_en, color_hex, size, price_adjustment, stock_quantity, in_stock)
VALUES
-- Variants for prod_abaya_royal_crepe
('var_aby_blk_m', 'prod_abaya_royal_crepe', 'ROBY-ABY-01-BLK-M', 'أسود ملكي', 'Royal Black', '#111111', 'M', 0.00, 6, true),
('var_aby_blk_l', 'prod_abaya_royal_crepe', 'ROBY-ABY-01-BLK-L', 'أسود ملكي', 'Royal Black', '#111111', 'L', 0.00, 4, true),
('var_aby_blk_xl', 'prod_abaya_royal_crepe', 'ROBY-ABY-01-BLK-XL', 'أسود ملكي', 'Royal Black', '#111111', 'XL', 50.00, 2, true),
('var_aby_emr_m', 'prod_abaya_royal_crepe', 'ROBY-ABY-01-EMR-M', 'أخضر زمردي', 'Emerald Green', '#046307', 'M', 0.00, 3, true),
('var_aby_emr_l', 'prod_abaya_royal_crepe', 'ROBY-ABY-01-EMR-L', 'أخضر زمردي', 'Emerald Green', '#046307', 'L', 0.00, 0, false),
('var_aby_nvy_l', 'prod_abaya_royal_crepe', 'ROBY-ABY-01-NVY-L', 'كحلي داكن', 'Deep Navy', '#0F1E36', 'L', 0.00, 5, true),

-- Variants for prod_01
('var_01', 'prod_01', 'ROBY-ABY-BLK-M', 'أسود ملكي', 'Royal Black', '#1A1A1A', 'M', 50.00, 5, true),
('var_02', 'prod_01', 'ROBY-ABY-ROS-L', 'وردي مغبر', 'Dusty Rose', '#D4A5A5', 'L', 50.00, 2, true),

-- Variants for prod_bedsheet_egyptian_cotton
('var_shet_wht_sgl', 'prod_bedsheet_egyptian_cotton', 'ROBY-SHT-01-WHT-120', 'أبيض لؤلؤي', 'Pearl White', '#FDFBF7', '120x200cm (مفرد)', 0.00, 10, true),
('var_shet_wht_qin', 'prod_bedsheet_egyptian_cotton', 'ROBY-SHT-01-WHT-160', 'أبيض لؤلؤي', 'Pearl White', '#FDFBF7', '160x200cm (كوين)', 80.00, 8, true),
('var_shet_wht_kng', 'prod_bedsheet_egyptian_cotton', 'ROBY-SHT-01-WHT-180', 'أبيض لؤلؤي', 'Pearl White', '#FDFBF7', '180x200cm (كينج)', 150.00, 5, true),
('var_shet_ros_qin', 'prod_bedsheet_egyptian_cotton', 'ROBY-SHT-01-ROS-160', 'وردي كشمير', 'Cashmere Rose', '#DCAE96', '160x200cm (كوين)', 80.00, 6, true),
('var_shet_ros_kng', 'prod_bedsheet_egyptian_cotton', 'ROBY-SHT-01-ROS-180', 'وردي كشمير', 'Cashmere Rose', '#DCAE96', '180x200cm (كينج)', 150.00, 0, false),
('var_shet_sag_kng', 'prod_bedsheet_egyptian_cotton', 'ROBY-SHT-01-SAG-180', 'أخضر ميرمية', 'Sage Green', '#9CAF88', '180x200cm (كينج)', 150.00, 4, true),

-- Variants for prod_dress_floral_chiffon
('var_drs_blu_s', 'prod_dress_floral_chiffon', 'ROBY-DRS-02-BLU-S', 'أزرق سماوي', 'Sky Blue', '#87CEEB', 'S', 0.00, 5, true),
('var_drs_blu_m', 'prod_dress_floral_chiffon', 'ROBY-DRS-02-BLU-M', 'أزرق سماوي', 'Sky Blue', '#87CEEB', 'M', 0.00, 8, true),
('var_drs_blu_l', 'prod_dress_floral_chiffon', 'ROBY-DRS-02-BLU-L', 'أزرق سماوي', 'Sky Blue', '#87CEEB', 'L', 0.00, 3, true),
('var_drs_ros_m', 'prod_dress_floral_chiffon', 'ROBY-DRS-02-ROS-M', 'وردي باستيل', 'Pastel Pink', '#FFD1DC', 'M', 0.00, 4, true),

-- Variants for prod_quilt_double_face
('var_qlt_gry_kng', 'prod_quilt_double_face', 'ROBY-QLT-03-GRY-240', 'رمادي / بيج', 'Grey / Beige', '#808080', '240x260cm (كينج كبير)', 0.00, 7, true),
('var_qlt_bur_kng', 'prod_quilt_double_face', 'ROBY-QLT-03-BUR-240', 'نبيتي / كشمير', 'Burgundy / Rose', '#800020', '240x260cm (كينج كبير)', 0.00, 5, true)
ON CONFLICT (id) DO UPDATE SET
    sku = EXCLUDED.sku,
    color_name_ar = EXCLUDED.color_name_ar,
    color_name_en = EXCLUDED.color_name_en,
    color_hex = EXCLUDED.color_hex,
    size = EXCLUDED.size,
    price_adjustment = EXCLUDED.price_adjustment,
    stock_quantity = EXCLUDED.stock_quantity,
    in_stock = EXCLUDED.in_stock;

-- 6.4 Seed Product Images
INSERT INTO public.product_images (product_id, image_url, display_order, is_primary)
VALUES
('prod_abaya_royal_crepe', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80', 0, true),
('prod_abaya_royal_crepe', 'https://images.unsplash.com/photo-1567401893414-76b7b1e5a7a5?auto=format&fit=crop&w=800&q=80', 1, false),
('prod_01', 'https://images.unsplash.com/photo-1583391733956-3750e0ff4e8b?auto=format&fit=crop&w=800&q=80', 0, true),
('prod_bedsheet_egyptian_cotton', 'https://images.unsplash.com/photo-1522771739844-6a9f6d5f14af?auto=format&fit=crop&w=800&q=80', 0, true),
('prod_bedsheet_egyptian_cotton', 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80', 1, false),
('prod_dress_floral_chiffon', 'https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=800&q=80', 0, true),
('prod_dress_floral_chiffon', 'https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=800&q=80', 1, false),
('prod_quilt_double_face', 'https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?auto=format&fit=crop&w=800&q=80', 0, true);

-- 6.5 Seed Store Settings
INSERT INTO public.store_settings (
    id, store_name, store_name_en, tagline, whatsapp_number, whatsapp_message_template,
    instagram_url, instagram_handle, facebook_url, messenger_url, tiktok_url,
    contact_phone, contact_email, store_address, currency, currency_en,
    free_shipping_threshold, enable_social_ordering
)
VALUES (
    'default',
    'روبي ستور - Roby Store',
    'Roby Store',
    'أزياء حريمي ومفروشات راقية',
    '201000000000',
    'مرحباً، أود تأكيد هذا الطلب من متجركم.',
    'https://instagram.com/roby_store',
    '@roby_store',
    'https://facebook.com/robystore.eg',
    'https://m.me/robystore.eg',
    'https://tiktok.com/@roby_store',
    '01000000000',
    'contact@robystore.com',
    'القاهرة، جمهورية مصر العربية',
    'ج.م',
    'EGP',
    1500.00,
    true
)
ON CONFLICT (id) DO UPDATE SET
    store_name = EXCLUDED.store_name,
    store_name_en = EXCLUDED.store_name_en,
    tagline = EXCLUDED.tagline,
    whatsapp_number = EXCLUDED.whatsapp_number,
    whatsapp_message_template = EXCLUDED.whatsapp_message_template,
    instagram_url = EXCLUDED.instagram_url,
    instagram_handle = EXCLUDED.instagram_handle,
    facebook_url = EXCLUDED.facebook_url,
    messenger_url = EXCLUDED.messenger_url,
    tiktok_url = EXCLUDED.tiktok_url,
    contact_phone = EXCLUDED.contact_phone,
    contact_email = EXCLUDED.contact_email,
    store_address = EXCLUDED.store_address,
    currency = EXCLUDED.currency,
    currency_en = EXCLUDED.currency_en,
    free_shipping_threshold = EXCLUDED.free_shipping_threshold,
    enable_social_ordering = EXCLUDED.enable_social_ordering;

-- 6.6 Seed Promotional Banners
INSERT INTO public.promotional_banners (id, title_ar, title_en, subtitle_ar, subtitle_en, badge_text_ar, badge_text_en, button_text_ar, button_text_en, image_url, target_category_slug, is_active, display_order)
VALUES
(
    'banner_hero_winter',
    'تألقي بأرقى العبايات والفساتين المحتشمة',
    'Discover Luxury Modest Fashion & Abayas',
    'خصومات حصرية تبدأ من 25% على تشكيلة الموسم الجديدة بالكامل',
    'Exclusive discounts starting from 25% on our new seasonal collection',
    'عرض الموسم',
    'Seasonal Offer',
    'تسوقي العبايات الآن',
    'Shop Abayas Now',
    'https://images.unsplash.com/photo-1490481651871-ab68de25d43d?auto=format&fit=crop&w=1600&q=80',
    'abayas-and-kaftans',
    true,
    1
),
(
    'banner_home_linen',
    'جددي غرفتك بنعومة القطن المصري الفاخر',
    'Transform Your Home with Egyptian Cotton',
    'أطقم سرير ومفارش عرائس بخامات قطنية 100% ومقاسات تناسب جميع الأسرّة',
    '100% Egyptian cotton bed sheets and luxury duvets',
    'الأكثر مبيعاً',
    'Best Seller',
    'تصفحي المفروشات',
    'Explore Bedding',
    'https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=1600&q=80',
    'bedding-and-sheets',
    true,
    2
)
ON CONFLICT (id) DO UPDATE SET
    title_ar = EXCLUDED.title_ar,
    title_en = EXCLUDED.title_en,
    subtitle_ar = EXCLUDED.subtitle_ar,
    subtitle_en = EXCLUDED.subtitle_en,
    image_url = EXCLUDED.image_url,
    target_category_slug = EXCLUDED.target_category_slug,
    is_active = EXCLUDED.is_active,
    display_order = EXCLUDED.display_order;

-- 6.7 Seed Egyptian Governorates & Rates
INSERT INTO public.governorates (code, name_ar, name_en, shipping_fee, shipping_zone)
VALUES
('Cairo', 'القاهرة', 'Cairo', 50.00, 1),
('Giza', 'الجيزة', 'Giza', 50.00, 1),
('Alexandria', 'الإسكندرية', 'Alexandria', 65.00, 2),
('Qaliubiya', 'القليوبية', 'Qaliubiya', 65.00, 2),
('Sharkia', 'الشرقية', 'Sharkia', 65.00, 2),
('Dakahlia', 'الدقهلية', 'Dakahlia', 65.00, 2),
('Gharbiya', 'الغربية', 'Gharbiya', 65.00, 2),
('Menofia', 'المنوفية', 'Menofia', 65.00, 2),
('Beheira', 'البحيرة', 'Beheira', 65.00, 2),
('Damietta', 'دمياط', 'Damietta', 65.00, 2),
('Kafr Al-Sheikh', 'كفر الشيخ', 'Kafr Al-Sheikh', 65.00, 2),
('Port Said', 'بورسعيد', 'Port Said', 65.00, 2),
('Ismailia', 'الإسماعيلية', 'Ismailia', 65.00, 2),
('Suez', 'السويس', 'Suez', 65.00, 2),
('Fayoum', 'الفيوم', 'Fayoum', 80.00, 3),
('Beni Suef', 'بني سويف', 'Beni Suef', 80.00, 3),
('Minya', 'المنيا', 'Minya', 80.00, 3),
('Assiut', 'أسيوط', 'Assiut', 80.00, 3),
('Sohag', 'سوهاج', 'Sohag', 80.00, 3),
('Qena', 'قنا', 'Qena', 80.00, 3),
('Luxor', 'الأقصر', 'Luxor', 80.00, 3),
('Aswan', 'أسوان', 'Aswan', 80.00, 3),
('Red Sea', 'البحر الأحمر', 'Red Sea', 100.00, 4),
('New Valley', 'الوادي الجديد', 'New Valley', 100.00, 4),
('Matrouh', 'مطروح', 'Matrouh', 100.00, 4),
('North Sinai', 'شمال سيناء', 'North Sinai', 100.00, 4),
('South Sinai', 'جنوب سيناء', 'South Sinai', 100.00, 4)
ON CONFLICT (code) DO UPDATE SET
    name_ar = EXCLUDED.name_ar,
    name_en = EXCLUDED.name_en,
    shipping_fee = EXCLUDED.shipping_fee,
    shipping_zone = EXCLUDED.shipping_zone;

-- ============================================================================
-- END OF SCHEMA SCRIPT
-- ============================================================================
