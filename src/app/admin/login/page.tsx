'use client';

import React, { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import {
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  ArrowRight,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('يرجى إدخال كلمة المرور للمتابعة');
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        setError(data.error || 'كلمة المرور غير صحيحة، يرجى المحاولة مرة أخرى');
        setIsLoading(false);
        return;
      }

      setIsSuccess(true);
      const redirectUrl = searchParams.get('redirect') || '/admin';
      router.push(redirectUrl);
      router.refresh();
    } catch (err: any) {
      setError('تعذر الاتصال بالخادم، يرجى التحقق من اتصالك بالإنترنت والمحاولة مجدداً');
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-rose-100 overflow-hidden relative z-10 animate-fade-in">
      {/* Deep Royal Burgundy Card Header */}
      <div className="bg-[#800020] text-white p-8 text-center relative border-b-4 border-[#D4AF37]">
        {/* Circular Roby Logo Ring */}
        <div className="mx-auto w-16 h-16 rounded-full border-2 border-[#D4AF37] bg-[#5B0017] flex items-center justify-center shadow-lg mb-4">
          <span className="font-serif font-black text-2xl text-[#D4AF37] tracking-wider">
            R
          </span>
        </div>

        <h1 className="text-xl font-bold font-serif tracking-wide text-white">
          ROBY STORE
        </h1>
        <p className="text-xs text-[#D4A5A5] mt-1 font-medium">
          بوابة الإدارة المركزية | أزياء حريمي ومفروشات راقية
        </p>

        <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#F7EDE2] text-[11px] font-semibold border border-[#D4AF37]/40">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span>جلسة مشفرة ومحمية بكلمة مرور الإدارة</span>
        </div>
      </div>

      {/* Card Body */}
      <div className="p-6 sm:p-8 space-y-6">
        {/* Error Banner */}
        {error && (
          <div
            role="alert"
            className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800 text-xs font-bold flex items-center gap-3 animate-fade-in"
          >
            <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div className="flex-1">{error}</div>
          </div>
        )}

        {/* Success Banner */}
        {isSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3 animate-fade-in">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0" />
            <div className="flex-1">
              تم التحقق بنجاح! جارٍ توجيهك إلى لوحة التحكم...
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="admin-password"
              className="block text-xs font-bold text-charcoal-700 mb-2 flex items-center gap-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-[#800020]" />
              <span>كلمة مرور الإدارة</span>
            </label>

            <div className="relative">
              <input
                id="admin-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                disabled={isLoading || isSuccess}
                placeholder="أدخل كلمة مرور الإدارة للمتابعة"
                className="w-full px-4 py-3.5 pr-4 pl-12 text-sm bg-rose-50/20 border border-rose-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-[#800020] focus:border-transparent text-charcoal-900 transition-all disabled:opacity-50"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={isLoading || isSuccess}
                aria-label={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-charcoal-400 hover:text-charcoal-700 focus:outline-none p-1 rounded-lg"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading || isSuccess}
            className="w-full py-3.5 px-6 rounded-2xl bg-[#800020] hover:bg-[#5B0017] text-white font-bold text-sm shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#D4AF37]"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-[#D4AF37]" />
                <span>جارٍ التحقق وتأمين الجلسة...</span>
              </>
            ) : isSuccess ? (
              <>
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span>تم الدخول بنجاح...</span>
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-[#D4AF37]" />
                <span>تسجيل الدخول إلى لوحة التحكم</span>
              </>
            )}
          </button>
        </form>

        {/* Return to storefront */}
        <div className="pt-4 border-t border-rose-100 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#800020] hover:text-[#5B0017] transition-colors"
          >
            <ArrowRight className="w-3.5 h-3.5" />
            <span>العودة إلى متجر روبي ستور</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-screen bg-[#FAF7F2] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Egyptian Luxury Gradient Glows */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-[#800020]/10 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-[#D4AF37]/15 blur-3xl pointer-events-none" />

      {/* Main Login Card wrapped in Suspense for useSearchParams */}
      <Suspense
        fallback={
          <div className="w-full max-w-md bg-white rounded-3xl p-12 text-center border border-rose-100 shadow-xl">
            <Loader2 className="w-8 h-8 animate-spin text-[#800020] mx-auto mb-3" />
            <p className="text-xs text-charcoal-500 font-bold">جارٍ تهيئة بوابة الإدارة...</p>
          </div>
        }
      >
        <AdminLoginForm />
      </Suspense>

      {/* Security Footer Note */}
      <p className="mt-6 text-[11px] text-charcoal-400 text-center max-w-sm">
        نظام إدارة روبي ستور محمي ببروتوكول تشفير الجلسات HMAC-SHA256 وكوكيز HTTP-only لحماية بيانات المتجر والمخزون.
      </p>
    </div>
  );
}
