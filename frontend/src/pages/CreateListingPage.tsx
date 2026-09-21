import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { listings, categories, cities, upload } from '../api';
import CustomSelect from '../components/ui/CustomSelect';
import toast from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import {
  ChevronLeft,
  ChevronRight,
  Upload,
  X,
  MapPin,
  FileText,
  Tag,
  Camera,
  DollarSign,
  Gavel,
  Check,
} from 'lucide-react';

interface FormData {
  category_id: number | null;
  title: string;
  description: string;
  contact_name: string;
  contact_phone: string;
  image_urls: string[];
  price: string;
  price_unit: string;
  deposit: string;
  city_id: number | null;
  district_id: number | null;
  address: string;
  rules: string;
}

const initialFormData: FormData = {
  category_id: null,
  title: '',
  description: '',
  contact_name: '',
  contact_phone: '',
  image_urls: [],
  price: '',
  price_unit: 'per_day',
  deposit: '',
  city_id: null,
  district_id: null,
  address: '',
  rules: '',
};

export default function CreateListingPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { t } = useTranslation();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialFormData);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const STEPS = [
    t('createListing.stepCategory'),
    t('createListing.stepInfo'),
    t('createListing.stepPhotos'),
    t('createListing.stepPrice'),
    t('createListing.stepLocation'),
    t('createListing.stepRules'),
  ];

  const PRICE_UNITS = [
    { value: 'per_hour', label: t('createListing.perHour') },
    { value: 'per_day', label: t('createListing.perDay') },
    { value: 'per_week', label: t('createListing.perWeek') },
    { value: 'per_month', label: t('createListing.perMonth') },
  ];

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => categories.getAll(),
  });

  const { data: cityList = [] } = useQuery({
    queryKey: ['cities'],
    queryFn: () => cities.getAll(),
  });

  const { data: districtList = [] } = useQuery({
    queryKey: ['districts', form.city_id],
    queryFn: () => cities.getDistricts(form.city_id!),
    enabled: !!form.city_id,
  });

  const categoryList = categoriesData?.items || [];

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => {
      return listings.create({
        title: formData.title,
        description: formData.description || undefined,
        category_id: formData.category_id!,
        city_id: formData.city_id!,
        district_id: formData.district_id || undefined,
        price: Number(formData.price),
        price_unit: formData.price_unit as any,
        deposit: formData.deposit ? Number(formData.deposit) : 0,
        address: formData.address || undefined,
        rental_rules: formData.rules || undefined,
        contact_name: formData.contact_name || undefined,
        contact_phone: formData.contact_phone || undefined,
        image_urls: formData.image_urls,
      });
    },
    onSuccess: (data) => {
      toast.success(t('createListing.published'));
      queryClient.invalidateQueries({ queryKey: ['listings'] });
      navigate(`/listing/${data.id}`);
    },
    onError: (error: any) => {
      const detail = error?.response?.data?.detail;
      let message = t('createListing.failedToPublish');
      if (typeof detail === 'string') {
        message = detail;
      } else if (Array.isArray(detail)) {
        message = detail.map((e: any) => e.msg).join(', ');
      } else if (error?.message) {
        message = error.message;
      }
      toast.error(message);
    },
  });

  const updateForm = (patch: Partial<FormData>) => setForm((prev) => ({ ...prev, ...patch }));

  const handleImageUpload = async (files: FileList | File[]) => {
    const remaining = 8 - form.image_urls.length;
    if (remaining <= 0) {
      toast.error(t('createListing.maxPhotos'));
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploadingImages(true);
    try {
      const urls = await Promise.all(
        toUpload.map(async (file) => {
          const result = await upload.uploadImage(file);
          return result.image_url;
        })
      );
      updateForm({ image_urls: [...form.image_urls, ...urls] });
    } catch {
      toast.error(t('createListing.uploadError'));
    } finally {
      setUploadingImages(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  const removeImage = (index: number) => {
    updateForm({ image_urls: form.image_urls.filter((_, i) => i !== index) });
  };

  const canProceed = () => {
    switch (step) {
      case 0: return form.category_id !== null;
      case 1: return form.title.trim().length > 0;
      case 2: return form.image_urls.length > 0;
      case 3: return form.price !== '' && Number(form.price) > 0;
      case 4: return form.city_id !== null;
      case 5: return true;
      default: return true;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a1a] py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => (step === 0 ? navigate(-1) : setStep(step - 1))}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-[#1A1A2E] dark:hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          {step === 0 ? t('common.back') : STEPS[step - 1]}
        </button>

        <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6 mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A2E] dark:text-white mb-6">{t('createListing.title')}</h1>
          <div className="flex items-center gap-1 mb-2">
            {STEPS.map((label, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-[#FF6B35]' : 'bg-gray-200 dark:bg-white/10'}`} />
                <span className={`text-[10px] mt-1 block text-center ${i === step ? 'text-[#FF6B35] font-semibold' : 'text-gray-400 dark:text-gray-400'}`}>
                  {label}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6">
          {step === 0 && (
            <div>
              <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-4">
                <Tag size={20} className="text-[#FF6B35]" />
                {t('createListing.selectCategory')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categoryList.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => updateForm({ category_id: cat.id })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.category_id === cat.id
                        ? 'border-[#FF6B35] bg-[#FF6B35]/5 shadow-md shadow-[#FF6B35]/10'
                        : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20 hover:bg-gray-50 dark:hover:bg-white/5'
                    }`}
                  >
                    <span className="text-sm font-semibold text-[#1A1A2E] dark:text-white">{cat.name}</span>
                    {cat.icon && <span className="text-lg block mt-1">{cat.icon}</span>}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-4">
                <FileText size={20} className="text-[#FF6B35]" />
                {t('createListing.info')}
              </h2>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.titleLabel')}</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  placeholder={t('createListing.titlePlaceholder')}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.descriptionLabel')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  rows={5}
                  placeholder={t('createListing.descriptionPlaceholder')}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none transition resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.contactName')}</label>
                  <input
                    type="text"
                    value={form.contact_name}
                    onChange={(e) => updateForm({ contact_name: e.target.value })}
                    placeholder={t('createListing.contactNamePlaceholder')}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.contactPhone')}</label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={(e) => updateForm({ contact_phone: e.target.value })}
                    placeholder={t('createListing.contactPhonePlaceholder')}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none transition"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-4">
                <Camera size={20} className="text-[#FF6B35]" />
                {t('createListing.photos', { count: form.image_urls.length })}
              </h2>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-[#FF6B35] bg-[#FF6B35]/5' : 'border-gray-300 dark:border-white/20 hover:border-[#FF6B35] dark:hover:border-[#FF6B35] hover:bg-gray-50 dark:hover:bg-white/5'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => e.target.files && handleImageUpload(e.target.files)}
                />
                <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-[#FF6B35]' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {uploadingImages ? t('createListing.uploading') : t('createListing.uploadHint')}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t('createListing.uploadFormatHint')}</p>
              </div>

              {form.image_urls.length > 0 && (
                <div className="grid grid-cols-4 gap-3 mt-4">
                  {form.image_urls.map((img, i) => (
                    <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-gray-200 dark:border-white/10">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                        <button
                          onClick={(e) => { e.stopPropagation(); removeImage(i); }}
                          className="w-7 h-7 bg-red-500 rounded-full flex items-center justify-center text-white hover:bg-red-600 transition"
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {i === 0 && (
                        <div className="absolute top-1 left-1 bg-[#FF6B35] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {t('createListing.mainPhoto')}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-4">
                <DollarSign size={20} className="text-[#FF6B35]" />
                {t('createListing.priceLabel')}
              </h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.priceLabel')} *</label>
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => updateForm({ price: e.target.value })}
                    placeholder="0"
                    min="0"
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.period')}</label>
                  <CustomSelect
                    options={PRICE_UNITS}
                    value={form.price_unit}
                    onChange={(val) => updateForm({ price_unit: val })}
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.depositLabel')}</label>
                <input
                  type="number"
                  value={form.deposit}
                  onChange={(e) => updateForm({ deposit: e.target.value })}
                  placeholder={t('createListing.depositPlaceholder')}
                  min="0"
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none transition"
                />
              </div>
              <p className="text-xs text-gray-400">{t('createListing.currencyNote')}</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-[#FF6B35]" />
                {t('createListing.location')}
              </h2>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.city')} *</label>
                <CustomSelect
                  options={[
                    { value: '', label: t('createListing.selectCity') },
                    ...cityList.map((c) => ({ value: String(c.id), label: c.name })),
                  ]}
                  value={form.city_id ? String(form.city_id) : ''}
                  onChange={(val) => {
                    const id = Number(val) || null;
                    updateForm({ city_id: id, district_id: null });
                  }}
                />
              </div>
              {form.city_id && districtList.length > 0 && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.district')}</label>
                  <CustomSelect
                    options={[
                      { value: '', label: t('createListing.selectDistrict') },
                      ...districtList.map((d) => ({ value: String(d.id), label: d.name })),
                    ]}
                    value={form.district_id ? String(form.district_id) : ''}
                    onChange={(val) => updateForm({ district_id: Number(val) || null })}
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.address')}</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateForm({ address: e.target.value })}
                  placeholder={t('createListing.addressPlaceholder')}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none transition"
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-4">
                <Gavel size={20} className="text-[#FF6B35]" />
                {t('createListing.rules')}
              </h2>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.rentalRules')}</label>
                <textarea
                  value={form.rules}
                  onChange={(e) => updateForm({ rules: e.target.value })}
                  rows={5}
                  placeholder={t('createListing.rulesPlaceholder')}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[#FF6B35]/30 focus:border-[#FF6B35] outline-none transition resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100 dark:border-white/10">
            <button
              onClick={() => step === 0 ? navigate(-1) : setStep(step - 1)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#1A1A2E] transition-colors"
            >
              <ChevronLeft size={16} />
              {t('common.back')}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 bg-[#FF6B35] hover:bg-[#e55a2b] disabled:bg-gray-300 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-[#FF6B35]/20"
              >
                {t('common.next')}
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending}
                className="flex items-center gap-2 bg-[#FF6B35] hover:bg-[#e55a2b] disabled:bg-gray-300 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-[#FF6B35]/20"
              >
                {createMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {t('createListing.publish')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
