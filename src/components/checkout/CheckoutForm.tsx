'use client';

import React from 'react';
import { CustomerDetails } from '../../types/order';
import { GovernorateInfo, EgyptianGovernorate } from '../../types/store';
import { validateCustomerDetails } from '../../utils/validation';

interface CheckoutFormProps {
  customer: CustomerDetails;
  governorates: GovernorateInfo[];
  onChange: (updated: Partial<CustomerDetails>) => void;
  onSubmit: () => void;
  isSubmitting?: boolean;
}

export const CheckoutForm: React.FC<CheckoutFormProps> = ({
  customer,
  governorates,
  onChange,
  onSubmit,
  isSubmitting = false,
}) => {
  const [touched, setTouched] = React.useState<Record<string, boolean>>({});

  const validation = validateCustomerDetails(customer);

  const handleBlur = (field: string) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const selectedGov = governorates.find((g) => g.nameAr === customer.governorate || g.code === customer.governorate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({
      fullName: true,
      phone: true,
      governorate: true,
      city: true,
      deliveryAddress: true,
    });

    if (validation.isValid) {
      onSubmit();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-100 shadow-xs space-y-6">
      <div className="border-b border-rose-100 pb-4">
        <h3 className="text-lg font-bold text-charcoal-900 font-serif">
          بيانات استلام الطلب والشحن 📦
        </h3>
        <p className="text-xs text-charcoal-500 mt-1">
          يرجى إدخال بياناتك بدقة لتجهيز الشحنة والتواصل معك عبر الواتساب لتأكيد الاستلام.
        </p>
      </div>

      <div className="space-y-4 text-xs">
        {/* Full Name */}
        <div>
          <label className="font-bold text-charcoal-800 block mb-1.5">
            الاسم بالكامل <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="مثال: ياسمين أحمد محمود"
            value={customer.fullName}
            onChange={(e) => onChange({ fullName: e.target.value })}
            onBlur={() => handleBlur('fullName')}
            className={`w-full bg-rose-50/40 border rounded-xl p-3 text-charcoal-900 text-xs focus:bg-white transition-all ${
              touched.fullName && validation.errors.fullName
                ? 'border-red-400 focus:ring-red-200'
                : 'border-rose-200 focus:border-rose-500 focus:ring-rose-200'
            }`}
          />
          {touched.fullName && validation.errors.fullName && (
            <p className="text-red-600 text-[11px] mt-1 font-medium">{validation.errors.fullName}</p>
          )}
        </div>

        {/* Phone & Alt Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-charcoal-800 block mb-1.5">
              رقم الهاتف (واتساب) <span className="text-red-500">*</span>
            </label>
            <input
              type="tel"
              placeholder="01012345678"
              value={customer.phone}
              onChange={(e) => onChange({ phone: e.target.value })}
              onBlur={() => handleBlur('phone')}
              className={`w-full bg-rose-50/40 border rounded-xl p-3 text-charcoal-900 text-xs focus:bg-white transition-all ${
                touched.phone && validation.errors.phone
                  ? 'border-red-400 focus:ring-red-200'
                  : 'border-rose-200 focus:border-rose-500 focus:ring-rose-200'
              }`}
            />
            {touched.phone && validation.errors.phone && (
              <p className="text-red-600 text-[11px] mt-1 font-medium">{validation.errors.phone}</p>
            )}
          </div>

          <div>
            <label className="font-bold text-charcoal-800 block mb-1.5">
              رقم هاتف بديل (اختياري)
            </label>
            <input
              type="tel"
              placeholder="01187654321"
              value={customer.alternativePhone || ''}
              onChange={(e) => onChange({ alternativePhone: e.target.value })}
              className="w-full bg-rose-50/40 border border-rose-200 rounded-xl p-3 text-charcoal-900 text-xs focus:bg-white"
            />
          </div>
        </div>

        {/* Governorate & City */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="font-bold text-charcoal-800 block mb-1.5">
              المحافظة <span className="text-red-500">*</span>
            </label>
            <select
              value={customer.governorate}
              onChange={(e) => onChange({ governorate: e.target.value as EgyptianGovernorate })}
              onBlur={() => handleBlur('governorate')}
              className="w-full bg-rose-50/40 border border-rose-200 rounded-xl p-3 text-charcoal-900 text-xs focus:bg-white"
            >
              {governorates.map((gov) => (
                <option key={gov.code} value={gov.code}>
                  {gov.nameAr} (شحن: {gov.shippingFee} ج.م)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="font-bold text-charcoal-800 block mb-1.5">
              المدينة / الحي <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="مثال: مصر الجديدة / مدينة نصر"
              value={customer.city}
              onChange={(e) => onChange({ city: e.target.value })}
              onBlur={() => handleBlur('city')}
              className={`w-full bg-rose-50/40 border rounded-xl p-3 text-charcoal-900 text-xs focus:bg-white ${
                touched.city && validation.errors.city ? 'border-red-400' : 'border-rose-200'
              }`}
            />
          </div>
        </div>

        {/* Delivery Address */}
        <div>
          <label className="font-bold text-charcoal-800 block mb-1.5">
            العنوان بالتفصيل (اسم الشارع، رقم العمارة، رقم الشقة) <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            placeholder="مثال: شارع النزهة، عمارة 15، الدور الثالث، شقة 6"
            value={customer.deliveryAddress}
            onChange={(e) => onChange({ deliveryAddress: e.target.value })}
            onBlur={() => handleBlur('deliveryAddress')}
            className={`w-full bg-rose-50/40 border rounded-xl p-3 text-charcoal-900 text-xs focus:bg-white ${
              touched.deliveryAddress && validation.errors.deliveryAddress
                ? 'border-red-400'
                : 'border-rose-200'
            }`}
          />
          {touched.deliveryAddress && validation.errors.deliveryAddress && (
            <p className="text-red-600 text-[11px] mt-1 font-medium">{validation.errors.deliveryAddress}</p>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="font-bold text-charcoal-800 block mb-1.5">
            ملاحظات خاصة بالتوصيل (اختياري)
          </label>
          <textarea
            rows={2}
            placeholder="مثال: يرجى الاتصال قبل الوصول بنصف ساعة..."
            value={customer.notes || ''}
            onChange={(e) => onChange({ notes: e.target.value })}
            className="w-full bg-rose-50/40 border border-rose-200 rounded-xl p-3 text-charcoal-900 text-xs focus:bg-white"
          />
        </div>
      </div>

      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full py-3.5 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
      >
        <span>متابعة وتأكيد الطلب عبر الواتساب</span>
      </button>
    </form>
  );
};
