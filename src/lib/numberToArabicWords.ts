// Converts a numeric amount (EGP) into Arabic words, e.g. "فقط عشرة آلاف وأربعمائة وواحد وثمانون جنيه مصري وعشرة قروش لاغير"
// Used on the printable invoice to mirror the paper "بيان بيع" layout.

const ones = [
  '', 'واحد', 'اثنان', 'ثلاثة', 'أربعة', 'خمسة', 'ستة', 'سبعة', 'ثمانية', 'تسعة',
  'عشرة', 'أحد عشر', 'اثنا عشر', 'ثلاثة عشر', 'أربعة عشر', 'خمسة عشر',
  'ستة عشر', 'سبعة عشر', 'ثمانية عشر', 'تسعة عشر',
];

const tens = [
  '', '', 'عشرون', 'ثلاثون', 'أربعون', 'خمسون', 'ستون', 'سبعون', 'ثمانون', 'تسعون',
];

const hundreds = [
  '', 'مائة', 'مائتان', 'ثلاثمائة', 'أربعمائة', 'خمسمائة', 'ستمائة', 'سبعمائة', 'ثمانمائة', 'تسعمائة',
];

function threeDigitsToWords(num: number): string {
  const parts: string[] = [];
  const h = Math.floor(num / 100);
  const rest = num % 100;

  if (h > 0) parts.push(hundreds[h]);

  if (rest > 0) {
    if (rest < 20) {
      parts.push(ones[rest]);
    } else {
      const t = Math.floor(rest / 10);
      const o = rest % 10;
      if (o > 0) {
        parts.push(`${ones[o]} و${tens[t]}`);
      } else {
        parts.push(tens[t]);
      }
    }
  }

  return parts.join(' و');
}

const scales = [
  { value: 1_000_000_000, singular: 'مليار', dual: 'ملياران', plural: 'مليارات' },
  { value: 1_000_000, singular: 'مليون', dual: 'مليونان', plural: 'ملايين' },
  { value: 1_000, singular: 'ألف', dual: 'ألفان', plural: 'آلاف' },
];

function integerToWords(num: number): string {
  if (num === 0) return 'صفر';

  let remaining = num;
  const segments: string[] = [];

  for (const scale of scales) {
    const count = Math.floor(remaining / scale.value);
    if (count > 0) {
      remaining %= scale.value;
      if (count === 1) {
        segments.push(scale.singular);
      } else if (count === 2) {
        segments.push(scale.dual);
      } else if (count >= 3 && count <= 10) {
        segments.push(`${threeDigitsToWords(count)} ${scale.plural}`);
      } else {
        segments.push(`${threeDigitsToWords(count)} ${scale.singular}`);
      }
    }
  }

  if (remaining > 0) {
    segments.push(threeDigitsToWords(remaining));
  }

  return segments.join(' و');
}

/**
 * Converts an EGP amount to an Arabic words string suitable for the
 * "فقط وقدره ... لاغير" line on a printed invoice.
 */
export function amountToArabicWords(amount: number): string {
  const safeAmount = Math.max(0, amount);
  const pounds = Math.floor(safeAmount);
  const piastres = Math.round((safeAmount - pounds) * 100);

  const poundsWords = integerToWords(pounds);
  const poundsLabel = pounds === 1 ? 'جنيه مصري' : pounds === 2 ? 'جنيهان مصريان' : 'جنيه مصري';

  let result = `${poundsWords} ${poundsLabel}`;

  if (piastres > 0) {
    const piastresWords = integerToWords(piastres);
    const piastresLabel = piastres === 1 ? 'قرش' : 'قرش';
    result += ` و${piastresWords} ${piastresLabel}`;
  }

  return `فقط وقدره ${result} لا غير`;
}
