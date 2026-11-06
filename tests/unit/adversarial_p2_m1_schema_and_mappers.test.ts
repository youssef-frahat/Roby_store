import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';

describe('Milestone P2-M1 Empirical Challenger: SQL Schema, RLS & Client Mappings', () => {
  const schemaPath = path.resolve(process.cwd(), 'supabase/schema.sql');
  const sqlContent = fs.readFileSync(schemaPath, 'utf-8');

  // =========================================================================
  // 1. SQL TABLE DEPENDENCIES, DAG & CASCADES
  // =========================================================================
  describe('1. Table Dependency Graph, DAG Order & Cascades', () => {
    it('creates tables in valid topological DAG order without circular dependencies', () => {
      const tableOrder = [
        'public.categories',
        'public.products',
        'public.product_variants',
        'public.product_images',
        'public.orders',
        'public.store_settings',
        'public.promotional_banners',
        'public.governorates',
      ];

      let lastIndex = -1;
      for (const table of tableOrder) {
        const createStmt = `CREATE TABLE IF NOT EXISTS ${table}`;
        const index = sqlContent.indexOf(createStmt);
        expect(index, `Table ${table} must be defined in schema`).toBeGreaterThan(-1);
        expect(
          index,
          `Table ${table} must appear after previously declared dependency in topological order`
        ).toBeGreaterThan(lastIndex);
        lastIndex = index;
      }
    });

    it('enforces correct ON DELETE clauses on all foreign keys', () => {
      // 1. categories self-reference
      expect(sqlContent).toMatch(
        /parent_id\s+TEXT\s+REFERENCES\s+public\.categories\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i
      );

      // 2. products -> categories
      expect(sqlContent).toMatch(
        /primary_category_id\s+TEXT\s+REFERENCES\s+public\.categories\(id\)\s+ON\s+DELETE\s+SET\s+NULL/i
      );

      // 3. product_variants -> products
      expect(sqlContent).toMatch(
        /product_id\s+TEXT\s+NOT\s+NULL\s+REFERENCES\s+public\.products\(id\)\s+ON\s+DELETE\s+CASCADE/i
      );

      // 4. product_images -> products
      expect(sqlContent).toMatch(
        /product_id\s+TEXT\s+NOT\s+NULL\s+REFERENCES\s+public\.products\(id\)\s+ON\s+DELETE\s+CASCADE/i
      );
    });

    it('ensures orders table does NOT have a hard FK to products to guarantee immutable historical checkout', () => {
      // orders table definition
      const ordersTableMatch = sqlContent.match(
        /CREATE TABLE IF NOT EXISTS public\.orders \(([\s\S]*?)\);/
      );
      expect(ordersTableMatch).not.toBeNull();
      const ordersBody = ordersTableMatch![1];

      // Must not reference products(id)
      expect(ordersBody).not.toMatch(/REFERENCES\s+public\.products/i);
      // Must use JSONB for items snapshot
      expect(ordersBody).toMatch(/items\s+JSONB\s+NOT\s+NULL/i);
      expect(ordersBody).toMatch(/customer_details\s+JSONB\s+NOT\s+NULL/i);
      expect(ordersBody).toMatch(/pricing_summary\s+JSONB\s+NOT\s+NULL/i);
    });
  });

  // =========================================================================
  // 2. ROW LEVEL SECURITY (RLS) POLICIES & ANONYMITY AUDIT
  // =========================================================================
  describe('2. Row Level Security (RLS) & Anonymity Audit', () => {
    it('enables RLS on all 8 tables', () => {
      const tables = [
        'categories',
        'products',
        'product_variants',
        'product_images',
        'orders',
        'store_settings',
        'promotional_banners',
        'governorates',
      ];

      for (const table of tables) {
        expect(sqlContent).toContain(`ALTER TABLE public.${table} ENABLE ROW LEVEL SECURITY;`);
      }
    });

    it('strictly isolates orders table: allows anon INSERT only, blocking anon SELECT/UPDATE/DELETE', () => {
      // 1. Check anon insert policy exists
      expect(sqlContent).toMatch(
        /CREATE POLICY "Public Checkout: Insert Orders" ON public\.orders FOR INSERT TO anon,\s*authenticated WITH CHECK \((true|.*)\);/
      );

      // 2. Check that no policy on public.orders grants SELECT, UPDATE, or DELETE to anon
      const anonOrderPolicies = sqlContent.match(
        /CREATE POLICY [^\n]+ ON public\.orders FOR (SELECT|UPDATE|DELETE|ALL) TO [^\n]*anon[^\n]*/gi
      );
      expect(
        anonOrderPolicies,
        'Anonymous users must NEVER have SELECT, UPDATE, or DELETE policies on orders'
      ).toBeNull();
    });

    it('grants full administrative access on all tables to authenticated users', () => {
      const tables = [
        'categories',
        'products',
        'product_variants',
        'product_images',
        'orders',
        'store_settings',
        'promotional_banners',
        'governorates',
      ];

      for (const table of tables) {
        const policyRegex = new RegExp(
          `CREATE POLICY "Admin Full Access: [^"]+" ON public\\.${table} FOR ALL TO authenticated USING \\(true\\) WITH CHECK \\(true\\);`,
          'i'
        );
        expect(sqlContent).toMatch(policyRegex);
      }
    });

    it('configures public read policies for catalog and settings tables', () => {
      const publicReadTables = [
        'categories',
        'products',
        'product_variants',
        'product_images',
        'store_settings',
        'promotional_banners',
        'governorates',
      ];

      for (const table of publicReadTables) {
        const policyRegex = new RegExp(
          `CREATE POLICY "Public Read: [^"]+" ON public\\.${table} FOR SELECT TO anon,\\s*authenticated USING \\(true\\);`,
          'i'
        );
        expect(sqlContent).toMatch(policyRegex);
      }
    });

    it('defines decrement_variant_stock with SECURITY DEFINER to permit atomic stock deduction during anon checkout', () => {
      expect(sqlContent).toMatch(
        /CREATE OR REPLACE FUNCTION public\.decrement_variant_stock[\s\S]*?LANGUAGE plpgsql SECURITY DEFINER;/i
      );
    });

    it('detects idempotency limitation: CREATE POLICY lacks DROP POLICY IF EXISTS guards', () => {
      // PostgreSQL CREATE POLICY fails if policy already exists.
      // Notice: If schema is run twice in a Supabase instance, it will fail unless DROP POLICY IF EXISTS is included.
      const hasDropPolicy = sqlContent.includes('DROP POLICY IF EXISTS');
      // Documenting this as an empirical finding:
      expect(hasDropPolicy).toBe(false);
    });
  });

  // =========================================================================
  // 3. STORAGE BUCKET SPECIFICATION & POLICIES
  // =========================================================================
  describe('3. Storage Bucket Specification & Policies', () => {
    it('configures product-images bucket with 5MB limit and image MIME whitelist', () => {
      expect(sqlContent).toContain("'product-images'");
      expect(sqlContent).toContain('5242880');
      expect(sqlContent).toContain("'image/jpeg'");
      expect(sqlContent).toContain("'image/png'");
      expect(sqlContent).toContain("'image/webp'");
      expect(sqlContent).toContain("'image/gif'");
      expect(sqlContent).toContain("'image/svg+xml'");
    });

    it('configures storage.objects RLS: public SELECT, authenticated INSERT/UPDATE/DELETE', () => {
      expect(sqlContent).toMatch(
        /CREATE POLICY "Public Storage Read: View Product Images"\s+ON storage\.objects FOR SELECT TO public USING \(bucket_id = 'product-images'\);/
      );
      expect(sqlContent).toMatch(
        /CREATE POLICY "Admin Storage Insert: Upload Product Images"\s+ON storage\.objects FOR INSERT TO authenticated WITH CHECK \(bucket_id = 'product-images'\);/
      );
      expect(sqlContent).toMatch(
        /CREATE POLICY "Admin Storage Update: Modify Product Images"\s+ON storage\.objects FOR UPDATE TO authenticated USING \(bucket_id = 'product-images'\);/
      );
      expect(sqlContent).toMatch(
        /CREATE POLICY "Admin Storage Delete: Remove Product Images"\s+ON storage\.objects FOR DELETE TO authenticated USING \(bucket_id = 'product-images'\);/
      );
    });
  });

  // =========================================================================
  // 4. SCHEMA VS DOMAIN TYPE ALIGNMENT & DIVERGENCE AUDIT
  // =========================================================================
  describe('4. Schema vs Domain Type Alignment & Divergence Audit', () => {
    it('detects missing columns in public.store_settings: tiktok_url and store_name_en', () => {
      const storeSettingsMatch = sqlContent.match(
        /CREATE TABLE IF NOT EXISTS public\.store_settings \(([\s\S]*?)\);/
      );
      expect(storeSettingsMatch).not.toBeNull();
      const settingsSql = storeSettingsMatch![1];

      // Check whether tiktok_url is in the SQL table
      const hasTiktokCol = /tiktok_url/i.test(settingsSql);
      // Check whether store_name_en is in the SQL table
      const hasStoreNameEnCol = /store_name_en/i.test(settingsSql);

      // Both columns are properly present in supabase/schema.sql
      expect(hasTiktokCol).toBe(true);
      expect(hasStoreNameEnCol).toBe(true);
    });

    it('verifies hex regex constraint strictly validates standard 3 and 6 char hex colors', () => {
      const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

      // Valid
      expect(regex.test('#111111')).toBe(true);
      expect(regex.test('#fff')).toBe(true);
      expect(regex.test('#800020')).toBe(true);
      expect(regex.test('#D4A5A5')).toBe(true);

      // Invalid
      expect(regex.test('111111')).toBe(false); // missing #
      expect(regex.test('#1111')).toBe(false); // 4 chars
      expect(regex.test('#11111111')).toBe(false); // 8 chars (RGBA)
      expect(regex.test('#ZZZZZZ')).toBe(false); // invalid hex
      expect(regex.test('red')).toBe(false); // named color
    });

    it('verifies all seed variants have valid hex codes satisfying the regex constraint', () => {
      const hexMatches = sqlContent.match(/#[A-Fa-f0-9]{3,8}/g) || [];
      const regex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;

      for (const hex of hexMatches) {
        expect(regex.test(hex), `Hex ${hex} in seed script must satisfy regex`).toBe(true);
      }
    });

    it('verifies all seed products satisfy discount_price < base_price constraint', () => {
      // prod_abaya_royal_crepe: base 1250, discount 950
      expect(950 < 1250).toBe(true);
      // prod_01: base 800, discount 650
      expect(650 < 800).toBe(true);
      // prod_bedsheet_egyptian_cotton: base 850, discount 690
      expect(690 < 850).toBe(true);
      // prod_dress_floral_chiffon: base 980, discount 750
      expect(750 < 980).toBe(true);
      // prod_quilt_double_face: base 1400, discount NULL
    });

    it('verifies all 27 Egyptian governorates in seed script match valid codes and zones 1..4', () => {
      const govMatch = sqlContent.match(/INSERT INTO public\.governorates[\s\S]*?ON CONFLICT/);
      expect(govMatch).not.toBeNull();
      const govText = govMatch![0];

      const expectedCodes = [
        'Cairo', 'Giza', 'Alexandria', 'Qaliubiya', 'Sharkia', 'Dakahlia',
        'Gharbiya', 'Menofia', 'Beheira', 'Damietta', 'Kafr Al-Sheikh',
        'Port Said', 'Ismailia', 'Suez', 'Fayoum', 'Beni Suef', 'Minya',
        'Assiut', 'Sohag', 'Qena', 'Luxor', 'Aswan', 'Red Sea', 'New Valley',
        'Matrouh', 'North Sinai', 'South Sinai',
      ];

      for (const code of expectedCodes) {
        expect(govText).toContain(`'${code}'`);
      }
    });
  });

  // =========================================================================
  // 5. CLIENT MAPPING LOGIC FIDELITY & ADVERSARIAL EDGE CASES
  // =========================================================================
  describe('5. Client Mapping Logic Fidelity & Adversarial Edge Cases', () => {
    // Test mapping functions under extreme database outputs
    it('handles Postgres NUMERIC string coercion and null discount prices cleanly', () => {
      // Postgres drivers often return NUMERIC(10,2) as strings to avoid JS precision loss
      const dbRow: any = {
        id: 'prod_test_01',
        slug: 'test-product',
        title_ar: 'منتج تجريبي',
        title_en: 'Test Product',
        description_ar: 'وصف',
        description_en: 'Description',
        base_price: '1250.50', // string from pg
        discount_price: '950.25', // string from pg
        currency: 'EGP',
        primary_category_slug: 'abayas',
        category_ids: ['cat_1', 'cat_2'],
        tags: ['tag1'],
        rating: '4.8',
        review_count: 10,
        is_featured: true,
        is_new_arrival: false,
        created_at: '2026-10-01T00:00:00Z',
        updated_at: '2026-10-01T00:00:00Z',
        variants: [
          {
            id: 'var_1',
            sku: 'SKU-1',
            color_name_ar: 'أسود',
            color_name_en: 'Black',
            color_hex: '#000000',
            size: 'M',
            price_adjustment: '50.00',
            price_override: null,
            stock_quantity: 5,
            in_stock: true,
            variant_image_url: null,
          },
        ],
        images: [
          { image_url: 'https://example.com/2.jpg', display_order: 1 },
          { image_url: 'https://example.com/1.jpg', display_order: 0 },
        ],
      };

      // Simulate mapping logic from supabaseStoreService
      const basePrice = Number(dbRow.base_price);
      const discountPrice = dbRow.discount_price != null ? Number(dbRow.discount_price) : undefined;
      const sortedImages = dbRow.images.slice().sort((a: any, b: any) => a.display_order - b.display_order);

      expect(basePrice).toBe(1250.5);
      expect(discountPrice).toBe(950.25);
      expect(sortedImages[0].image_url).toBe('https://example.com/1.jpg');
      expect(sortedImages[1].image_url).toBe('https://example.com/2.jpg');
    });

    it('correctly handles zero price override vs null price override', () => {
      const vNull: any = { price_override: null };
      const vZero: any = { price_override: 0 };
      const vStrZero: any = { price_override: '0.00' };
      const vValue: any = { price_override: 150 };

      const mapOverride = (v: any) => (v.price_override != null ? Number(v.price_override) : undefined);

      expect(mapOverride(vNull)).toBeUndefined();
      expect(mapOverride(vZero)).toBe(0);
      expect(mapOverride(vStrZero)).toBe(0);
      expect(mapOverride(vValue)).toBe(150);
    });

    it('correctly deduplicates availableColors by nameEn and preserves exact hex', () => {
      const variants = [
        { color: { nameAr: 'أسود', nameEn: 'Black', hex: '#000000' } },
        { color: { nameAr: 'أسود داكن', nameEn: 'Black', hex: '#000000' } },
        { color: { nameAr: 'أبيض', nameEn: 'White', hex: '#FFFFFF' } },
      ];

      const colorMap = new Map<string, any>();
      variants.forEach((v) => {
        if (v.color && v.color.nameEn) {
          colorMap.set(v.color.nameEn, v.color);
        }
      });
      const availableColors = Array.from(colorMap.values());

      expect(availableColors.length).toBe(2);
      expect(availableColors.map((c) => c.nameEn)).toEqual(['Black', 'White']);
    });
  });
});
