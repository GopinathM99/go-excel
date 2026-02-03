/**
 * NumberFormatter - Handles Excel-style number formatting
 *
 * Format string syntax:
 * - Sections separated by semicolons: positive;negative;zero;text
 * - # = optional digit placeholder
 * - 0 = required digit placeholder
 * - ? = space for insignificant zeros
 * - . = decimal point
 * - , = thousands separator (or scale by 1000 if at end)
 * - % = multiply by 100 and add percent sign
 * - E+/E- = scientific notation
 * - $ = currency symbol
 * - @ = text placeholder
 * - [color] = color specification
 * - [condition] = conditional formatting
 *
 * Date/Time codes:
 * - m, mm, mmm, mmmm, mmmmm = month
 * - d, dd, ddd, dddd = day
 * - yy, yyyy = year
 * - h, hh = hour
 * - m, mm (after h) = minute
 * - s, ss = second
 * - AM/PM = 12-hour format
 */

/**
 * Locale settings for number formatting
 */
export interface NumberFormatLocale {
  /** Decimal separator character */
  decimalSeparator: string;
  /** Thousands separator character */
  thousandsSeparator: string;
  /** Currency symbol */
  currencySymbol: string;
  /** Currency symbol position: 'prefix' or 'suffix' */
  currencyPosition: 'prefix' | 'suffix';
  /** Date format order */
  dateOrder: 'mdy' | 'dmy' | 'ymd';
  /** Month names */
  monthNames: string[];
  /** Abbreviated month names */
  monthNamesShort: string[];
  /** Day names */
  dayNames: string[];
  /** Abbreviated day names */
  dayNamesShort: string[];
  /** AM/PM strings */
  ampm: [string, string];
}

/**
 * Default US English locale
 */
export const DEFAULT_LOCALE: NumberFormatLocale = {
  decimalSeparator: '.',
  thousandsSeparator: ',',
  currencySymbol: '$',
  currencyPosition: 'prefix',
  dateOrder: 'mdy',
  monthNames: [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ],
  monthNamesShort: [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ],
  dayNames: [
    'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
  ],
  dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  ampm: ['AM', 'PM'],
};

/**
 * Parsed format section
 */
interface FormatSection {
  /** The format pattern */
  pattern: string;
  /** Color specification if any */
  color?: string;
  /** Condition if any (e.g., [>100]) */
  condition?: {
    operator: '>' | '<' | '>=' | '<=' | '=' | '<>';
    value: number;
  };
  /** Whether this is a text format */
  isText: boolean;
  /** Whether this is a date/time format */
  isDateTime: boolean;
  /** Scale factor (each trailing comma divides by 1000) */
  scaleFactor: number;
  /** Whether percentage format */
  isPercentage: boolean;
}

/**
 * Parsed format structure
 */
interface ParsedFormat {
  positive: FormatSection;
  negative: FormatSection;
  zero: FormatSection;
  text: FormatSection;
}

/**
 * Excel serial date epoch
 * Excel's day 1 = January 1, 1900
 * We use December 31, 1899 as our epoch (day 0)
 */
const EXCEL_EPOCH_MS = Date.UTC(1899, 11, 31);

/**
 * NumberFormatter class for Excel-style number formatting
 */
export class NumberFormatter {
  private locale: NumberFormatLocale;
  private formatCache: Map<string, ParsedFormat> = new Map();

  constructor(locale: Partial<NumberFormatLocale> = {}) {
    this.locale = { ...DEFAULT_LOCALE, ...locale };
  }

  /**
   * Format a value according to the format string
   */
  format(value: unknown, formatString: string): string {
    // Handle null/undefined
    if (value === null || value === undefined) {
      return '';
    }

    // Handle General format
    if (formatString === 'General' || formatString === '') {
      return this.formatGeneral(value);
    }

    // Handle text format
    if (formatString === '@') {
      return String(value);
    }

    // Parse the format string
    const parsed = this.parseFormatString(formatString);

    // Handle Date objects first
    if (value instanceof Date) {
      const serial = this.dateToSerial(value);
      const section = this.selectSection(serial, parsed);
      if (section.isDateTime) {
        return this.formatDateTime(serial, section);
      }
      return this.formatNumber(serial, section);
    }

    // Determine which section to use
    const section = this.selectSection(value, parsed);

    // Format according to the section
    if (section.isText) {
      return this.formatText(String(value), section);
    }

    if (typeof value === 'string') {
      // Try to parse as number
      const num = parseFloat(value);
      if (isNaN(num)) {
        return this.formatText(value, parsed.text);
      }
      value = num;
    }

    if (typeof value === 'number') {
      if (section.isDateTime) {
        return this.formatDateTime(value, section);
      }
      return this.formatNumber(value, section);
    }

    return String(value);
  }

  /**
   * Format a value using General format
   */
  private formatGeneral(value: unknown): string {
    if (typeof value === 'number') {
      // Check for very large or very small numbers
      const absVal = Math.abs(value);
      if (absVal >= 1e11 || (absVal < 1e-4 && absVal !== 0)) {
        return value.toExponential(5).replace('e', 'E');
      }
      // Round to reasonable precision to avoid floating point artifacts
      const rounded = parseFloat(value.toPrecision(10));
      return String(rounded);
    }
    if (value instanceof Date) {
      return this.formatDateTime(this.dateToSerial(value), {
        pattern: 'm/d/yyyy h:mm',
        isText: false,
        isDateTime: true,
        scaleFactor: 1,
        isPercentage: false,
      });
    }
    return String(value);
  }

  /**
   * Parse a format string into sections
   */
  private parseFormatString(formatString: string): ParsedFormat {
    const cached = this.formatCache.get(formatString);
    if (cached) return cached;

    // Split into sections (but preserve quoted strings and brackets)
    const sections = this.splitFormatSections(formatString);

    const parseSection = (pattern: string): FormatSection => {
      // Extract color
      let color: string | undefined;
      const colorMatch = pattern.match(/\[(Red|Blue|Green|Yellow|Cyan|Magenta|White|Black)\]/i);
      if (colorMatch) {
        color = colorMatch[1].toLowerCase();
        pattern = pattern.replace(colorMatch[0], '');
      }

      // Extract condition
      let condition: FormatSection['condition'];
      const conditionMatch = pattern.match(/\[([<>=]+)(\d+(?:\.\d+)?)\]/);
      if (conditionMatch) {
        const op = conditionMatch[1] as FormatSection['condition']['operator'];
        const val = parseFloat(conditionMatch[2]);
        condition = { operator: op, value: val };
        pattern = pattern.replace(conditionMatch[0], '');
      }

      // Check for text format
      const isText = pattern.includes('@');

      // Check for date/time tokens
      const isDateTime = this.isDateTimeFormat(pattern);

      // Calculate scale factor (trailing commas)
      let scaleFactor = 1;
      const trailingCommas = pattern.match(/,+$/);
      if (trailingCommas) {
        scaleFactor = Math.pow(1000, trailingCommas[0].length);
        pattern = pattern.replace(/,+$/, '');
      }

      // Check for percentage
      const isPercentage = pattern.includes('%');

      return {
        pattern,
        color,
        condition,
        isText,
        isDateTime,
        scaleFactor,
        isPercentage,
      };
    };

    const result: ParsedFormat = {
      positive: parseSection(sections[0] || 'General'),
      negative: parseSection(sections[1] || sections[0] || 'General'),
      zero: parseSection(sections[2] || sections[0] || 'General'),
      text: parseSection(sections[3] || '@'),
    };

    this.formatCache.set(formatString, result);
    return result;
  }

  /**
   * Split format string into sections, respecting quoted strings
   */
  private splitFormatSections(formatString: string): string[] {
    const sections: string[] = [];
    let current = '';
    let inQuote = false;
    let inBracket = false;

    for (let i = 0; i < formatString.length; i++) {
      const char = formatString[i];

      if (char === '"' && !inBracket) {
        inQuote = !inQuote;
        current += char;
      } else if (char === '[' && !inQuote) {
        inBracket = true;
        current += char;
      } else if (char === ']' && !inQuote) {
        inBracket = false;
        current += char;
      } else if (char === ';' && !inQuote && !inBracket) {
        sections.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    if (current) {
      sections.push(current);
    }

    return sections;
  }

  /**
   * Check if a format pattern contains date/time tokens
   */
  private isDateTimeFormat(pattern: string): boolean {
    // Remove quoted strings and brackets for checking
    const cleaned = pattern.replace(/"[^"]*"/g, '').replace(/\[[^\]]*\]/g, '');

    // Check for date/time tokens - be more lenient with matching
    // Look for year, day, or hour tokens (m is ambiguous between month and minute)
    const dateTimeTokens = /(y{1,4}|d{1,4}|h{1,2}|s{1,2}|AM\/PM|A\/P)/i;
    if (dateTimeTokens.test(cleaned)) {
      return true;
    }

    // Check for m tokens that likely represent months (when combined with d or y)
    if (/m{1,5}/i.test(cleaned) && /[yd]/i.test(cleaned)) {
      return true;
    }

    return false;
  }

  /**
   * Select the appropriate format section based on value
   */
  private selectSection(value: unknown, format: ParsedFormat): FormatSection {
    if (typeof value === 'string' && isNaN(parseFloat(value))) {
      return format.text;
    }

    const num = typeof value === 'number' ? value : parseFloat(String(value));

    if (isNaN(num)) {
      return format.text;
    }

    // Check conditions
    if (format.positive.condition) {
      if (this.evaluateCondition(num, format.positive.condition)) {
        return format.positive;
      }
    }
    if (format.negative.condition) {
      if (this.evaluateCondition(num, format.negative.condition)) {
        return format.negative;
      }
    }

    // Standard positive/negative/zero selection
    if (num > 0) return format.positive;
    if (num < 0) return format.negative;
    return format.zero;
  }

  /**
   * Evaluate a condition
   */
  private evaluateCondition(
    value: number,
    condition: NonNullable<FormatSection['condition']>
  ): boolean {
    switch (condition.operator) {
      case '>': return value > condition.value;
      case '<': return value < condition.value;
      case '>=': return value >= condition.value;
      case '<=': return value <= condition.value;
      case '=': return value === condition.value;
      case '<>': return value !== condition.value;
      default: return false;
    }
  }

  /**
   * Format a number according to the section
   */
  private formatNumber(value: number, section: FormatSection): string {
    let pattern = section.pattern;
    let num = Math.abs(value);

    // Apply scale factor
    if (section.scaleFactor > 1) {
      num = num / section.scaleFactor;
    }

    // Apply percentage
    if (section.isPercentage) {
      num = num * 100;
    }

    // Handle scientific notation
    if (pattern.includes('E+') || pattern.includes('E-') || pattern.includes('e+') || pattern.includes('e-')) {
      return this.formatScientific(value < 0 ? -num : num, pattern);
    }

    // Parse the pattern for numeric formatting
    const result = this.formatNumericPattern(num, pattern, section.isPercentage);

    // Add negative sign if original value was negative and the pattern doesn't contain its own handling
    // Don't add if the pattern has parentheses or explicit negative sign or if this is a negative section
    const hasNegativeHandling = pattern.includes('-') || pattern.includes('(');
    if (value < 0 && !hasNegativeHandling) {
      return '-' + result;
    }

    return result;
  }

  /**
   * Format a number using a numeric pattern
   */
  private formatNumericPattern(num: number, pattern: string, isPercentage: boolean = false): string {
    // Remove quoted strings temporarily and replace with a placeholder marker
    const quotedStrings: string[] = [];
    let tempPattern = pattern.replace(/"([^"]*)"/g, (_, content) => {
      quotedStrings.push(content);
      return `\uFFFD${quotedStrings.length - 1}\uFFFE`;
    });

    // Extract prefix characters (before numeric part) and suffix characters (after numeric part)
    // Include placeholder markers in both prefix and suffix
    const numericPartMatch = tempPattern.match(/^((?:[^#0?.,]|\uFFFD\d+\uFFFE)*)([#0?.,]+)((?:[^#0?.,]|\uFFFD\d+\uFFFE)*)$/);

    let prefix = '';
    let numericFormat = tempPattern;
    let suffix = '';

    if (numericPartMatch) {
      prefix = numericPartMatch[1];
      numericFormat = numericPartMatch[2];
      suffix = numericPartMatch[3];
    }

    // Find the decimal point in the numeric format
    const decimalIndex = numericFormat.indexOf('.');
    let integerPattern: string;
    let decimalPattern: string;

    if (decimalIndex >= 0) {
      integerPattern = numericFormat.substring(0, decimalIndex);
      decimalPattern = numericFormat.substring(decimalIndex + 1);
    } else {
      integerPattern = numericFormat;
      decimalPattern = '';
    }

    // Count decimal places needed
    const decimalPlaces = (decimalPattern.match(/[0#?]/g) || []).length;

    // Round the number
    const roundedNum = decimalPlaces > 0 ? num.toFixed(decimalPlaces) : Math.round(num).toString();
    const [intPart, decPart = ''] = roundedNum.split('.');

    // Format integer part
    const formattedInt = this.formatIntegerPartSimple(intPart, integerPattern);

    // Format decimal part
    const formattedDec = this.formatDecimalPart(decPart, decimalPattern);

    // Combine parts
    let result = prefix + formattedInt;
    if (decimalPattern.match(/[0#?]/)) {
      result += this.locale.decimalSeparator + formattedDec;
    }
    result += suffix;

    // Add percent sign if percentage but not already in suffix
    if (isPercentage && !suffix.includes('%')) {
      result += '%';
    }

    // Restore quoted strings
    result = result.replace(/\uFFFD(\d+)\uFFFE/g, (_, index) => quotedStrings[parseInt(index)]);

    // Replace remaining format characters (but not %)
    result = result.replace(/[#?]/g, '');

    return result;
  }

  /**
   * Simple formatting of integer part (just applies thousands separator if needed)
   */
  private formatIntegerPartSimple(intPart: string, pattern: string): string {
    // Check for thousands separator
    const hasThousands = pattern.includes(',');

    // Get minimum digits from 0 placeholders
    const minDigits = (pattern.match(/0/g) || []).length;

    // Pad with zeros if needed
    let digits = intPart;
    while (digits.length < minDigits) {
      digits = '0' + digits;
    }

    // Add thousands separators
    if (hasThousands) {
      digits = this.addThousandsSeparators(digits);
    }

    return digits;
  }

  /**
   * Format the integer part of a number
   */
  private formatIntegerPart(intPart: string, pattern: string): string {
    // Check for thousands separator
    const hasThousands = pattern.includes(',') && !pattern.endsWith(',');

    // Extract prefix and suffix
    const formatChars = pattern.match(/[#0?,]/g) || [];
    const prefixMatch = pattern.match(/^[^#0?,]*/);
    const suffixMatch = pattern.match(/[^#0?,]*$/);
    const prefix = prefixMatch ? prefixMatch[0] : '';
    const suffix = suffixMatch ? suffixMatch[0] : '';

    // Get the numeric format part
    const numericPart = formatChars.join('').replace(/,/g, '');
    const minDigits = (numericPart.match(/0/g) || []).length;

    // Pad with zeros if needed
    let digits = intPart;
    while (digits.length < minDigits) {
      digits = '0' + digits;
    }

    // Add thousands separators
    if (hasThousands) {
      digits = this.addThousandsSeparators(digits);
    }

    return prefix + digits + suffix;
  }

  /**
   * Add thousands separators to a string of digits
   */
  private addThousandsSeparators(digits: string): string {
    const parts: string[] = [];
    let remaining = digits;

    while (remaining.length > 3) {
      parts.unshift(remaining.slice(-3));
      remaining = remaining.slice(0, -3);
    }

    if (remaining) {
      parts.unshift(remaining);
    }

    return parts.join(this.locale.thousandsSeparator);
  }

  /**
   * Format the decimal part of a number
   */
  private formatDecimalPart(decPart: string, pattern: string): string {
    const formatChars = pattern.match(/[#0?]/g) || [];
    let result = '';

    for (let i = 0; i < formatChars.length; i++) {
      const char = formatChars[i];
      const digit = decPart[i] || '';

      if (char === '0') {
        result += digit || '0';
      } else if (char === '#') {
        result += digit;
      } else if (char === '?') {
        result += digit || ' ';
      }
    }

    return result;
  }

  /**
   * Format a number in scientific notation
   */
  private formatScientific(num: number, pattern: string): string {
    const isUpperCase = pattern.includes('E+') || pattern.includes('E-');
    const showPlusSign = pattern.includes('E+') || pattern.includes('e+');

    // Find decimal places in mantissa
    const mantissaMatch = pattern.match(/([#0?]+)\.?([#0?]*)[Ee]/);
    const decimalPlaces = mantissaMatch ? (mantissaMatch[2] || '').length : 2;

    // Format the number
    const expNotation = num.toExponential(decimalPlaces);
    const [mantissa, exponent] = expNotation.split('e');

    let expPart = parseInt(exponent).toString();
    if (showPlusSign && parseInt(exponent) >= 0) {
      expPart = '+' + expPart;
    }

    const separator = isUpperCase ? 'E' : 'e';
    return mantissa + separator + expPart;
  }

  /**
   * Format text according to the pattern
   */
  private formatText(text: string, section: FormatSection): string {
    let pattern = section.pattern;

    // Handle quoted strings
    const quotedStrings: string[] = [];
    pattern = pattern.replace(/"([^"]*)"/g, (_, content) => {
      quotedStrings.push(content);
      return `\x00${quotedStrings.length - 1}\x00`;
    });

    // Replace @ with the text
    let result = pattern.replace(/@/g, text);

    // Restore quoted strings
    result = result.replace(/\x00(\d+)\x00/g, (_, index) => quotedStrings[parseInt(index)]);

    return result;
  }

  /**
   * Format a date/time value
   */
  private formatDateTime(serialDate: number, section: FormatSection): string {
    const date = this.serialToDate(serialDate);
    let pattern = section.pattern;

    // Handle elapsed time formats like [h]:mm:ss
    if (pattern.includes('[h]') || pattern.includes('[m]') || pattern.includes('[s]')) {
      return this.formatElapsedTime(serialDate, pattern);
    }

    // Extract quoted strings
    const quotedStrings: string[] = [];
    pattern = pattern.replace(/"([^"]*)"/g, (_, content) => {
      quotedStrings.push(content);
      return `\uFFFD${quotedStrings.length - 1}\uFFFD`;
    });

    // Determine if 12-hour format
    const is12Hour = /AM\/PM|A\/P/i.test(pattern);
    const hours24 = date.getHours();
    const hours12 = hours24 % 12 || 12;
    const isPM = hours24 >= 12;

    // Build result by processing the pattern character by character
    let result = '';
    let i = 0;
    let lastWasHour = false;

    while (i < pattern.length) {
      const remaining = pattern.substring(i);

      // Check for multi-character tokens first (longer matches first)
      let matched = false;

      // AM/PM
      if (remaining.match(/^AM\/PM/i)) {
        result += isPM ? this.locale.ampm[1] : this.locale.ampm[0];
        i += 5;
        matched = true;
      }
      // A/P
      else if (remaining.match(/^A\/P/i)) {
        result += isPM ? 'P' : 'A';
        i += 3;
        matched = true;
      }
      // yyyy
      else if (remaining.match(/^yyyy/i)) {
        result += date.getFullYear().toString();
        i += 4;
        matched = true;
      }
      // yy
      else if (remaining.match(/^yy/i)) {
        result += (date.getFullYear() % 100).toString().padStart(2, '0');
        i += 2;
        matched = true;
      }
      // mmmmm (first letter of month)
      else if (remaining.match(/^mmmmm/i)) {
        if (lastWasHour) {
          result += date.getMinutes().toString().padStart(2, '0');
        } else {
          result += this.locale.monthNames[date.getMonth()][0];
        }
        lastWasHour = false;
        i += 5;
        matched = true;
      }
      // mmmm (full month name)
      else if (remaining.match(/^mmmm/i)) {
        if (lastWasHour) {
          result += date.getMinutes().toString().padStart(2, '0');
        } else {
          result += this.locale.monthNames[date.getMonth()];
        }
        lastWasHour = false;
        i += 4;
        matched = true;
      }
      // mmm (short month name)
      else if (remaining.match(/^mmm/i)) {
        if (lastWasHour) {
          result += date.getMinutes().toString().padStart(2, '0');
        } else {
          result += this.locale.monthNamesShort[date.getMonth()];
        }
        lastWasHour = false;
        i += 3;
        matched = true;
      }
      // mm (two-digit month or minute)
      else if (remaining.match(/^mm/i)) {
        if (lastWasHour) {
          result += date.getMinutes().toString().padStart(2, '0');
        } else {
          result += (date.getMonth() + 1).toString().padStart(2, '0');
        }
        lastWasHour = false;
        i += 2;
        matched = true;
      }
      // m (single-digit month or minute)
      else if (remaining.match(/^m/i)) {
        if (lastWasHour) {
          result += date.getMinutes().toString();
        } else {
          result += (date.getMonth() + 1).toString();
        }
        lastWasHour = false;
        i += 1;
        matched = true;
      }
      // dddd (full day name)
      else if (remaining.match(/^dddd/i)) {
        result += this.locale.dayNames[date.getDay()];
        i += 4;
        matched = true;
      }
      // ddd (short day name)
      else if (remaining.match(/^ddd/i)) {
        result += this.locale.dayNamesShort[date.getDay()];
        i += 3;
        matched = true;
      }
      // dd (two-digit day)
      else if (remaining.match(/^dd/i)) {
        result += date.getDate().toString().padStart(2, '0');
        i += 2;
        matched = true;
      }
      // d (single-digit day)
      else if (remaining.match(/^d/i)) {
        result += date.getDate().toString();
        i += 1;
        matched = true;
      }
      // hh (two-digit hour)
      else if (remaining.match(/^hh/i)) {
        result += (is12Hour ? hours12 : hours24).toString().padStart(2, '0');
        lastWasHour = true;
        i += 2;
        matched = true;
      }
      // h (single-digit hour)
      else if (remaining.match(/^h/i)) {
        result += (is12Hour ? hours12 : hours24).toString();
        lastWasHour = true;
        i += 1;
        matched = true;
      }
      // ss (two-digit second)
      else if (remaining.match(/^ss/i)) {
        result += date.getSeconds().toString().padStart(2, '0');
        lastWasHour = false;
        i += 2;
        matched = true;
      }
      // s (single-digit second)
      else if (remaining.match(/^s/i)) {
        result += date.getSeconds().toString();
        lastWasHour = false;
        i += 1;
        matched = true;
      }
      // Placeholder marker
      else if (remaining.match(/^\uFFFD\d+\uFFFD/)) {
        const markerMatch = remaining.match(/^\uFFFD(\d+)\uFFFD/);
        if (markerMatch) {
          result += markerMatch[0];
          i += markerMatch[0].length;
          matched = true;
        }
      }

      if (!matched) {
        result += pattern[i];
        i++;
      }
    }

    // Restore quoted strings
    result = result.replace(/\uFFFD(\d+)\uFFFD/g, (_, index) => quotedStrings[parseInt(index)]);

    return result;
  }

  /**
   * Format elapsed time (e.g., [h]:mm:ss for durations > 24 hours)
   */
  private formatElapsedTime(serialDate: number, pattern: string): string {
    // serialDate represents days, convert to total time components
    const totalHours = Math.floor(serialDate * 24);
    const fractionalHours = (serialDate * 24) - totalHours;
    const totalMinutesFromFraction = Math.floor(fractionalHours * 60);
    const fractionalMinutes = (fractionalHours * 60) - totalMinutesFromFraction;
    const totalSecondsFromFraction = Math.round(fractionalMinutes * 60);

    // Calculate components
    const minutes = totalSecondsFromFraction >= 60 ? totalMinutesFromFraction + 1 : totalMinutesFromFraction;
    const seconds = totalSecondsFromFraction % 60;

    // Recalculate total values
    const totalMinutes = totalHours * 60 + minutes;
    const totalSeconds = totalMinutes * 60 + seconds;

    let result = pattern;

    result = result.replace(/\[h\]/gi, totalHours.toString());
    result = result.replace(/\[m\]/gi, totalMinutes.toString());
    result = result.replace(/\[s\]/gi, totalSeconds.toString());

    result = result.replace(/mm/gi, (minutes % 60).toString().padStart(2, '0'));
    result = result.replace(/m/gi, (minutes % 60).toString());

    result = result.replace(/ss/gi, seconds.toString().padStart(2, '0'));
    result = result.replace(/s/gi, seconds.toString());

    return result;
  }

  /**
   * Convert a JavaScript Date to Excel serial date
   */
  dateToSerial(date: Date): number {
    // Convert to UTC to avoid timezone issues
    const utcDate = Date.UTC(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      date.getHours(),
      date.getMinutes(),
      date.getSeconds(),
      date.getMilliseconds()
    );

    const timeDiff = utcDate - EXCEL_EPOCH_MS;
    let days = timeDiff / (24 * 60 * 60 * 1000);

    // Excel bug: treats 1900 as a leap year, so we add 1 for dates >= March 1, 1900
    // Serial 60 = Feb 29, 1900 (which didn't exist)
    if (days >= 60) {
      days += 1;
    }

    return days;
  }

  /**
   * Convert Excel serial date to JavaScript Date
   */
  serialToDate(serial: number): Date {
    // Excel bug: treats 1900 as a leap year
    // Subtract 1 for dates after the fake Feb 29, 1900
    if (serial >= 61) {
      serial -= 1;
    }

    const milliseconds = serial * 24 * 60 * 60 * 1000;
    const utcTime = EXCEL_EPOCH_MS + milliseconds;

    // Create a local date from UTC components
    const utcDate = new Date(utcTime);
    return new Date(
      utcDate.getUTCFullYear(),
      utcDate.getUTCMonth(),
      utcDate.getUTCDate(),
      utcDate.getUTCHours(),
      utcDate.getUTCMinutes(),
      utcDate.getUTCSeconds(),
      utcDate.getUTCMilliseconds()
    );
  }

  /**
   * Get color from format section
   */
  getColor(value: unknown, formatString: string): string | undefined {
    const parsed = this.parseFormatString(formatString);
    const section = this.selectSection(value, parsed);
    return section.color;
  }

  /**
   * Parse a number from a formatted string
   */
  parse(formattedValue: string, formatString: string): number | null {
    if (!formattedValue || formattedValue.trim() === '') {
      return null;
    }

    // Remove currency symbols and other known characters
    let cleaned = formattedValue
      .replace(/[$\u20AC\u00A3\u00A5]/g, '') // Common currency symbols
      .replace(/%$/, '')
      .replace(/\s/g, '')
      .replace(/,/g, '')
      .replace(/\(([^)]+)\)/, '-$1'); // Parentheses to negative

    const num = parseFloat(cleaned);

    if (isNaN(num)) {
      return null;
    }

    // Adjust for percentage
    if (formattedValue.includes('%')) {
      return num / 100;
    }

    return num;
  }

  /**
   * Set locale for formatting
   */
  setLocale(locale: Partial<NumberFormatLocale>): void {
    this.locale = { ...this.locale, ...locale };
    this.formatCache.clear();
  }

  /**
   * Get current locale
   */
  getLocale(): NumberFormatLocale {
    return { ...this.locale };
  }
}

/**
 * Create a formatter instance with the specified locale
 */
export function createNumberFormatter(locale?: Partial<NumberFormatLocale>): NumberFormatter {
  return new NumberFormatter(locale);
}

/**
 * Default formatter instance
 */
export const defaultFormatter = new NumberFormatter();

/**
 * Convenience function to format a value
 */
export function formatValue(value: unknown, formatString: string): string {
  return defaultFormatter.format(value, formatString);
}

/**
 * Convenience function to format a number
 */
export function formatNumber(value: number, formatString: string): string {
  return defaultFormatter.format(value, formatString);
}

/**
 * Convenience function to format a date
 */
export function formatDate(value: Date | number, formatString: string): string {
  return defaultFormatter.format(value, formatString);
}

/**
 * Built-in format strings
 */
export const BuiltInFormats = {
  // General
  GENERAL: 'General',

  // Number formats
  NUMBER: '#,##0.00',
  NUMBER_INT: '#,##0',
  NUMBER_2DEC: '0.00',
  NUMBER_COMMA_2DEC: '#,##0.00',

  // Currency formats
  CURRENCY: '$#,##0.00',
  CURRENCY_INT: '$#,##0',
  CURRENCY_RED_NEG: '$#,##0.00;[Red]($#,##0.00)',
  ACCOUNTING: '_($* #,##0.00_);_($* (#,##0.00);_($* "-"??_);_(@_)',

  // Percentage formats
  PERCENT: '0%',
  PERCENT_2DEC: '0.00%',

  // Scientific formats
  SCIENTIFIC: '0.00E+00',
  SCIENTIFIC_2DEC: '##0.0E+0',

  // Date formats
  DATE_SHORT: 'm/d/yyyy',
  DATE_MEDIUM: 'mmm d, yyyy',
  DATE_LONG: 'mmmm d, yyyy',
  DATE_FULL: 'dddd, mmmm d, yyyy',
  DATE_ISO: 'yyyy-mm-dd',

  // Time formats
  TIME_SHORT: 'h:mm AM/PM',
  TIME_MEDIUM: 'h:mm:ss AM/PM',
  TIME_24H: 'HH:mm',
  TIME_24H_SEC: 'HH:mm:ss',

  // DateTime formats
  DATETIME: 'm/d/yyyy h:mm',
  DATETIME_SEC: 'm/d/yyyy h:mm:ss',

  // Duration formats
  DURATION_HM: '[h]:mm',
  DURATION_HMS: '[h]:mm:ss',

  // Fraction formats
  FRACTION_1: '# ?/?',
  FRACTION_2: '# ??/??',
  FRACTION_8: '# ?/8',
  FRACTION_16: '# ??/16',
  FRACTION_100: '# ??/100',

  // Text format
  TEXT: '@',

  // Zip code (US)
  ZIP_CODE: '00000',
  ZIP_CODE_PLUS4: '00000-0000',

  // Phone number (US)
  PHONE: '[<=9999999]###-####;(###) ###-####',

  // Social Security Number (US)
  SSN: '000-00-0000',
} as const;

/**
 * Get the format type category from a format string
 */
export function getFormatCategory(
  formatString: string
): 'general' | 'number' | 'currency' | 'percentage' | 'scientific' | 'date' | 'time' | 'fraction' | 'text' {
  if (formatString === 'General' || formatString === '') {
    return 'general';
  }

  // Check for elapsed time first
  if (/\[h\]|\[m\]|\[s\]/i.test(formatString)) {
    return 'time';
  }

  // Clean the format string to check for tokens (remove quoted strings)
  const cleaned = formatString.replace(/"[^"]*"/g, '');

  // Check for time-only formats (h, m after h, s, AM/PM without date tokens)
  const hasTimeTokens = /[hs]|AM\/PM|A\/P/i.test(cleaned);
  const hasDateTokens = /[yd]/i.test(cleaned);

  // If it has h or s but no y or d, it's a time format
  if (hasTimeTokens && !hasDateTokens) {
    return 'time';
  }

  // If it has date tokens (y, d) or both, it's a date format
  if (hasDateTokens || (hasTimeTokens && /m/i.test(cleaned))) {
    if (hasTimeTokens) {
      return 'date'; // datetime is categorized as date
    }
    return 'date';
  }

  // Check for specific patterns
  if (formatString.includes('%')) {
    return 'percentage';
  }

  if (formatString.includes('$') || /[$\u20AC\u00A3\u00A5]/.test(formatString)) {
    return 'currency';
  }

  if (/E[+-]|e[+-]/i.test(formatString)) {
    return 'scientific';
  }

  if (/\?\/|\d+\/\d+/.test(formatString)) {
    return 'fraction';
  }

  if (formatString === '@') {
    return 'text';
  }

  return 'number';
}
