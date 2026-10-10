import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { invalidateListingQueries } from '../utils/invalidateListings';
import { listings, categories, cities, upload } from '../api';
import { compressImage } from '../utils/compressImage';
import { previousPath } from '../utils/navHistory';
import CustomSelect from '../components/ui/CustomSelect';
import LocationPicker from '../components/search/LocationPicker';
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
  Loader2,
  Wallet,
  AlertCircle,
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
  latitude: number | null;
  longitude: number | null;
  rules: string;
  dc_account: string;
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
  latitude: null,
  longitude: null,
  rules: '',
  dc_account: '',
};

// A number typed for reading is not a number a payment rail can use: people
// write phones the way they say them. Strip the spacing and punctuation, keep
// the sign that says "country code".
const asDcDestination = (raw: string) => raw.replace(/[\s\-().]/g, '');

export default function CreateListingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const editId = Number(searchParams.get('edit')) || null;
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const prefilledRef = useRef(false);
  // Whether the owner has taken the wallet field over from the phone number
  // it started as. Once they have, the form stops writing into it.
  const [dcTouched, setDcTouched] = useState(false);
  const { t } = useTranslation();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(initialFormData);
  const [uploadingImages, setUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ done: number; total: number } | null>(null);
  const [previews, setPreviews] = useState<{ key: string; url: string }[]>([]);
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

  const { data: editListing } = useQuery({
    queryKey: ['listing', editId],
    queryFn: () => listings.getOne(editId!),
    enabled: !!editId,
  });

  useEffect(() => {
    if (!editListing || prefilledRef.current) return;
    prefilledRef.current = true;
    setForm({
      category_id: editListing.category_id ?? null,
      title: editListing.title || '',
      description: editListing.description || '',
      contact_name: editListing.contact_name || '',
      contact_phone: editListing.contact_phone || '',
      image_urls: (editListing.images || []).map((img) => img.image_url),
      price: editListing.price ? String(editListing.price) : '',
      price_unit: editListing.price_unit || 'per_day',
      deposit: editListing.deposit ? String(editListing.deposit) : '',
      city_id: editListing.city_id ?? null,
      district_id: editListing.district_id ?? null,
      address: editListing.address || '',
      latitude: editListing.latitude ?? null,
      longitude: editListing.longitude ?? null,
      rules: editListing.rental_rules || '',
      // Deliberately left blank: the wallet lives on the owner's profile, not
      // on this listing, and an untouched field is omitted from the request —
      // which is what keeps the number already on file from being wiped.
      dc_account: '',
    });
  }, [editListing]);

  // For most owners the wallet and the phone are the same number, so on a new
  // listing they start in step and nobody has to type it twice. The moment the
  // owner edits the wallet they are telling us this one is different, so it
  // stops following. On an edit it never follows at all: a wallet already on
  // file must not be overwritten by a phone field nobody meant to change.
  useEffect(() => {
    if (editId || dcTouched) return;
    setForm((current) =>
      current.dc_account === current.contact_phone
        ? current
        : { ...current, dc_account: current.contact_phone },
    );
  }, [form.contact_phone, editId, dcTouched]);

  const createMutation = useMutation({
    mutationFn: (formData: FormData) => {
      const payload = {
        title: formData.title,
        description: formData.description || undefined,
        category_id: formData.category_id!,
        city_id: formData.city_id!,
        district_id: formData.district_id || undefined,
        price: Number(formData.price),
        price_unit: formData.price_unit as any,
        deposit: formData.deposit ? Number(formData.deposit) : 0,
        address: formData.address || undefined,
        // Sent even when null: on edit that is how an owner clears a pin
        // they placed by mistake (the API treats an explicit null as "set
        // to nothing", not as "leave it alone").
        latitude: formData.latitude,
        longitude: formData.longitude,
        rental_rules: formData.rules || undefined,
        contact_name: formData.contact_name || undefined,
        contact_phone: formData.contact_phone || undefined,
        image_urls: formData.image_urls,
        // Blank is omitted, not sent as empty: posting without touching the
        // field must not clear the wallet already on the owner's profile.
        dc_account: asDcDestination(formData.dc_account) || undefined,
      };
      return editId ? listings.update(editId, payload) : listings.create(payload);
    },
    onSuccess: (data) => {
      toast.success(editId ? t('createListing.updated') : t('createListing.published'));
      // Every page that shows listings has to hear about this one — the
      // invalidation list lives in one place for that reason.
      invalidateListingQueries(queryClient);
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
    const remaining = 8 - form.image_urls.length - previews.length;
    if (remaining <= 0) {
      toast.error(t('createListing.maxPhotos'));
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    const locals = toUpload.map((f) => ({
      key: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      url: URL.createObjectURL(f),
    }));
    setPreviews((p) => [...p, ...locals]);
    setUploadingImages(true);
    setUploadProgress({ done: 0, total: toUpload.length });
    try {
      const prepared = await Promise.all(toUpload.map((f) => compressImage(f)));
      let done = 0;
      const urls = await Promise.all(
        prepared.map(async (file) => {
          const result = await upload.uploadImage(file);
          done += 1;
          setUploadProgress({ done, total: prepared.length });
          return result.image_url;
        }),
      );
      setPreviews((p) => {
        p.filter((x) => locals.some((l) => l.key === x.key)).forEach((x) => URL.revokeObjectURL(x.url));
        return p.filter((x) => !locals.some((l) => l.key === x.key));
      });
      updateForm({ image_urls: [...form.image_urls, ...urls] });
    } catch {
      setPreviews((p) => {
        p.filter((x) => locals.some((l) => l.key === x.key)).forEach((x) => URL.revokeObjectURL(x.url));
        return p.filter((x) => !locals.some((l) => l.key === x.key));
      });
      toast.error(t('createListing.uploadError'));
    } finally {
      setUploadingImages(false);
      setUploadProgress(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) {
      handleImageUpload(e.dataTransfer.files);
    }
  };

  // Ctrl+V anywhere on this page: an image in the clipboard goes through the
  // very same upload pipeline as the picker and the drop zone; text pastes
  // keep their default behaviour.
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) files.push(file);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        void handleImageUpload(files);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.image_urls.length, previews.length]);

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
          onClick={() => (step === 0 ? navigate(previousPath(location.pathname) || '/') : setStep(step - 1))}
          className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 hover:text-[#1A1A2E] dark:hover:text-white mb-6 transition-colors"
        >
          <ChevronLeft size={16} />
          {step === 0 ? t('common.back') : STEPS[step - 1]}
        </button>

        <div className="bg-white dark:bg-[#1A1A2E] rounded-2xl border border-gray-200 dark:border-white/10 p-6 mb-6">
          <h1 className="text-2xl font-bold text-[#1A1A2E] dark:text-white mb-6">{editId ? t('createListing.editTitle') : t('createListing.title')}</h1>
          <div className="flex items-center gap-1 mb-2">
            {STEPS.map((label, i) => (
              <div key={i} className="flex-1">
                <div className={`h-1.5 rounded-full transition-colors ${i <= step ? 'bg-[var(--accent)]' : 'bg-gray-200 dark:bg-white/10'}`} />
                <span className={`text-[10px] mt-1 block text-center ${i === step ? 'text-[var(--accent)] font-semibold' : 'text-gray-400 dark:text-gray-400'}`}>
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
                <Tag size={20} className="text-[var(--accent)]" />
                {t('createListing.selectCategory')}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {categoryList.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => updateForm({ category_id: cat.id })}
                    className={`p-4 rounded-xl border-2 text-left transition-all ${
                      form.category_id === cat.id
                        ? 'border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.05)] shadow-md shadow-[rgb(var(--accent-rgb)/0.1)]'
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
                <FileText size={20} className="text-[var(--accent)]" />
                {t('createListing.info')}
              </h2>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.titleLabel')}</label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateForm({ title: e.target.value })}
                  placeholder={t('createListing.titlePlaceholder')}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.3)] focus:border-[var(--accent)] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.descriptionLabel')}</label>
                <textarea
                  value={form.description}
                  onChange={(e) => updateForm({ description: e.target.value })}
                  rows={5}
                  placeholder={t('createListing.descriptionPlaceholder')}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.3)] focus:border-[var(--accent)] outline-none transition resize-none"
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
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.3)] focus:border-[var(--accent)] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.contactPhone')}</label>
                  <input
                    type="tel"
                    value={form.contact_phone}
                    onChange={(e) => updateForm({ contact_phone: e.target.value })}
                    placeholder={t('createListing.contactPhonePlaceholder')}
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.3)] focus:border-[var(--accent)] outline-none transition"
                  />
                </div>
              </div>
              <div className="mt-4">
                {/* The owner has to understand two things before they post:
                    where the money lands, and that nothing lands without it. */}
                <label className="flex items-center gap-1.5 text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                  <Wallet className="w-3.5 h-3.5" />
                  {t('createListing.dcAccount')}
                </label>
                <input
                  type="tel"
                  inputMode="tel"
                  value={form.dc_account}
                  onChange={(e) => {
                    setDcTouched(true);
                    updateForm({ dc_account: e.target.value });
                  }}
                  placeholder={t('createListing.dcAccountPlaceholder')}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.3)] focus:border-[var(--accent)] outline-none transition"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5 leading-relaxed">{t('createListing.dcAccountHint')}</p>
                <div className="mt-2 flex items-start gap-2 rounded-xl border border-red-200 dark:border-red-500/25 bg-red-50 dark:bg-red-500/10 px-3 py-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-500" />
                  <p className="text-xs leading-relaxed text-red-600 dark:text-red-400">{t('createListing.dcAccountWarning')}</p>
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-4">
                <Camera size={20} className="text-[var(--accent)]" />
                {t('createListing.photos', { count: form.image_urls.length + previews.length })}
              </h2>

              <div
                onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
                  dragOver ? 'border-[var(--accent)] bg-[rgb(var(--accent-rgb)/0.05)]' : 'border-gray-300 dark:border-white/20 hover:border-[var(--accent)] dark:hover:border-[var(--accent)] hover:bg-gray-50 dark:hover:bg-white/5'
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
                <Upload size={32} className={`mx-auto mb-3 ${dragOver ? 'text-[var(--accent)]' : 'text-gray-400'}`} />
                <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                  {uploadingImages
                    ? `${t('createListing.uploading')}${uploadProgress ? ` ${uploadProgress.done}/${uploadProgress.total}` : ''}`
                    : t('createListing.uploadHint')}
                </p>
                <p className="text-xs text-gray-400 mt-1">{t('createListing.uploadFormatHint')}</p>
              </div>

              {(form.image_urls.length > 0 || previews.length > 0) && (
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
                        <div className="absolute top-1 left-1 bg-[var(--accent)] text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          {t('createListing.mainPhoto')}
                        </div>
                      )}
                    </div>
                  ))}
                  {previews.map((pv) => (
                    <div key={pv.key} className="relative aspect-square rounded-xl overflow-hidden border border-[rgb(var(--accent-rgb)/0.4)] bg-gray-100 dark:bg-white/5">
                      <img src={pv.url} alt="" className="w-full h-full object-cover opacity-70" />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                        <Loader2 size={22} className="text-white animate-spin" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-4">
                <DollarSign size={20} className="text-[var(--accent)]" />
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
                    className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.3)] focus:border-[var(--accent)] outline-none transition"
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
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.3)] focus:border-[var(--accent)] outline-none transition"
                />
              </div>
              <p className="text-xs text-gray-400">{t('createListing.currencyNote')}</p>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-4">
                <MapPin size={20} className="text-[var(--accent)]" />
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
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.3)] focus:border-[var(--accent)] outline-none transition"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.exactLocation')}</label>
                <LocationPicker
                  latitude={form.latitude}
                  longitude={form.longitude}
                  cityName={cityList.find((c) => c.id === form.city_id)?.name}
                  onChange={(coords) => updateForm(coords)}
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#1A1A2E] dark:text-white flex items-center gap-2 mb-4">
                <Gavel size={20} className="text-[var(--accent)]" />
                {t('createListing.rules')}
              </h2>
              <div>
                <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">{t('createListing.rentalRules')}</label>
                <textarea
                  value={form.rules}
                  onChange={(e) => updateForm({ rules: e.target.value })}
                  rows={5}
                  placeholder={t('createListing.rulesPlaceholder')}
                  className="w-full border border-gray-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-[#1A1A2E] dark:text-white dark:bg-white/5 focus:ring-2 focus:ring-[rgb(var(--accent-rgb)/0.3)] focus:border-[var(--accent)] outline-none transition resize-none"
                />
              </div>
            </div>
          )}

          <div className="flex justify-between mt-8 pt-6 border-t border-gray-100 dark:border-white/10">
            <button
              onClick={() => step === 0 ? navigate(previousPath(location.pathname) || '/') : setStep(step - 1)}
              className="flex items-center gap-2 text-sm font-medium text-gray-500 hover:text-[#1A1A2E] transition-colors"
            >
              <ChevronLeft size={16} />
              {t('common.back')}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-gray-300 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-[rgb(var(--accent-rgb)/0.2)]"
              >
                {t('common.next')}
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => createMutation.mutate(form)}
                disabled={createMutation.isPending}
                className="flex items-center gap-2 bg-[var(--accent)] hover:bg-[var(--accent-hover)] disabled:bg-gray-300 text-white font-semibold py-2.5 px-6 rounded-xl transition-all duration-200 shadow-lg shadow-[rgb(var(--accent-rgb)/0.2)]"
              >
                {createMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check size={16} />
                )}
                {editId ? t('createListing.save') : t('createListing.publish')}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
