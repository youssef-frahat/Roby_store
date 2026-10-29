/**
 * Roby Store - Egyptian Mobile & Customer Form Validation
 * Location: src/utils/validation.ts
 */

import { CustomerDetails } from '../types/order';
import { EgyptianGovernorate } from '../types/store';

const EGYPTIAN_GOVERNORATES: EgyptianGovernorate[] = [
  'Cairo',
  'Giza',
  'Alexandria',
  'Dakahlia',
  'Red Sea',
  'Beheira',
  'Fayoum',
  'Gharbiya',
  'Ismailia',
  'Menofia',
  'Minya',
  'Qaliubiya',
  'New Valley',
  'Suez',
  'Aswan',
  'Assiut',
  'Beni Suef',
  'Port Said',
  'Damietta',
  'Sharkia',
  'South Sinai',
  'Kafr Al-Sheikh',
  'Matrouh',
  'Luxor',
  'Qena',
  'North Sinai',
  'Sohag',
];

export interface PhoneValidationResult {
  isValid: boolean;
  normalizedPhone?: string;
  error?: string;
}

/**
 * Validates and normalizes Egyptian mobile numbers (Vodafone 010, Etisalat 011, Orange 012, WE 015).
 */
export function validateEgyptianPhone(phone: string): PhoneValidationResult {
  if (!phone || typeof phone !== 'string') {
    return { isValid: false, error: 'يرجى إدخال رقم الهاتف المحمول' };
  }

  const trimmed = phone.trim();

  // If there are alphabetic or unexpected symbolic characters (other than +, spaces, dashes, parentheses)
  if (/[a-zA-Z]/.test(trimmed) || /[^0-9+\s\-()]/.test(trimmed)) {
    return { isValid: false, error: 'رقم الهاتف يجب أن يحتوي على أرقام فقط' };
  }

  // Strip all non-digit characters
  let digits = trimmed.replace(/\D/g, '');

  // Handle +20 or 0020 or 20 prefix
  if (digits.startsWith('0020')) {
    digits = digits.slice(4);
  } else if (digits.startsWith('20') && digits.length === 12) {
    digits = digits.slice(2);
  } else if (digits.startsWith('2') && digits.length === 12) {
    digits = digits.slice(1);
  }

  // If now it starts with '1', prepend '0' (e.g. 1012345678 -> 01012345678)
  if (digits.startsWith('1') && digits.length === 10) {
    digits = `0${digits}`;
  }

  // Enforce exactly 11 digits and standard Egyptian prefixes (010, 011, 012, 015)
  const regex = /^(01[0125]\d{8})$/;

  if (!regex.test(digits)) {
    if (digits.length !== 11) {
      return {
        isValid: false,
        error: `رقم الهاتف المصري يجب أن يتكون من 11 رقماً (المدخل: ${digits.length})`,
      };
    }
    return {
      isValid: false,
      error: 'كود الشبكة غير صحيح. يجب أن يبدأ الرقم بـ 010 أو 011 أو 012 أو 015',
    };
  }

  return {
    isValid: true,
    normalizedPhone: digits,
  };
}

/**
 * Checks if a string is a valid Egyptian governorate.
 */
export function isValidGovernorate(governorate: string): boolean {
  if (!governorate) return false;
  return EGYPTIAN_GOVERNORATES.includes(governorate as EgyptianGovernorate);
}

export interface CustomerValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Validates customer checkout form inputs.
 */
export function validateCustomerDetails(
  customer: Partial<CustomerDetails>
): CustomerValidationResult {
  const errors: Record<string, string> = {};

  // 1. Full Name
  if (!customer.fullName || customer.fullName.trim().length < 3) {
    errors.fullName = 'يرجى إدخال الاسم بالكامل (3 أحرف على الأقل)';
  }

  // 2. Phone
  if (!customer.phone) {
    errors.phone = 'يرجى إدخال رقم الهاتف المحمول';
  } else {
    const phoneRes = validateEgyptianPhone(customer.phone);
    if (!phoneRes.isValid && phoneRes.error) {
      errors.phone = phoneRes.error;
    }
  }

  // 3. Alternative Phone (optional)
  if (customer.alternativePhone && customer.alternativePhone.trim().length > 0) {
    const altRes = validateEgyptianPhone(customer.alternativePhone);
    if (!altRes.isValid && altRes.error) {
      errors.alternativePhone = altRes.error;
    }
  }

  // 4. Governorate
  if (!customer.governorate || !isValidGovernorate(customer.governorate)) {
    errors.governorate = 'يرجى اختيار المحافظة من القائمة المتاحة';
  }

  // 5. City
  if (!customer.city || customer.city.trim().length < 2) {
    errors.city = 'يرجى إدخال المنطقة أو المدينة';
  }

  // 6. Delivery Address
  if (!customer.deliveryAddress || customer.deliveryAddress.trim().length < 10) {
    errors.deliveryAddress = 'يرجى إدخال العنوان بالتفصيل (اسم الشارع، رقم العمارة، الشقة)';
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Alias for checkout validation compatibility
 */
export const validateCustomerCheckout = validateCustomerDetails;

