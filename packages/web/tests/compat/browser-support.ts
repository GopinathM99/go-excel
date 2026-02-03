import { Page, BrowserContext, Browser } from '@playwright/test';

/**
 * Browser feature detection and support utilities for cross-browser compatibility testing.
 */

// Minimum supported browser versions
export const MIN_BROWSER_VERSIONS = {
  chrome: 90,
  firefox: 88,
  safari: 14,
  edge: 90,
} as const;

// Required browser APIs for full functionality
export const REQUIRED_APIS = [
  'ResizeObserver',
  'IntersectionObserver',
  'MutationObserver',
  'requestAnimationFrame',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'WebSocket',
  'Worker',
  'Blob',
  'File',
  'FileReader',
  'URL',
  'URLSearchParams',
  'AbortController',
  'fetch',
  'Promise',
  'Map',
  'Set',
  'Symbol',
  'Proxy',
  'Reflect',
] as const;

// Optional APIs that enhance functionality
export const OPTIONAL_APIS = [
  'ClipboardItem',
  'navigator.clipboard',
  'navigator.clipboard.read',
  'navigator.clipboard.write',
  'navigator.clipboard.readText',
  'navigator.clipboard.writeText',
  'ResizeObserverEntry.contentBoxSize',
  'CSS.supports',
  'document.execCommand',
  'Selection',
  'Range',
  'getComputedStyle',
  'matchMedia',
  'PointerEvent',
  'TouchEvent',
] as const;

// CSS features required for proper rendering
export const REQUIRED_CSS_FEATURES = [
  ['display', 'grid'],
  ['display', 'flex'],
  ['position', 'sticky'],
  ['overflow', 'auto'],
  ['transform', 'translate(0, 0)'],
  ['user-select', 'none'],
  ['pointer-events', 'none'],
  ['box-sizing', 'border-box'],
  ['--custom-property', '1px'], // CSS custom properties
] as const;

/**
 * Browser information extracted from the page.
 */
export interface BrowserInfo {
  name: string;
  version: string;
  majorVersion: number;
  userAgent: string;
  platform: string;
  isMobile: boolean;
  isTouch: boolean;
  vendor: string;
  language: string;
}

/**
 * API support check result.
 */
export interface ApiSupportResult {
  api: string;
  supported: boolean;
  partial?: boolean;
  notes?: string;
}

/**
 * CSS feature support check result.
 */
export interface CssSupportResult {
  property: string;
  value: string;
  supported: boolean;
}

/**
 * Full browser compatibility report.
 */
export interface CompatibilityReport {
  browser: BrowserInfo;
  meetsMinimumVersion: boolean;
  requiredApis: ApiSupportResult[];
  optionalApis: ApiSupportResult[];
  cssFeatures: CssSupportResult[];
  overallCompatible: boolean;
  warnings: string[];
  polyfillRecommendations: string[];
}

/**
 * Detects browser information from the page.
 */
export async function detectBrowser(page: Page): Promise<BrowserInfo> {
  return await page.evaluate(() => {
    const ua = navigator.userAgent;
    let name = 'Unknown';
    let version = '0';

    // Detect browser name and version
    if (ua.includes('Firefox/')) {
      name = 'Firefox';
      const match = ua.match(/Firefox\/(\d+)/);
      version = match ? match[1] : '0';
    } else if (ua.includes('Edg/')) {
      name = 'Edge';
      const match = ua.match(/Edg\/(\d+)/);
      version = match ? match[1] : '0';
    } else if (ua.includes('Chrome/')) {
      name = 'Chrome';
      const match = ua.match(/Chrome\/(\d+)/);
      version = match ? match[1] : '0';
    } else if (ua.includes('Safari/') && !ua.includes('Chrome')) {
      name = 'Safari';
      const match = ua.match(/Version\/(\d+)/);
      version = match ? match[1] : '0';
    }

    return {
      name,
      version,
      majorVersion: parseInt(version, 10),
      userAgent: ua,
      platform: navigator.platform,
      isMobile: /Mobile|Android|iPhone|iPad/.test(ua),
      isTouch: 'ontouchstart' in window || navigator.maxTouchPoints > 0,
      vendor: navigator.vendor,
      language: navigator.language,
    };
  });
}

/**
 * Checks if a specific API is supported.
 */
export async function checkApiSupport(
  page: Page,
  apiPath: string
): Promise<ApiSupportResult> {
  const result = await page.evaluate((api) => {
    const parts = api.split('.');
    let obj: unknown = window;

    for (const part of parts) {
      if (obj === null || obj === undefined) {
        return { supported: false };
      }
      obj = (obj as Record<string, unknown>)[part];
    }

    return {
      supported: obj !== undefined && obj !== null,
      isFunction: typeof obj === 'function',
    };
  }, apiPath);

  return {
    api: apiPath,
    supported: result.supported,
  };
}

/**
 * Checks if a CSS feature is supported.
 */
export async function checkCssSupport(
  page: Page,
  property: string,
  value: string
): Promise<CssSupportResult> {
  const supported = await page.evaluate(
    ({ prop, val }) => {
      if (typeof CSS !== 'undefined' && CSS.supports) {
        return CSS.supports(prop, val);
      }
      // Fallback: create an element and check if the property is accepted
      const el = document.createElement('div');
      (el.style as Record<string, string>)[prop] = val;
      return (el.style as Record<string, string>)[prop] !== '';
    },
    { prop: property, val: value }
  );

  return {
    property,
    value,
    supported,
  };
}

/**
 * Checks clipboard API support with detailed results.
 */
export async function checkClipboardSupport(page: Page): Promise<{
  asyncApi: boolean;
  readText: boolean;
  writeText: boolean;
  read: boolean;
  write: boolean;
  clipboardItem: boolean;
  execCommand: boolean;
}> {
  return await page.evaluate(() => {
    const clipboard = navigator.clipboard;
    return {
      asyncApi: !!clipboard,
      readText: !!(clipboard && typeof clipboard.readText === 'function'),
      writeText: !!(clipboard && typeof clipboard.writeText === 'function'),
      read: !!(clipboard && typeof clipboard.read === 'function'),
      write: !!(clipboard && typeof clipboard.write === 'function'),
      clipboardItem: typeof ClipboardItem !== 'undefined',
      execCommand: typeof document.execCommand === 'function',
    };
  });
}

/**
 * Checks storage API support.
 */
export async function checkStorageSupport(page: Page): Promise<{
  localStorage: boolean;
  sessionStorage: boolean;
  indexedDB: boolean;
  storageEstimate: boolean;
  persistedStorage: boolean;
}> {
  return await page.evaluate(() => {
    let localStorageAvailable = false;
    let sessionStorageAvailable = false;

    try {
      localStorage.setItem('test', 'test');
      localStorage.removeItem('test');
      localStorageAvailable = true;
    } catch {
      localStorageAvailable = false;
    }

    try {
      sessionStorage.setItem('test', 'test');
      sessionStorage.removeItem('test');
      sessionStorageAvailable = true;
    } catch {
      sessionStorageAvailable = false;
    }

    return {
      localStorage: localStorageAvailable,
      sessionStorage: sessionStorageAvailable,
      indexedDB: 'indexedDB' in window,
      storageEstimate:
        'storage' in navigator &&
        typeof (navigator as Navigator & { storage?: { estimate?: () => Promise<unknown> } }).storage?.estimate === 'function',
      persistedStorage:
        'storage' in navigator &&
        typeof (navigator as Navigator & { storage?: { persist?: () => Promise<boolean> } }).storage?.persist === 'function',
    };
  });
}

/**
 * Checks observer API support.
 */
export async function checkObserverSupport(page: Page): Promise<{
  resizeObserver: boolean;
  intersectionObserver: boolean;
  mutationObserver: boolean;
  performanceObserver: boolean;
}> {
  return await page.evaluate(() => ({
    resizeObserver: typeof ResizeObserver !== 'undefined',
    intersectionObserver: typeof IntersectionObserver !== 'undefined',
    mutationObserver: typeof MutationObserver !== 'undefined',
    performanceObserver: typeof PerformanceObserver !== 'undefined',
  }));
}

/**
 * Checks keyboard event support.
 */
export async function checkKeyboardSupport(page: Page): Promise<{
  keyboardEvent: boolean;
  keyProperty: boolean;
  codeProperty: boolean;
  getModifierState: boolean;
}> {
  return await page.evaluate(() => {
    const event = new KeyboardEvent('keydown', { key: 'a', code: 'KeyA' });
    return {
      keyboardEvent: typeof KeyboardEvent !== 'undefined',
      keyProperty: 'key' in event,
      codeProperty: 'code' in event,
      getModifierState: typeof event.getModifierState === 'function',
    };
  });
}

/**
 * Checks pointer/touch event support.
 */
export async function checkPointerSupport(page: Page): Promise<{
  pointerEvents: boolean;
  touchEvents: boolean;
  mouseEvents: boolean;
  maxTouchPoints: number;
}> {
  return await page.evaluate(() => ({
    pointerEvents: typeof PointerEvent !== 'undefined',
    touchEvents: 'ontouchstart' in window || typeof TouchEvent !== 'undefined',
    mouseEvents: typeof MouseEvent !== 'undefined',
    maxTouchPoints: navigator.maxTouchPoints || 0,
  }));
}

/**
 * Generates polyfill recommendations based on missing features.
 */
export function getPolyfillRecommendations(
  report: CompatibilityReport
): string[] {
  const recommendations: string[] = [];

  const missingRequired = report.requiredApis.filter((a) => !a.supported);
  const missingOptional = report.optionalApis.filter((a) => !a.supported);

  for (const api of missingRequired) {
    switch (api.api) {
      case 'ResizeObserver':
        recommendations.push(
          'Install resize-observer-polyfill: npm install resize-observer-polyfill'
        );
        break;
      case 'IntersectionObserver':
        recommendations.push(
          'Install intersection-observer polyfill: npm install intersection-observer'
        );
        break;
      case 'fetch':
        recommendations.push(
          'Install whatwg-fetch polyfill: npm install whatwg-fetch'
        );
        break;
      case 'Promise':
        recommendations.push(
          'Install es6-promise polyfill: npm install es6-promise'
        );
        break;
      case 'Map':
      case 'Set':
      case 'Symbol':
        recommendations.push(
          'Install core-js for ES6 collection polyfills: npm install core-js'
        );
        break;
      case 'AbortController':
        recommendations.push(
          'Install abortcontroller-polyfill: npm install abortcontroller-polyfill'
        );
        break;
    }
  }

  for (const api of missingOptional) {
    if (
      api.api.includes('clipboard') &&
      !recommendations.some((r) => r.includes('clipboard'))
    ) {
      recommendations.push(
        'Consider using clipboard-polyfill for better clipboard support: npm install clipboard-polyfill'
      );
    }
  }

  return [...new Set(recommendations)]; // Remove duplicates
}

/**
 * Generates a full compatibility report for the current browser.
 */
export async function generateCompatibilityReport(
  page: Page
): Promise<CompatibilityReport> {
  const browser = await detectBrowser(page);
  const warnings: string[] = [];

  // Check minimum version
  const minVersion =
    MIN_BROWSER_VERSIONS[
      browser.name.toLowerCase() as keyof typeof MIN_BROWSER_VERSIONS
    ];
  const meetsMinimumVersion = !minVersion || browser.majorVersion >= minVersion;

  if (!meetsMinimumVersion) {
    warnings.push(
      `Browser version ${browser.majorVersion} is below minimum required version ${minVersion}`
    );
  }

  // Check required APIs
  const requiredApiResults: ApiSupportResult[] = [];
  for (const api of REQUIRED_APIS) {
    const result = await checkApiSupport(page, api);
    requiredApiResults.push(result);
    if (!result.supported) {
      warnings.push(`Required API not supported: ${api}`);
    }
  }

  // Check optional APIs
  const optionalApiResults: ApiSupportResult[] = [];
  for (const api of OPTIONAL_APIS) {
    const result = await checkApiSupport(page, api);
    optionalApiResults.push(result);
  }

  // Check CSS features
  const cssResults: CssSupportResult[] = [];
  for (const [property, value] of REQUIRED_CSS_FEATURES) {
    const result = await checkCssSupport(page, property, value);
    cssResults.push(result);
    if (!result.supported) {
      warnings.push(`CSS feature not supported: ${property}: ${value}`);
    }
  }

  const overallCompatible =
    meetsMinimumVersion && requiredApiResults.every((r) => r.supported);

  const report: CompatibilityReport = {
    browser,
    meetsMinimumVersion,
    requiredApis: requiredApiResults,
    optionalApis: optionalApiResults,
    cssFeatures: cssResults,
    overallCompatible,
    warnings,
    polyfillRecommendations: [],
  };

  report.polyfillRecommendations = getPolyfillRecommendations(report);

  return report;
}

/**
 * Helper to get the modifier key for the current platform.
 * Returns 'Meta' for Mac, 'Control' for others.
 */
export async function getModifierKey(page: Page): Promise<'Meta' | 'Control'> {
  const isMac = await page.evaluate(() =>
    /Mac|iPod|iPhone|iPad/.test(navigator.platform)
  );
  return isMac ? 'Meta' : 'Control';
}

/**
 * Helper to get the correct keyboard shortcut based on platform.
 */
export async function getPlatformShortcut(
  page: Page,
  key: string
): Promise<string> {
  const modifier = await getModifierKey(page);
  return `${modifier}+${key}`;
}

/**
 * Checks if the current context supports a specific permission.
 */
export async function checkPermissionSupport(
  page: Page,
  permission: PermissionName
): Promise<'granted' | 'denied' | 'prompt' | 'unsupported'> {
  try {
    const result = await page.evaluate(async (perm) => {
      if (!navigator.permissions || !navigator.permissions.query) {
        return 'unsupported';
      }
      try {
        const status = await navigator.permissions.query({
          name: perm as PermissionName,
        });
        return status.state;
      } catch {
        return 'unsupported';
      }
    }, permission);
    return result as 'granted' | 'denied' | 'prompt' | 'unsupported';
  } catch {
    return 'unsupported';
  }
}

/**
 * Waits for a specific browser feature to be available.
 */
export async function waitForFeature(
  page: Page,
  feature: string,
  timeout = 5000
): Promise<boolean> {
  try {
    await page.waitForFunction(
      (f) => {
        const parts = f.split('.');
        let obj: unknown = window;
        for (const part of parts) {
          if (obj === null || obj === undefined) return false;
          obj = (obj as Record<string, unknown>)[part];
        }
        return obj !== undefined && obj !== null;
      },
      feature,
      { timeout }
    );
    return true;
  } catch {
    return false;
  }
}

/**
 * Browser-specific test annotations.
 */
export type BrowserSkipReason =
  | 'clipboard-api-unavailable'
  | 'touch-not-supported'
  | 'execcommand-deprecated'
  | 'css-feature-missing'
  | 'api-not-supported'
  | 'known-browser-bug';

/**
 * Gets known browser bugs/limitations for a specific browser.
 */
export function getKnownBrowserIssues(browserName: string): string[] {
  const issues: Record<string, string[]> = {
    firefox: [
      'Clipboard API requires user gesture and secure context',
      'Some CSS Grid subgrid features not fully supported',
      'Custom scrollbar styling limited',
    ],
    safari: [
      'IndexedDB has quota limitations in private browsing',
      'Clipboard API support is limited',
      'ResizeObserver may report incorrect sizes in some edge cases',
      'CSS backdrop-filter may require -webkit- prefix',
    ],
    chrome: [
      'execCommand is deprecated but still works',
    ],
    edge: [
      'Inherits Chromium limitations',
      'Some older Edge-specific CSS may not work',
    ],
  };

  return issues[browserName.toLowerCase()] || [];
}

/**
 * Type guard to check if running in a Chromium-based browser.
 */
export async function isChromiumBased(page: Page): Promise<boolean> {
  const browser = await detectBrowser(page);
  return ['Chrome', 'Edge'].includes(browser.name);
}

/**
 * Type guard to check if running in a WebKit-based browser.
 */
export async function isWebKitBased(page: Page): Promise<boolean> {
  const browser = await detectBrowser(page);
  return browser.name === 'Safari';
}

/**
 * Type guard to check if running in Firefox.
 */
export async function isFirefox(page: Page): Promise<boolean> {
  const browser = await detectBrowser(page);
  return browser.name === 'Firefox';
}
