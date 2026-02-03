# Cross-Browser Compatibility Tests

This directory contains comprehensive cross-browser compatibility tests for the MS Excel Clone web application. The tests ensure consistent behavior and appearance across Chrome, Firefox, Safari (WebKit), and Microsoft Edge.

## Supported Browsers

| Browser | Minimum Version | Status |
|---------|-----------------|--------|
| Chrome | 90+ | Fully Supported |
| Firefox | 88+ | Fully Supported |
| Safari | 14+ | Fully Supported |
| Edge | 90+ | Fully Supported |
| Mobile Chrome | Latest | Supported |
| Mobile Safari | Latest | Supported |

## Test Suites

### 1. Keyboard Shortcut Tests (`keyboard.spec.ts`)

Tests keyboard navigation and shortcuts across all browsers:

- **Copy/Paste/Cut**: Ctrl/Cmd+C, Ctrl/Cmd+V, Ctrl/Cmd+X
- **Undo/Redo**: Ctrl/Cmd+Z, Ctrl/Cmd+Y, Ctrl/Cmd+Shift+Z
- **Formatting**: Ctrl/Cmd+B (bold), Ctrl/Cmd+I (italic), Ctrl/Cmd+U (underline)
- **Navigation**: Arrow keys, Tab/Shift+Tab, Enter/Shift+Enter
- **Page Navigation**: PageUp, PageDown, Home, End, Ctrl/Cmd+Home
- **Edit Mode**: F2 to enter, Escape to cancel
- **Delete**: Delete key, Backspace key

### 2. Clipboard Tests (`clipboard.spec.ts`)

Tests clipboard operations with browser-specific handling:

- Single cell copy/paste
- Range copy/paste
- External paste (plain text, TSV)
- Cut and paste
- Clipboard API vs execCommand fallback
- Data format handling (text/plain, text/html)

**Known Browser Differences:**
- Chrome/Edge: Full Clipboard API support
- Firefox: Requires user gesture for clipboard access
- Safari: Limited Clipboard API, relies more on execCommand

### 3. Selection Tests (`selection.spec.ts`)

Tests selection interactions:

- Single click selection
- Shift+click range selection
- Ctrl/Cmd+click multi-selection
- Drag to select range
- Double-click to edit
- Selection across scrolled areas
- Touch selection (mobile browsers)

### 4. Rendering Tests (`rendering.spec.ts`)

Tests visual rendering consistency:

- CSS feature support (Grid, Flexbox, Custom Properties)
- Grid lines and cell borders
- Font rendering
- Color rendering (hex, rgba, hsl)
- Scrollbar appearance
- Frozen panes rendering
- Chart rendering (SVG, Canvas)
- Screenshot comparison baselines

### 5. Storage Tests (`storage.spec.ts`)

Tests browser storage APIs:

- localStorage availability and operations
- sessionStorage operations
- IndexedDB database operations
- Storage quota handling
- Data persistence across refresh
- Clear storage functionality

### 6. Browser Feature Detection (`browser-support.ts`)

Utility module for detecting browser capabilities:

- Browser name and version detection
- API availability checks
- CSS feature support detection
- Polyfill recommendations

## Running the Tests

### Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install
```

### Run All Compatibility Tests

```bash
pnpm test:compat
```

### Run Tests for Specific Browser

```bash
# Chrome only
pnpm test:compat:chrome

# Firefox only
pnpm test:compat:firefox

# Safari only
pnpm test:compat:safari

# Edge only
pnpm test:compat:edge
```

### Run with UI Mode

```bash
pnpm test:compat:ui
```

### Run with Debug Mode

```bash
pnpm test:compat:debug
```

### Generate Report

```bash
# Run tests and generate HTML report
pnpm test:compat

# Open the report
pnpm exec playwright show-report playwright-report/compat
```

## Adding New Compatibility Tests

### 1. Create a New Test File

```typescript
// tests/compat/my-feature.spec.ts
import { test, expect } from '@playwright/test';
import { detectBrowser, getModifierKey } from './browser-support';

test.describe('My Feature Compatibility', () => {
  test.beforeEach(async ({ page }) => {
    const browserInfo = await detectBrowser(page);
    await page.goto('/');
    await page.waitForSelector('.virtual-grid');
  });

  test('should work across browsers', async ({ page }) => {
    // Your test here
  });
});
```

### 2. Use Browser Detection for Conditional Logic

```typescript
import { isChromiumBased, isFirefox, isWebKitBased } from './browser-support';

test('browser-specific test', async ({ page }) => {
  if (await isFirefox(page)) {
    // Firefox-specific behavior
  } else if (await isWebKitBased(page)) {
    // Safari-specific behavior
  }
});
```

### 3. Handle Browser-Specific Shortcuts

```typescript
import { getModifierKey, getPlatformShortcut } from './browser-support';

test('keyboard shortcut', async ({ page }) => {
  const modifierKey = await getModifierKey(page);
  await page.keyboard.press(`${modifierKey}+c`);
});
```

## Known Issues Per Browser

### Chrome/Edge (Chromium)

- `execCommand` is deprecated but still functional
- May show security warnings for clipboard access in some contexts

### Firefox

- Clipboard API requires secure context (HTTPS) and user gesture
- Some CSS Grid subgrid features have limited support
- Custom scrollbar styling is limited

### Safari (WebKit)

- IndexedDB has quota limitations in private browsing mode
- Clipboard API has more restrictions than Chromium
- `ResizeObserver` may report incorrect sizes in edge cases
- Some CSS features may require `-webkit-` prefix

### Mobile Browsers

- Touch events behave differently than mouse events
- Virtual keyboard may affect layout
- Clipboard access is more restricted

## Browser-Specific Workarounds

### Clipboard Fallback

The application uses a fallback mechanism for clipboard operations:

```typescript
async function copyToClipboard(text: string): Promise<boolean> {
  // Try modern Clipboard API first
  if (navigator.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to execCommand
    }
  }

  // Fallback to execCommand
  const textarea = document.createElement('textarea');
  textarea.value = text;
  document.body.appendChild(textarea);
  textarea.select();
  const success = document.execCommand('copy');
  document.body.removeChild(textarea);
  return success;
}
```

### Modifier Key Detection

The application detects the correct modifier key based on platform:

```typescript
function getModifierKey(): 'Meta' | 'Control' {
  return /Mac|iPod|iPhone|iPad/.test(navigator.platform) ? 'Meta' : 'Control';
}
```

### ResizeObserver Polyfill

For older browsers, include the polyfill:

```bash
npm install resize-observer-polyfill
```

```typescript
import ResizeObserver from 'resize-observer-polyfill';

if (!window.ResizeObserver) {
  window.ResizeObserver = ResizeObserver;
}
```

## Test Configuration

The compatibility tests use a dedicated Playwright configuration (`playwright.compat.config.ts`) with:

- All major browsers configured
- Screenshot comparison with thresholds
- Video recording on failure
- Retry logic for flaky tests
- Parallel execution

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `CI` | Running in CI environment | `false` |
| `BASE_URL` | Application URL | `http://localhost:3000` |

## Continuous Integration

### GitHub Actions Example

```yaml
name: Compatibility Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - name: Install dependencies
        run: pnpm install
      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps
      - name: Run compatibility tests
        run: pnpm test:compat
      - name: Upload report
        uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: packages/web/playwright-report/compat
```

## Troubleshooting

### Tests Failing Only in CI

- Ensure all browser dependencies are installed: `playwright install --with-deps`
- Check for timing issues - increase timeouts if needed
- Verify the application starts correctly before tests run

### Screenshot Mismatches

- Screenshots may differ slightly across OS/browser versions
- Adjust `maxDiffPixels` and `threshold` in config
- Update baseline screenshots when intentional changes are made:
  ```bash
  pnpm test:compat --update-snapshots
  ```

### Clipboard Tests Failing

- Clipboard tests may require `clipboard-read`/`clipboard-write` permissions
- Some browsers block clipboard access in automated tests
- Check if tests are running in a secure context (HTTPS)

### Storage Tests Failing in Private Mode

- Private/Incognito mode may have storage restrictions
- IndexedDB quota is reduced in Safari private mode
- Tests should handle storage exceptions gracefully

## Contributing

When adding new compatibility tests:

1. Test across all target browsers locally
2. Document any browser-specific behavior
3. Add workarounds for known issues
4. Update this README with new information
5. Ensure tests pass in CI before merging
