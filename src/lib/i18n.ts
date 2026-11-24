import type { Language, OrderStatus, ProductVariant } from '../types';

export function pickLang(bn: string | undefined, en: string | undefined, lang: Language): string {
  if (lang === 'bn') return (bn && bn.trim()) || en || '';
  return (en && en.trim()) || bn || '';
}

const BN_DIGITS = ['০', '১', '২', '৩', '৪', '৫', '৬', '৭', '৮', '৯'];

export function toBanglaDigits(input: string | number): string {
  return String(input).replace(/\d/g, (d) => BN_DIGITS[Number(d)] ?? d);
}

export function formatBDT(amount: number | null | undefined, lang: Language = 'en'): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return lang === 'bn' ? 'মূল্য নির্ধারিত হয়নি' : 'Price on request';
  }
  const formatted = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
  return lang === 'bn' ? `৳${toBanglaDigits(formatted)}` : `৳${formatted}`;
}

export function formatWhatsAppLink(rawPhone: string, message?: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  let normalized = digits;
  if (digits.startsWith('0')) {
    normalized = `880${digits.slice(1)}`;
  } else if (!digits.startsWith('880')) {
    normalized = `880${digits}`;
  }
  const base = `https://wa.me/${normalized}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}

export function calculateVariantUnitPrice(
  variant: ProductVariant,
  quantity: number
): { unitPrice: number; isWholesale: boolean; appliedTierLabel?: string } {
  const retail = variant.price ?? 0;
  let bestPrice = retail;
  let isWholesale = false;
  let appliedTierLabel: string | undefined;

  if (
    variant.wholesalePrice !== null &&
    variant.wholesalePrice !== undefined &&
    variant.wholesaleMinQty &&
    quantity >= variant.wholesaleMinQty &&
    variant.wholesalePrice < bestPrice
  ) {
    bestPrice = variant.wholesalePrice;
    isWholesale = true;
    appliedTierLabel = `Wholesale (${variant.wholesaleMinQty}+)`;
  }

  if (variant.bulkTiers && variant.bulkTiers.length > 0) {
    for (const tier of variant.bulkTiers) {
      if (quantity >= tier.minQty && tier.unitPrice < bestPrice) {
        bestPrice = tier.unitPrice;
        isWholesale = true;
        appliedTierLabel = tier.labelEn || `Bulk (${tier.minQty}+)`;
      }
    }
  }

  return { unitPrice: bestPrice, isWholesale, appliedTierLabel };
}

export const ORDER_STATUS_META: Record<
  OrderStatus,
  { labelBn: string; labelEn: string; colorClass: string; stepIndex: number }
> = {
  pending: {
    labelBn: 'অপেক্ষমাণ',
    labelEn: 'Pending',
    colorClass: 'text-amber-700 bg-amber-50 border-amber-200',
    stepIndex: 0,
  },
  confirmed: {
    labelBn: 'নিশ্চিত',
    labelEn: 'Confirmed',
    colorClass: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    stepIndex: 1,
  },
  processing: {
    labelBn: 'প্রস্তুত হচ্ছে',
    labelEn: 'Processing',
    colorClass: 'text-sky-700 bg-sky-50 border-sky-200',
    stepIndex: 2,
  },
  ready_to_ship: {
    labelBn: 'পাঠানোর জন্য প্রস্তুত',
    labelEn: 'Ready to Ship',
    colorClass: 'text-indigo-700 bg-indigo-50 border-indigo-200',
    stepIndex: 3,
  },
  shipped: {
    labelBn: 'কুরিয়ারে পাঠানো হয়েছে',
    labelEn: 'Shipped',
    colorClass: 'text-teal-700 bg-teal-50 border-teal-200',
    stepIndex: 4,
  },
  delivered: {
    labelBn: 'ডেলিভারি সম্পন্ন',
    labelEn: 'Delivered',
    colorClass: 'text-green-800 bg-green-100 border-green-300',
    stepIndex: 5,
  },
  cancelled: {
    labelBn: 'বাতিল',
    labelEn: 'Cancelled',
    colorClass: 'text-red-700 bg-red-50 border-red-200',
    stepIndex: -1,
  },
  returned: {
    labelBn: 'রিটার্ন হয়েছে',
    labelEn: 'Returned',
    colorClass: 'text-slate-700 bg-slate-100 border-slate-300',
    stepIndex: -1,
  },
};

export const BANGLADESH_DISTRICTS: string[] = [
  'Dhaka',
  'Chattogram',
  'Gazipur',
  'Narayanganj',
  'Sylhet',
  'Rajshahi',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Mymensingh',
  'Cumilla',
  'Bogura',
  'Jashore',
  'Cox\'s Bazar',
  'Brahmanbaria',
  'Tangail',
  'Narsingdi',
  'Dinajpur',
  'Feni',
  'Noakhali',
  'Kushtia',
  'Pabna',
  'Sirajganj',
  'Faridpur',
  'Jamalpur',
  'Kishoreganj',
  'Manikganj',
  'Munshiganj',
  'Madaripur',
  'Gopalganj',
  'Shariatpur',
  'Rajbari',
  'Bagerhat',
  'Chuadanga',
  'Jhenaidah',
  'Magura',
  'Meherpur',
  'Narail',
  'Satkhira',
  'Habiganj',
  'Moulvibazar',
  'Sunamganj',
  'Bandarban',
  'Chandpur',
  'Khagrachhari',
  'Lakshmipur',
  'Rangamati',
  'Joypurhat',
  'Naogaon',
  'Natore',
  'Chapainawabganj',
  'Gaibandha',
  'Kurigram',
  'Lalmonirhat',
  'Nilphamari',
  'Panchagarh',
  'Thakurgaon',
  'Barguna',
  'Bhola',
  'Jhalokati',
  'Patuakhali',
  'Pirojpur',
  'Netrokona',
  'Sherpur',
];

export function formatFirestoreDate(val: unknown, lang: Language = 'en'): string {
  if (!val) return '—';
  let date: Date | null = null;
  if (val instanceof Date) {
    date = val;
  } else if (typeof val === 'object' && val !== null && 'toDate' in val && typeof (val as { toDate: () => Date }).toDate === 'function') {
    date = (val as { toDate: () => Date }).toDate();
  } else if (typeof val === 'string' || typeof val === 'number') {
    date = new Date(val);
  }
  if (!date || Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(lang === 'bn' ? 'bn-BD' : 'en-GB', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}
