/**
 * Auto-fill pattern detection and value generation.
 *
 * Given a sequence of source values from selected cells, detects patterns
 * (numeric, month names, day names) and generates continuation values.
 * Falls back to cyclic repetition when no pattern is detected.
 */

const FULL_MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const ABBR_MONTHS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

const FULL_DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const ABBR_DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Try to match a value against a cyclical list (months, days).
 * Returns the index in the list if found, or -1.
 * Matching is case-insensitive.
 */
function findInList(value: string, list: string[]): number {
  const lower = value.toLowerCase();
  return list.findIndex((item) => item.toLowerCase() === lower);
}

/**
 * Preserve the casing style of the original value when generating from a list.
 * If the original was all-uppercase, return uppercase; all-lowercase, return lowercase;
 * otherwise return the canonical form from the list.
 */
function matchCase(original: string, canonical: string): string {
  if (original === original.toUpperCase()) return canonical.toUpperCase();
  if (original === original.toLowerCase()) return canonical.toLowerCase();
  return canonical;
}

/**
 * Detect if source values form a sequence from a cyclical list (months or days).
 * Returns a generator function if matched, or null.
 */
function detectCyclicalSequence(
  sourceValues: string[],
  list: string[]
): ((count: number) => string[]) | null {
  if (sourceValues.length === 0) return null;

  const indices = sourceValues.map((v) => findInList(v, list));
  if (indices.some((i) => i === -1)) return null;

  // With a single value, step is 1
  let step = 1;
  if (indices.length > 1) {
    // Compute step from first two values (wrapping around)
    step = ((((indices[1] ?? 0) - (indices[0] ?? 0)) % list.length) + list.length) % list.length;
    if (step === 0) step = list.length; // same value repeated means full cycle step

    // Verify all subsequent values follow the same step
    for (let i = 2; i < indices.length; i++) {
      const expectedStep =
        ((((indices[i] ?? 0) - (indices[i - 1] ?? 0)) % list.length) + list.length) % list.length;
      if (expectedStep === 0 && step === list.length) continue;
      if (expectedStep !== step) return null;
    }
  }

  const lastIndex = indices[indices.length - 1] ?? 0;
  const caseRef = sourceValues[0] ?? '';

  return (count: number) => {
    const result: string[] = [];
    for (let i = 1; i <= count; i++) {
      const idx = (((lastIndex + step * i) % list.length) + list.length) % list.length;
      result.push(matchCase(caseRef, list[idx] ?? ''));
    }
    return result;
  };
}

/**
 * Detect if source values form a numeric arithmetic sequence.
 * Returns a generator function if matched, or null.
 */
function detectNumericSequence(sourceValues: string[]): ((count: number) => string[]) | null {
  if (sourceValues.length === 0) return null;

  const numbers = sourceValues.map((v) => {
    const trimmed = v.trim();
    if (trimmed === '') return NaN;
    const n = Number(trimmed);
    return n;
  });

  if (numbers.some((n) => isNaN(n))) return null;

  // Single number: repeat it
  if (numbers.length === 1) {
    const val = sourceValues[0] ?? '';
    return (count: number) => Array(count).fill(val) as string[];
  }

  // Compute step from first two values
  const step = (numbers[1] ?? 0) - (numbers[0] ?? 0);

  // Verify constant step
  for (let i = 2; i < numbers.length; i++) {
    const diff = (numbers[i] ?? 0) - (numbers[i - 1] ?? 0);
    // Use a small epsilon for floating point comparison
    if (Math.abs(diff - step) > 1e-10) return null;
  }

  const lastValue = numbers[numbers.length - 1] ?? 0;

  // Determine decimal precision from source values to preserve formatting
  const maxDecimals = sourceValues.reduce((max, v) => {
    const parts = v.trim().split('.');
    return Math.max(max, parts.length > 1 ? (parts[1]?.length ?? 0) : 0);
  }, 0);

  const stepDecimals = (() => {
    const parts = String(step).split('.');
    return parts.length > 1 ? (parts[1]?.length ?? 0) : 0;
  })();

  const decimals = Math.max(maxDecimals, stepDecimals);

  return (count: number) => {
    const result: string[] = [];
    for (let i = 1; i <= count; i++) {
      const val = lastValue + step * i;
      result.push(decimals > 0 ? val.toFixed(decimals) : String(val));
    }
    return result;
  };
}

/**
 * Detect a pattern in the source values and generate `fillCount` continuation values.
 *
 * Pattern detection priority:
 * 1. Month names (full or abbreviated)
 * 2. Day names (full or abbreviated)
 * 3. Numeric arithmetic sequence
 * 4. Fallback: cyclic repetition of source values
 *
 * @param sourceValues - Values from the selected cells, in order
 * @param fillCount - Number of new values to generate
 * @returns Array of generated values
 */
export function detectAndFill(sourceValues: string[], fillCount: number): string[] {
  if (fillCount <= 0 || sourceValues.length === 0) return [];

  // Try month names (full)
  const fullMonthGen = detectCyclicalSequence(sourceValues, FULL_MONTHS);
  if (fullMonthGen) return fullMonthGen(fillCount);

  // Try month names (abbreviated)
  const abbrMonthGen = detectCyclicalSequence(sourceValues, ABBR_MONTHS);
  if (abbrMonthGen) return abbrMonthGen(fillCount);

  // Try day names (full)
  const fullDayGen = detectCyclicalSequence(sourceValues, FULL_DAYS);
  if (fullDayGen) return fullDayGen(fillCount);

  // Try day names (abbreviated)
  const abbrDayGen = detectCyclicalSequence(sourceValues, ABBR_DAYS);
  if (abbrDayGen) return abbrDayGen(fillCount);

  // Try numeric sequence
  const numericGen = detectNumericSequence(sourceValues);
  if (numericGen) return numericGen(fillCount);

  // Fallback: cyclic repetition
  const result: string[] = [];
  for (let i = 0; i < fillCount; i++) {
    result.push(sourceValues[i % sourceValues.length] ?? '');
  }
  return result;
}
