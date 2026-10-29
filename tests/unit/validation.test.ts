import { describe, it, expect } from 'vitest';
import {
  validateEgyptianPhone,
  validateCustomerDetails,
  isValidGovernorate,
} from '../../src/utils/validation';
import type { CustomerDetails } from '../../src/types/order';

describe('Egyptian Phone & Customer Form Validation (R3, AC 3 - Tiers 1 & 2)', () => {
  // ==========================================
  // TIER 1: FEATURE COVERAGE (HAPPY PATH)
  // ==========================================

  describe('Tier 1: Feature Coverage (>=5 test cases)', () => {
    it('TC-T1-VAL-01: accepts valid Vodafone Egypt number (010)', () => {
      const result = validateEgyptianPhone('01012345678');
      expect(result.isValid).toBe(true);
      expect(result.normalizedPhone).toBe('01012345678');
      expect(result.error).toBeUndefined();
    });

    it('TC-T1-VAL-02: accepts valid Etisalat Egypt number (011)', () => {
      const result = validateEgyptianPhone('01123456789');
      expect(result.isValid).toBe(true);
      expect(result.normalizedPhone).toBe('01123456789');
      expect(result.error).toBeUndefined();
    });

    it('TC-T1-VAL-03: accepts valid Orange Egypt number (012)', () => {
      const result = validateEgyptianPhone('01234567890');
      expect(result.isValid).toBe(true);
      expect(result.normalizedPhone).toBe('01234567890');
      expect(result.error).toBeUndefined();
    });

    it('TC-T1-VAL-04: accepts valid WE Egypt number (015)', () => {
      const result = validateEgyptianPhone('01598765432');
      expect(result.isValid).toBe(true);
      expect(result.normalizedPhone).toBe('01598765432');
      expect(result.error).toBeUndefined();
    });

    it('TC-T1-VAL-05: accepts complete, valid customer checkout details', () => {
      const validCustomer: CustomerDetails = {
        fullName: 'فاطمة حسن',
        phone: '01098765432',
        governorate: 'Cairo',
        city: 'مدينة نصر',
        deliveryAddress: '15 شارع عباس العقاد، عمارة 4، الدور الخامس',
        notes: 'يرجى الاتصال قبل الوصول',
      };

      const result = validateCustomerDetails(validCustomer);
      expect(result.isValid).toBe(true);
      expect(Object.keys(result.errors).length).toBe(0);
    });
  });

  // ==========================================
  // TIER 2: BOUNDARY & CORNER CASES (>=5 test cases)
  // ==========================================

  describe('Tier 2: Boundary & Corner Cases (>=5 test cases)', () => {
    it('TC-T2-VAL-01: normalizes and accepts international format with +20', () => {
      const result = validateEgyptianPhone('+201012345678');
      expect(result.isValid).toBe(true);
      expect(result.normalizedPhone).toBe('01012345678');
    });

    it('TC-T2-VAL-02: normalizes and accepts leading 002 prefix', () => {
      const result = validateEgyptianPhone('00201123456789');
      expect(result.isValid).toBe(true);
      expect(result.normalizedPhone).toBe('01123456789');
    });

    it('TC-T2-VAL-03: trims leading and trailing whitespace', () => {
      const result = validateEgyptianPhone('   01234567890   ');
      expect(result.isValid).toBe(true);
      expect(result.normalizedPhone).toBe('01234567890');
    });

    it('TC-T2-VAL-04: rejects 10-digit phone number (missing one digit)', () => {
      const result = validateEgyptianPhone('0101234567');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('TC-T2-VAL-05: rejects 12-digit phone number (extra digit)', () => {
      const result = validateEgyptianPhone('010123456789');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('TC-T2-VAL-06: rejects invalid Egyptian mobile prefix (e.g. 013, 014, 019)', () => {
      const res013 = validateEgyptianPhone('01312345678');
      expect(res013.isValid).toBe(false);

      const res014 = validateEgyptianPhone('01412345678');
      expect(res014.isValid).toBe(false);

      const res019 = validateEgyptianPhone('01912345678');
      expect(res019.isValid).toBe(false);
    });

    it('TC-T2-VAL-07: rejects alphabetic or symbolic characters', () => {
      const result = validateEgyptianPhone('0101234abcd');
      expect(result.isValid).toBe(false);
    });

    it('TC-T2-VAL-08: rejects short customer name (< 3 characters)', () => {
      const customer: Partial<CustomerDetails> = {
        fullName: 'أحمد', // valid Arabic name >= 3 chars
      };
      expect(validateCustomerDetails(customer).errors.fullName).toBeUndefined();

      const shortCustomer: Partial<CustomerDetails> = {
        fullName: 'أح', // 2 chars
      };
      expect(validateCustomerDetails(shortCustomer).errors.fullName).toBeDefined();
    });

    it('TC-T2-VAL-09: rejects short delivery address (< 10 characters)', () => {
      const customer: Partial<CustomerDetails> = {
        deliveryAddress: 'شارع 1', // short address
      };
      const result = validateCustomerDetails(customer);
      expect(result.errors.deliveryAddress).toBeDefined();
    });

    it('TC-T2-VAL-10: verifies governorate exists in Egyptian governorates list', () => {
      expect(isValidGovernorate('Cairo')).toBe(true);
      expect(isValidGovernorate('Alexandria')).toBe(true);
      expect(isValidGovernorate('Aswan')).toBe(true);
      expect(isValidGovernorate('New York')).toBe(false);
      expect(isValidGovernorate('')).toBe(false);
    });
  });
});
