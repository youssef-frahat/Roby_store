'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Save, ArrowRight, CheckCircle2, Phone, MessageCircle, Instagram, Facebook, Mail, MapPin } from 'lucide-react';
import { getStoreService } from '../../../services/storeService';
import { StoreSettings } from '../../../types/store';

export default function AdminSettingsPage() {
  const [settings, setSettings] = useState<StoreSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const service = getStoreService();

  useEffect(() => {
    async function load() {
      try {
        const data = await service.getSettings();
        setSettings(data);
      } catch (err: any) {
        setError(err.message || 'فشل تحميل الإعدادات');
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [service]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;

    try {
      setIsSaved(false);
      const updated = await service.updateSettings(settings);
      setSettings(updated);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 4000);
    } catch (err: any) {
      alert('حدث خطأ أثناء الحفظ: ' + err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-charcoal-500">
        جارٍ تحميل إعدادات المتجر...
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="container mx-auto px-4 py-16 text-center text-red-500">
        تعذر العثور على الإعدادات.
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-rose-50/30 py-10">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <Link
              href="/"
              className="text-xs text-rose-700 hover:text-rose-900 font-semibold flex items-center gap-1 mb-2"
            >
              <ArrowRight className="w-3.5 h-3.5" />
              <span>العودة للمتجر</span>
            </Link>
            <h1 className="text-2xl font-bold font-serif text-charcoal-900">
              ⚙️ لوحة تحكم المتجر والاتصال
            </h1>
            <p className="text-xs text-charcoal-500 mt-1">
              تعديل أرقام الواتساب ووسائل التواصل المربوطة باستقبال الطلبات في روبي ستور.
            </p>
          </div>
        </div>

        {/* Success Alert */}
        {isSaved && (
          <div className="mb-6 p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2 animate-fade-in shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>تم حفظ وتحديث أرقام وإعدادات المتجر بنجاح! سيتم تطبيقها فوراً في كل روابط الطلب.</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-6 sm:p-8 border border-rose-100 shadow-sm space-y-6">
          {/* Section 1: WhatsApp Ordering */}
          <div className="border-b border-rose-100 pb-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="p-2 bg-emerald-100 text-emerald-700 rounded-lg">
                <MessageCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-charcoal-900">
                  رقم الواتساب المخصص لاستقبال الطلبات (Primary Ordering)
                </h3>
                <p className="text-[11px] text-charcoal-500">
                  هذا هو الرقم الذي ستُرسل إليه رسائل السلة المشفرة تلقائياً بنقرة واحدة من العملاء.
                </p>
              </div>
            </div>

            <div className="mt-3">
              <label className="text-xs font-bold text-charcoal-800 block mb-1">
                رقم الواتساب (بالصيغة الدولية أو المصرية)
              </label>
              <input
                type="text"
                placeholder="201000000000 أو 01000000000"
                value={settings.whatsappNumber}
                onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })}
                className="w-full bg-rose-50/40 border border-rose-200 rounded-xl p-3 text-xs text-charcoal-900 font-mono font-bold focus:bg-white"
                required
              />
              <p className="text-[10px] text-charcoal-400 mt-1">
                * مثال: 01012345678 أو 201012345678. يقوم النظام تلقائياً بتهيئته لبروتوكول wa.me.
              </p>
            </div>
          </div>

          {/* Section 2: Social Media Channels */}
          <div className="border-b border-rose-100 pb-5 space-y-4">
            <h3 className="text-sm font-bold text-charcoal-900">
              قنوات التواصل الاجتماعي (Social Commerce Channels)
            </h3>

            <div>
              <label className="text-xs font-bold text-charcoal-800 flex items-center gap-1.5 mb-1">
                <Instagram className="w-3.5 h-3.5 text-pink-600" />
                <span>رابط حساب إنستغرام (Instagram URL)</span>
              </label>
              <input
                type="url"
                placeholder="https://instagram.com/roby_store"
                value={settings.instagramUrl || ''}
                onChange={(e) => setSettings({ ...settings, instagramUrl: e.target.value })}
                className="w-full bg-rose-50/40 border border-rose-200 rounded-xl p-3 text-xs text-charcoal-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-charcoal-800 flex items-center gap-1.5 mb-1">
                <Facebook className="w-3.5 h-3.5 text-blue-600" />
                <span>رابط صفحة فيسبوك أو ماسنجر (Facebook / Messenger)</span>
              </label>
              <input
                type="url"
                placeholder="https://facebook.com/robystore.eg"
                value={settings.facebookUrl || ''}
                onChange={(e) => setSettings({ ...settings, facebookUrl: e.target.value })}
                className="w-full bg-rose-50/40 border border-rose-200 rounded-xl p-3 text-xs text-charcoal-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Section 3: General Contact & Store Details */}
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-charcoal-900">بيانات المتجر العامة</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-charcoal-800 flex items-center gap-1 mb-1">
                  <Phone className="w-3.5 h-3.5 text-rose-600" />
                  <span>رقم الهاتف المعروض للاتصال</span>
                </label>
                <input
                  type="text"
                  value={settings.contactPhone || ''}
                  onChange={(e) => setSettings({ ...settings, contactPhone: e.target.value })}
                  className="w-full bg-rose-50/40 border border-rose-200 rounded-xl p-3 text-xs text-charcoal-900 focus:bg-white"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-charcoal-800 flex items-center gap-1 mb-1">
                  <Mail className="w-3.5 h-3.5 text-rose-600" />
                  <span>البريد الإلكتروني</span>
                </label>
                <input
                  type="email"
                  value={settings.contactEmail || ''}
                  onChange={(e) => setSettings({ ...settings, contactEmail: e.target.value })}
                  className="w-full bg-rose-50/40 border border-rose-200 rounded-xl p-3 text-xs text-charcoal-900 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-charcoal-800 flex items-center gap-1 mb-1">
                <MapPin className="w-3.5 h-3.5 text-rose-600" />
                <span>عنوان المتجر / المقر</span>
              </label>
              <input
                type="text"
                value={settings.storeAddress || ''}
                onChange={(e) => setSettings({ ...settings, storeAddress: e.target.value })}
                className="w-full bg-rose-50/40 border border-rose-200 rounded-xl p-3 text-xs text-charcoal-900 focus:bg-white"
              />
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t border-rose-100 flex items-center justify-end">
            <button
              type="submit"
              className="px-6 py-3 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>حفظ التعديلات الآن</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
