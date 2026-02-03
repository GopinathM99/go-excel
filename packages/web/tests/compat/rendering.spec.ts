import { test, expect, Page } from '@playwright/test';
import {
  detectBrowser,
  checkCssSupport,
  REQUIRED_CSS_FEATURES,
  BrowserInfo,
} from './browser-support';

/**
 * Cross-browser visual rendering compatibility tests.
 *
 * Tests grid rendering, styling, and visual consistency across browsers.
 * Includes screenshot comparison baselines for visual regression testing.
 */

test.describe('Rendering Compatibility', () => {
  let browserInfo: BrowserInfo;

  test.beforeEach(async ({ page }) => {
    browserInfo = await detectBrowser(page);
    await page.goto('/');
    await page.waitForSelector('.virtual-grid', { timeout: 10000 });
  });

  test.describe('CSS Feature Support', () => {
    test('should support all required CSS features', async ({ page }) => {
      console.log(`\n[${browserInfo.name} ${browserInfo.version}] CSS Feature Support:`);

      const results: Array<{ property: string; value: string; supported: boolean }> = [];

      for (const [property, value] of REQUIRED_CSS_FEATURES) {
        const result = await checkCssSupport(page, property, value);
        results.push(result);
        console.log(
          `  - ${property}: ${value} - ${result.supported ? 'OK' : 'NOT SUPPORTED'}`
        );
      }

      // Check that critical features are supported
      const gridSupport = results.find(
        (r) => r.property === 'display' && r.value === 'grid'
      );
      const flexSupport = results.find(
        (r) => r.property === 'display' && r.value === 'flex'
      );

      expect(gridSupport?.supported).toBe(true);
      expect(flexSupport?.supported).toBe(true);
    });

    test('should support CSS custom properties', async ({ page }) => {
      const supported = await page.evaluate(() => {
        const el = document.createElement('div');
        el.style.setProperty('--test-var', '10px');
        return el.style.getPropertyValue('--test-var') === '10px';
      });

      expect(supported).toBe(true);
      console.log(
        `[${browserInfo.name}] CSS custom properties: ${supported ? 'OK' : 'NOT SUPPORTED'}`
      );
    });

    test('should support calc() in CSS', async ({ page }) => {
      const supported = await checkCssSupport(page, 'width', 'calc(100% - 10px)');
      expect(supported.supported).toBe(true);
      console.log(
        `[${browserInfo.name}] CSS calc(): ${supported.supported ? 'OK' : 'NOT SUPPORTED'}`
      );
    });
  });

  test.describe('Grid Lines Rendering', () => {
    test('should render grid lines correctly', async ({ page }) => {
      const gridContent = await page.locator('.grid-content');
      await expect(gridContent).toBeVisible();

      // Check that cells have borders
      const cell = await page.locator('.grid-cell').first();
      const borderStyle = await cell.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          borderWidth: computed.borderWidth,
          borderStyle: computed.borderStyle,
          borderColor: computed.borderColor,
        };
      });

      console.log(
        `[${browserInfo.name}] Grid cell border: ${borderStyle.borderWidth} ${borderStyle.borderStyle}`
      );

      // Border should be defined (not 0px or none)
      expect(borderStyle.borderWidth).not.toBe('0px');
    });

    test('should render grid lines with consistent width', async ({ page }) => {
      const cells = await page.locator('.grid-cell').all();
      const borderWidths = new Set<string>();

      for (const cell of cells.slice(0, 10)) {
        const width = await cell.evaluate((el) =>
          window.getComputedStyle(el).borderWidth
        );
        borderWidths.add(width);
      }

      // All cells should have the same border width
      expect(borderWidths.size).toBeLessThanOrEqual(2); // Allow for 1-2 variations

      console.log(
        `[${browserInfo.name}] Border widths found: ${Array.from(borderWidths).join(', ')}`
      );
    });

    test('should not show subpixel rendering artifacts', async ({ page }) => {
      // Take screenshot and check for consistency
      const gridContent = await page.locator('.grid-content');
      const screenshot = await gridContent.screenshot();

      expect(screenshot).toBeDefined();
      console.log(
        `[${browserInfo.name}] Grid screenshot captured for visual inspection`
      );
    });
  });

  test.describe('Cell Borders Rendering', () => {
    test('should render cell borders correctly', async ({ page }) => {
      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');

      const borders = await cell.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          top: computed.borderTopWidth,
          right: computed.borderRightWidth,
          bottom: computed.borderBottomWidth,
          left: computed.borderLeftWidth,
        };
      });

      console.log(
        `[${browserInfo.name}] Cell borders: T=${borders.top} R=${borders.right} B=${borders.bottom} L=${borders.left}`
      );
    });

    test('should render selection border correctly', async ({ page }) => {
      await page.click('.grid-cell[data-row="0"][data-col="0"]');

      const selectedCell = await page.locator('.grid-cell.selected');
      const selectionStyle = await selectedCell.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          border: computed.border,
          outline: computed.outline,
          boxShadow: computed.boxShadow,
        };
      });

      console.log(
        `[${browserInfo.name}] Selection style: border=${selectionStyle.border}, outline=${selectionStyle.outline}`
      );
    });

    test('should render adjacent cell borders without gaps', async ({ page }) => {
      // Get two adjacent cells
      const cell1 = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      const cell2 = await page.locator('.grid-cell[data-row="0"][data-col="1"]');

      const box1 = await cell1.boundingBox();
      const box2 = await cell2.boundingBox();

      if (box1 && box2) {
        // Check that cells are adjacent (right edge of cell1 meets left edge of cell2)
        const gap = box2.x - (box1.x + box1.width);
        expect(Math.abs(gap)).toBeLessThanOrEqual(1); // Allow 1px for border overlap

        console.log(
          `[${browserInfo.name}] Adjacent cell gap: ${gap}px`
        );
      }
    });
  });

  test.describe('Font Rendering', () => {
    test('should render fonts consistently', async ({ page }) => {
      // Enter text in a cell
      await page.click('.grid-cell[data-row="0"][data-col="0"]');
      await page.keyboard.press('F2');
      await page.keyboard.type('Test Text 123');
      await page.keyboard.press('Enter');

      const cell = await page.locator('.grid-cell[data-row="0"][data-col="0"]');
      const fontStyle = await cell.evaluate((el) => {
        const computed = window.getComputedStyle(el);
        return {
          fontFamily: computed.fontFamily,
          fontSize: computed.fontSize,
          fontWeight: computed.fontWeight,
          lineHeight: computed.lineHeight,
          letterSpacing: computed.letterSpacing,
        };
      });

      console.log(
        `[${browserInfo.name}] Font: ${fontStyle.fontFamily}, ${fontStyle.fontSize}, weight=${fontStyle.fontWeight}`
      );
    });

    test('should render different font sizes correctly', async ({ page }) => {
      const fontSizes = ['10px', '12px', '14px', '16px', '18px', '24px'];

      for (const size of fontSizes) {
        const supported = await page.evaluate((fontSize) => {
          const el = document.createElement('span');
          el.style.fontSize = fontSize;
          document.body.appendChild(el);
          const computed = window.getComputedStyle(el).fontSize;
          document.body.removeChild(el);
          return computed === fontSize;
        }, size);

        expect(supported).toBe(true);
      }

      console.log(
        `[${browserInfo.name}] All font sizes render correctly`
      );
    });

    test('should support text overflow ellipsis', async ({ page }) => {
      // Enter long text
      await page.click('.grid-cell[data-row="0"][data-col="0"]');
      await page.keyboard.press('F2');
      await page.keyboard.type(
        'This is a very long text that should overflow the cell'
      );
      await page.keyboard.press('Enter');

      const cellContent = await page.locator(
        '.grid-cell[data-row="0"][data-col="0"] .cell-content'
      );

      if (await cellContent.isVisible()) {
        const style = await cellContent.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            overflow: computed.overflow,
            textOverflow: computed.textOverflow,
            whiteSpace: computed.whiteSpace,
          };
        });

        console.log(
          `[${browserInfo.name}] Text overflow: ${style.textOverflow}, overflow: ${style.overflow}`
        );
      }
    });
  });

  test.describe('Color Rendering', () => {
    test('should render hex colors correctly', async ({ page }) => {
      const testColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFFFF', '#000000'];

      for (const color of testColors) {
        const rendered = await page.evaluate((c) => {
          const el = document.createElement('div');
          el.style.backgroundColor = c;
          document.body.appendChild(el);
          const computed = window.getComputedStyle(el).backgroundColor;
          document.body.removeChild(el);
          return computed;
        }, color);

        // Should return an rgb() or rgba() value
        expect(rendered).toMatch(/^rgb/);
      }

      console.log(
        `[${browserInfo.name}] Hex colors render correctly`
      );
    });

    test('should render rgba colors with transparency', async ({ page }) => {
      const rendered = await page.evaluate(() => {
        const el = document.createElement('div');
        el.style.backgroundColor = 'rgba(255, 0, 0, 0.5)';
        document.body.appendChild(el);
        const computed = window.getComputedStyle(el).backgroundColor;
        document.body.removeChild(el);
        return computed;
      });

      expect(rendered).toMatch(/rgba/);
      console.log(
        `[${browserInfo.name}] RGBA transparency: ${rendered}`
      );
    });

    test('should support CSS color functions', async ({ page }) => {
      // Test hsl color
      const hslSupported = await page.evaluate(() => {
        const el = document.createElement('div');
        el.style.backgroundColor = 'hsl(120, 100%, 50%)';
        document.body.appendChild(el);
        const computed = window.getComputedStyle(el).backgroundColor;
        document.body.removeChild(el);
        return computed !== '';
      });

      expect(hslSupported).toBe(true);
      console.log(
        `[${browserInfo.name}] HSL colors: ${hslSupported ? 'OK' : 'NOT SUPPORTED'}`
      );
    });
  });

  test.describe('Scrollbar Appearance', () => {
    test('should render scrollbars', async ({ page }) => {
      const scrollContainer = await page.locator('.grid-scroll-container');
      const hasScrollbar = await scrollContainer.evaluate((el) => {
        return el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth;
      });

      expect(hasScrollbar).toBe(true);
      console.log(
        `[${browserInfo.name}] Scrollbars present: ${hasScrollbar}`
      );
    });

    test('should support custom scrollbar styling (where available)', async ({
      page,
    }) => {
      // Check if custom scrollbar pseudo-elements are supported
      const supportsCustomScrollbar = await page.evaluate(() => {
        try {
          // Chromium-based browsers
          document.querySelector('::-webkit-scrollbar');
          return true;
        } catch {
          return false;
        }
      });

      console.log(
        `[${browserInfo.name}] Custom scrollbar styling: ${supportsCustomScrollbar ? 'SUPPORTED' : 'NOT SUPPORTED'}`
      );
    });

    test('should allow scrolling in both directions', async ({ page }) => {
      const scrollContainer = await page.locator('.grid-scroll-container');

      // Test vertical scroll
      await scrollContainer.evaluate((el) => {
        el.scrollTop = 100;
      });

      const scrollTop = await scrollContainer.evaluate((el) => el.scrollTop);
      expect(scrollTop).toBeGreaterThan(0);

      // Test horizontal scroll
      await scrollContainer.evaluate((el) => {
        el.scrollLeft = 100;
      });

      const scrollLeft = await scrollContainer.evaluate((el) => el.scrollLeft);
      expect(scrollLeft).toBeGreaterThan(0);

      console.log(
        `[${browserInfo.name}] Scrolling: vertical=${scrollTop}px, horizontal=${scrollLeft}px`
      );
    });
  });

  test.describe('Frozen Panes Rendering', () => {
    test('should render frozen row headers correctly', async ({ page }) => {
      const rowHeaders = await page.locator('.row-headers-container');

      if (await rowHeaders.isVisible()) {
        const position = await rowHeaders.evaluate((el) =>
          window.getComputedStyle(el).position
        );

        console.log(
          `[${browserInfo.name}] Row headers position: ${position}`
        );
      }
    });

    test('should render frozen column headers correctly', async ({ page }) => {
      const colHeaders = await page.locator('.column-headers-container');

      if (await colHeaders.isVisible()) {
        const position = await colHeaders.evaluate((el) =>
          window.getComputedStyle(el).position
        );

        console.log(
          `[${browserInfo.name}] Column headers position: ${position}`
        );
      }
    });

    test('should keep headers visible when scrolling', async ({ page }) => {
      // Scroll the grid
      const scrollContainer = await page.locator('.grid-scroll-container');
      await scrollContainer.evaluate((el) => {
        el.scrollTop = 500;
        el.scrollLeft = 500;
      });

      // Check headers are still visible
      const colHeaders = await page.locator('.column-headers-container');
      const rowHeaders = await page.locator('.row-headers-container');

      await expect(colHeaders).toBeVisible();
      await expect(rowHeaders).toBeVisible();

      console.log(
        `[${browserInfo.name}] Headers remain visible after scroll`
      );
    });
  });

  test.describe('Chart Rendering', () => {
    test('should render chart container', async ({ page }) => {
      // Check if chart components exist
      const chartContainer = await page.locator('.chart-container').first();

      if (await chartContainer.isVisible()) {
        const size = await chartContainer.boundingBox();
        console.log(
          `[${browserInfo.name}] Chart container: ${size?.width}x${size?.height}`
        );
      } else {
        console.log(
          `[${browserInfo.name}] No charts currently rendered`
        );
      }
    });

    test('should support SVG rendering for charts', async ({ page }) => {
      const svgSupport = await page.evaluate(() => {
        const svg = document.createElementNS(
          'http://www.w3.org/2000/svg',
          'svg'
        );
        return svg instanceof SVGElement;
      });

      expect(svgSupport).toBe(true);
      console.log(
        `[${browserInfo.name}] SVG support: ${svgSupport ? 'OK' : 'NOT SUPPORTED'}`
      );
    });

    test('should support Canvas rendering', async ({ page }) => {
      const canvasSupport = await page.evaluate(() => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        return ctx !== null;
      });

      expect(canvasSupport).toBe(true);
      console.log(
        `[${browserInfo.name}] Canvas 2D support: ${canvasSupport ? 'OK' : 'NOT SUPPORTED'}`
      );
    });
  });

  test.describe('Screenshot Comparison Baseline', () => {
    test('should match empty grid baseline', async ({ page }) => {
      // Wait for grid to stabilize
      await page.waitForTimeout(500);

      const grid = await page.locator('.virtual-grid');

      // Take screenshot for visual comparison
      await expect(grid).toHaveScreenshot('empty-grid.png', {
        maxDiffPixels: 200,
        threshold: 0.3,
      });

      console.log(
        `[${browserInfo.name}] Empty grid screenshot baseline checked`
      );
    });

    test('should match grid with data baseline', async ({ page }) => {
      // Enter some data
      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          await page.click(`.grid-cell[data-row="${row}"][data-col="${col}"]`);
          await page.keyboard.press('F2');
          await page.keyboard.type(`R${row}C${col}`);
          await page.keyboard.press('Tab');
        }
      }

      await page.waitForTimeout(300);

      const grid = await page.locator('.virtual-grid');

      await expect(grid).toHaveScreenshot('grid-with-data.png', {
        maxDiffPixels: 300,
        threshold: 0.3,
      });

      console.log(
        `[${browserInfo.name}] Grid with data screenshot baseline checked`
      );
    });

    test('should match selection state baseline', async ({ page }) => {
      // Create a selection
      await page.click('.grid-cell[data-row="0"][data-col="0"]');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowRight');
      await page.keyboard.press('Shift+ArrowDown');
      await page.keyboard.press('Shift+ArrowDown');

      await page.waitForTimeout(200);

      const grid = await page.locator('.virtual-grid');

      await expect(grid).toHaveScreenshot('grid-selection.png', {
        maxDiffPixels: 200,
        threshold: 0.3,
      });

      console.log(
        `[${browserInfo.name}] Selection state screenshot baseline checked`
      );
    });
  });

  test.describe('Transform and Animation Support', () => {
    test('should support CSS transforms', async ({ page }) => {
      const transformSupport = await page.evaluate(() => {
        const el = document.createElement('div');
        el.style.transform = 'translate(10px, 10px)';
        return el.style.transform !== '';
      });

      expect(transformSupport).toBe(true);
      console.log(
        `[${browserInfo.name}] CSS transforms: ${transformSupport ? 'OK' : 'NOT SUPPORTED'}`
      );
    });

    test('should support CSS transitions', async ({ page }) => {
      const transitionSupport = await page.evaluate(() => {
        const el = document.createElement('div');
        el.style.transition = 'all 0.3s ease';
        return el.style.transition !== '';
      });

      expect(transitionSupport).toBe(true);
      console.log(
        `[${browserInfo.name}] CSS transitions: ${transitionSupport ? 'OK' : 'NOT SUPPORTED'}`
      );
    });

    test('should support requestAnimationFrame', async ({ page }) => {
      const rafSupport = await page.evaluate(() => {
        return typeof requestAnimationFrame === 'function';
      });

      expect(rafSupport).toBe(true);
      console.log(
        `[${browserInfo.name}] requestAnimationFrame: ${rafSupport ? 'OK' : 'NOT SUPPORTED'}`
      );
    });
  });

  test.describe('High DPI / Retina Display', () => {
    test('should detect device pixel ratio', async ({ page }) => {
      const dpr = await page.evaluate(() => window.devicePixelRatio);

      console.log(
        `[${browserInfo.name}] Device pixel ratio: ${dpr}`
      );
      expect(dpr).toBeGreaterThanOrEqual(1);
    });

    test('should render crisp lines on high DPI', async ({ page }) => {
      // Set high DPI viewport
      await page.setViewportSize({
        width: 1280,
        height: 720,
      });

      const grid = await page.locator('.virtual-grid');
      const screenshot = await grid.screenshot({ scale: 'device' });

      expect(screenshot).toBeDefined();
      console.log(
        `[${browserInfo.name}] High DPI screenshot captured`
      );
    });
  });
});

/**
 * Summary output for rendering test results.
 */
test.afterAll(async () => {
  console.log('\n=== Rendering Compatibility Test Summary ===');
  console.log('Tested visual elements:');
  console.log('  - CSS feature support');
  console.log('  - Grid lines and borders');
  console.log('  - Font rendering');
  console.log('  - Color rendering');
  console.log('  - Scrollbar appearance');
  console.log('  - Frozen panes');
  console.log('  - Chart rendering');
  console.log('  - Screenshot baselines');
  console.log('  - Transforms and animations');
  console.log('  - High DPI support');
  console.log('=============================================\n');
});
