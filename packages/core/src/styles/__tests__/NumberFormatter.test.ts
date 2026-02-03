import { describe, it, expect, beforeEach } from 'vitest';
import {
  NumberFormatter,
  createNumberFormatter,
  formatValue,
  formatNumber,
  formatDate,
  BuiltInFormats,
  getFormatCategory,
  DEFAULT_LOCALE,
} from '../NumberFormatter';

describe('NumberFormatter', () => {
  let formatter: NumberFormatter;

  beforeEach(() => {
    formatter = new NumberFormatter();
  });

  describe('General format', () => {
    it('should format integers', () => {
      expect(formatter.format(123, 'General')).toBe('123');
      expect(formatter.format(0, 'General')).toBe('0');
      expect(formatter.format(-456, 'General')).toBe('-456');
    });

    it('should format decimals', () => {
      expect(formatter.format(123.456, 'General')).toBe('123.456');
      expect(formatter.format(0.5, 'General')).toBe('0.5');
    });

    it('should format large numbers in scientific notation', () => {
      const result = formatter.format(123456789012, 'General');
      expect(result).toMatch(/E\+/);
    });

    it('should format small numbers in scientific notation', () => {
      const result = formatter.format(0.00001, 'General');
      expect(result).toMatch(/E/);
    });

    it('should format strings', () => {
      expect(formatter.format('hello', 'General')).toBe('hello');
    });

    it('should handle null and undefined', () => {
      expect(formatter.format(null, 'General')).toBe('');
      expect(formatter.format(undefined, 'General')).toBe('');
    });
  });

  describe('Number formats', () => {
    it('should format with fixed decimal places', () => {
      expect(formatter.format(123, '0.00')).toBe('123.00');
      expect(formatter.format(123.4, '0.00')).toBe('123.40');
      expect(formatter.format(123.456, '0.00')).toBe('123.46');
    });

    it('should format with thousands separator', () => {
      expect(formatter.format(1234, '#,##0')).toBe('1,234');
      expect(formatter.format(1234567, '#,##0')).toBe('1,234,567');
      expect(formatter.format(123, '#,##0')).toBe('123');
    });

    it('should format with thousands and decimals', () => {
      expect(formatter.format(1234.56, '#,##0.00')).toBe('1,234.56');
      expect(formatter.format(1234567.89, '#,##0.00')).toBe('1,234,567.89');
    });

    it('should format negative numbers', () => {
      expect(formatter.format(-1234.56, '#,##0.00')).toBe('-1,234.56');
    });

    it('should handle # placeholder (optional digit)', () => {
      // Zero with only # placeholders shows the zero (Excel behavior)
      expect(formatter.format(0, '#')).toBe('0');
      expect(formatter.format(5, '#')).toBe('5');
      expect(formatter.format(0.5, '#.#')).toBe('0.5');
    });

    it('should handle 0 placeholder (required digit)', () => {
      expect(formatter.format(5, '00')).toBe('05');
      expect(formatter.format(5, '000')).toBe('005');
    });
  });

  describe('Currency formats', () => {
    it('should format with currency symbol', () => {
      expect(formatter.format(1234.56, '$#,##0.00')).toBe('$1,234.56');
    });

    it('should format negative currency', () => {
      expect(formatter.format(-1234.56, '$#,##0.00')).toBe('-$1,234.56');
    });

    it('should format with different sections for negative', () => {
      expect(formatter.format(-1234.56, '$#,##0.00;($#,##0.00)')).toBe('($1,234.56)');
    });
  });

  describe('Percentage formats', () => {
    it('should format as percentage', () => {
      expect(formatter.format(0.5, '0%')).toBe('50%');
      expect(formatter.format(0.125, '0.00%')).toBe('12.50%');
      expect(formatter.format(1, '0%')).toBe('100%');
    });

    it('should format small percentages', () => {
      expect(formatter.format(0.001, '0.00%')).toBe('0.10%');
    });
  });

  describe('Scientific formats', () => {
    it('should format in scientific notation', () => {
      expect(formatter.format(1234, '0.00E+00')).toBe('1.23E+3');
      expect(formatter.format(0.00123, '0.00E+00')).toBe('1.23E-3');
    });

    it('should handle lowercase e', () => {
      expect(formatter.format(1234, '0.00e+00')).toBe('1.23e+3');
    });
  });

  describe('Date formats', () => {
    it('should format short date', () => {
      // Serial date for January 15, 2024
      const serial = formatter.dateToSerial(new Date(2024, 0, 15));
      expect(formatter.format(serial, 'm/d/yyyy')).toBe('1/15/2024');
    });

    it('should format with leading zeros', () => {
      const serial = formatter.dateToSerial(new Date(2024, 0, 5));
      expect(formatter.format(serial, 'mm/dd/yyyy')).toBe('01/05/2024');
    });

    it('should format month names', () => {
      const serial = formatter.dateToSerial(new Date(2024, 0, 15));
      expect(formatter.format(serial, 'mmm d, yyyy')).toBe('Jan 15, 2024');
      expect(formatter.format(serial, 'mmmm d, yyyy')).toBe('January 15, 2024');
    });

    it('should format day names', () => {
      // January 15, 2024 is a Monday
      const serial = formatter.dateToSerial(new Date(2024, 0, 15));
      expect(formatter.format(serial, 'ddd')).toBe('Mon');
      expect(formatter.format(serial, 'dddd')).toBe('Monday');
    });

    it('should format two-digit year', () => {
      const serial = formatter.dateToSerial(new Date(2024, 0, 15));
      expect(formatter.format(serial, 'yy')).toBe('24');
    });

    it('should format Date objects', () => {
      const date = new Date(2024, 0, 15);
      expect(formatter.format(date, 'm/d/yyyy')).toBe('1/15/2024');
    });
  });

  describe('Time formats', () => {
    it('should format time with AM/PM', () => {
      // Serial date with time (2:30:45 PM)
      const serial = formatter.dateToSerial(new Date(2024, 0, 15, 14, 30, 45));
      const result = formatter.format(serial, 'h:mm:ss AM/PM');
      expect(result).toBe('2:30:45 PM');
    });

    it('should format 24-hour time', () => {
      const serial = formatter.dateToSerial(new Date(2024, 0, 15, 14, 30, 45));
      const result = formatter.format(serial, 'hh:mm:ss');
      expect(result).toBe('14:30:45');
    });

    it('should format elapsed time', () => {
      // 25.5 hours = 25:30:00
      const serial = 25.5 / 24; // ~1.0625 days
      const result = formatter.format(serial, '[h]:mm:ss');
      expect(result).toBe('25:30:00');
    });
  });

  describe('Multiple sections', () => {
    it('should use different formats for positive/negative/zero', () => {
      const format = '#,##0;(#,##0);"-"';
      expect(formatter.format(1234, format)).toBe('1,234');
      expect(formatter.format(-1234, format)).toBe('(1,234)');
      expect(formatter.format(0, format)).toBe('-');
    });

    it('should handle text section', () => {
      const format = '0.00;-0.00;0;@" text"';
      expect(formatter.format('hello', format)).toBe('hello text');
    });
  });

  describe('Color codes', () => {
    it('should extract color from format', () => {
      const color = formatter.getColor(-100, '#,##0;[Red](#,##0)');
      expect(color).toBe('red');
    });

    it('should return undefined for no color', () => {
      const color = formatter.getColor(100, '#,##0');
      expect(color).toBeUndefined();
    });
  });

  describe('Quoted strings', () => {
    it('should preserve quoted strings', () => {
      expect(formatter.format(1234, '"Value: "#,##0')).toBe('Value: 1,234');
      expect(formatter.format(100, '0" units"')).toBe('100 units');
    });
  });

  describe('Text format', () => {
    it('should format as text with @', () => {
      expect(formatter.format('hello', '@')).toBe('hello');
      expect(formatter.format(123, '@')).toBe('123');
    });
  });

  describe('Date/Time serial conversion', () => {
    it('should convert Date to serial', () => {
      // January 1, 1900 should be serial 1
      const serial = formatter.dateToSerial(new Date(1900, 0, 1));
      expect(serial).toBe(1);
    });

    it('should convert serial to Date', () => {
      // Serial 1 should be January 1, 1900
      const date = formatter.serialToDate(1);
      expect(date.getFullYear()).toBe(1900);
      expect(date.getMonth()).toBe(0);
      expect(date.getDate()).toBe(1);
    });

    it('should handle dates after Feb 28, 1900', () => {
      // Account for Excel leap year bug
      const serial = formatter.dateToSerial(new Date(1900, 2, 1)); // March 1, 1900
      // March 1 is day 61 in Excel (due to the leap year bug)
      expect(serial).toBe(61);
    });

    it('should round-trip dates correctly', () => {
      const original = new Date(2024, 0, 15, 14, 30, 45);
      const serial = formatter.dateToSerial(original);
      const roundTripped = formatter.serialToDate(serial);
      expect(roundTripped.getFullYear()).toBe(2024);
      expect(roundTripped.getMonth()).toBe(0);
      expect(roundTripped.getDate()).toBe(15);
      expect(roundTripped.getHours()).toBe(14);
      expect(roundTripped.getMinutes()).toBe(30);
      expect(roundTripped.getSeconds()).toBe(45);
    });
  });

  describe('Locale support', () => {
    it('should use custom locale', () => {
      const germanFormatter = new NumberFormatter({
        decimalSeparator: ',',
        thousandsSeparator: '.',
      });
      expect(germanFormatter.format(1234.56, '#,##0.00')).toBe('1.234,56');
    });

    it('should update locale', () => {
      formatter.setLocale({ decimalSeparator: ',' });
      expect(formatter.format(123.45, '0.00')).toBe('123,45');
    });

    it('should get current locale', () => {
      const locale = formatter.getLocale();
      expect(locale.decimalSeparator).toBe('.');
    });
  });

  describe('parse', () => {
    it('should parse formatted numbers', () => {
      expect(formatter.parse('1,234.56', '#,##0.00')).toBeCloseTo(1234.56);
    });

    it('should parse percentages', () => {
      expect(formatter.parse('50%', '0%')).toBeCloseTo(0.5);
    });

    it('should parse negative in parentheses', () => {
      expect(formatter.parse('(1,234.56)', '#,##0.00')).toBeCloseTo(-1234.56);
    });

    it('should return null for invalid input', () => {
      expect(formatter.parse('abc', '#,##0')).toBeNull();
      expect(formatter.parse('', '#,##0')).toBeNull();
    });
  });
});

describe('Convenience functions', () => {
  it('formatValue should format any value', () => {
    expect(formatValue(1234.56, '#,##0.00')).toBe('1,234.56');
  });

  it('formatNumber should format numbers', () => {
    expect(formatNumber(1234, '#,##0')).toBe('1,234');
  });

  it('formatDate should format dates', () => {
    const date = new Date(2024, 0, 15);
    expect(formatDate(date, 'm/d/yyyy')).toBe('1/15/2024');
  });

  it('createNumberFormatter should create a new instance', () => {
    const f = createNumberFormatter({ decimalSeparator: ',' });
    expect(f.format(1.5, '0.0')).toBe('1,5');
  });
});

describe('BuiltInFormats', () => {
  it('should have expected formats', () => {
    expect(BuiltInFormats.GENERAL).toBe('General');
    expect(BuiltInFormats.NUMBER).toBe('#,##0.00');
    expect(BuiltInFormats.CURRENCY).toBe('$#,##0.00');
    expect(BuiltInFormats.PERCENT).toBe('0%');
    expect(BuiltInFormats.SCIENTIFIC).toBe('0.00E+00');
    expect(BuiltInFormats.DATE_SHORT).toBe('m/d/yyyy');
    expect(BuiltInFormats.TIME_SHORT).toBe('h:mm AM/PM');
    expect(BuiltInFormats.TEXT).toBe('@');
  });
});

describe('getFormatCategory', () => {
  it('should identify general format', () => {
    expect(getFormatCategory('General')).toBe('general');
    expect(getFormatCategory('')).toBe('general');
  });

  it('should identify number format', () => {
    expect(getFormatCategory('#,##0')).toBe('number');
    expect(getFormatCategory('0.00')).toBe('number');
  });

  it('should identify currency format', () => {
    expect(getFormatCategory('$#,##0')).toBe('currency');
  });

  it('should identify percentage format', () => {
    expect(getFormatCategory('0%')).toBe('percentage');
  });

  it('should identify scientific format', () => {
    expect(getFormatCategory('0.00E+00')).toBe('scientific');
  });

  it('should identify date format', () => {
    expect(getFormatCategory('m/d/yyyy')).toBe('date');
    expect(getFormatCategory('yyyy-mm-dd')).toBe('date');
  });

  it('should identify time format', () => {
    expect(getFormatCategory('h:mm:ss')).toBe('time');
    expect(getFormatCategory('[h]:mm:ss')).toBe('time');
  });

  it('should identify text format', () => {
    expect(getFormatCategory('@')).toBe('text');
  });
});

describe('DEFAULT_LOCALE', () => {
  it('should have US English defaults', () => {
    expect(DEFAULT_LOCALE.decimalSeparator).toBe('.');
    expect(DEFAULT_LOCALE.thousandsSeparator).toBe(',');
    expect(DEFAULT_LOCALE.currencySymbol).toBe('$');
    expect(DEFAULT_LOCALE.monthNames[0]).toBe('January');
    expect(DEFAULT_LOCALE.dayNames[0]).toBe('Sunday');
  });
});
