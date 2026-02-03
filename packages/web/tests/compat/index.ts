/**
 * Cross-browser compatibility testing utilities.
 *
 * This module exports utilities for detecting browser capabilities,
 * checking API support, and generating compatibility reports.
 */

export {
  // Browser detection
  detectBrowser,
  isChromiumBased,
  isWebKitBased,
  isFirefox,

  // API support checks
  checkApiSupport,
  checkClipboardSupport,
  checkStorageSupport,
  checkObserverSupport,
  checkKeyboardSupport,
  checkPointerSupport,
  checkCssSupport,
  checkPermissionSupport,

  // Compatibility reports
  generateCompatibilityReport,
  getPolyfillRecommendations,
  getKnownBrowserIssues,

  // Platform helpers
  getModifierKey,
  getPlatformShortcut,
  waitForFeature,

  // Constants
  MIN_BROWSER_VERSIONS,
  REQUIRED_APIS,
  OPTIONAL_APIS,
  REQUIRED_CSS_FEATURES,

  // Types
  type BrowserInfo,
  type ApiSupportResult,
  type CssSupportResult,
  type CompatibilityReport,
  type BrowserSkipReason,
} from './browser-support';
