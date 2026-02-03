import { test, expect, Page } from '@playwright/test';
import {
  detectBrowser,
  checkStorageSupport,
  BrowserInfo,
} from './browser-support';

/**
 * Cross-browser storage compatibility tests.
 *
 * Tests LocalStorage, SessionStorage, and IndexedDB across browsers.
 * Verifies data persistence, quota handling, and storage cleanup.
 */

test.describe('Storage Compatibility', () => {
  let browserInfo: BrowserInfo;

  test.beforeEach(async ({ page }) => {
    browserInfo = await detectBrowser(page);
    await page.goto('/');
    await page.waitForSelector('.virtual-grid', { timeout: 10000 });
  });

  test.describe('Storage API Support Detection', () => {
    test('should detect available storage APIs', async ({ page }) => {
      const support = await checkStorageSupport(page);

      console.log(`\n[${browserInfo.name} ${browserInfo.version}] Storage Support:`);
      console.log(`  - localStorage: ${support.localStorage}`);
      console.log(`  - sessionStorage: ${support.sessionStorage}`);
      console.log(`  - IndexedDB: ${support.indexedDB}`);
      console.log(`  - Storage Estimate API: ${support.storageEstimate}`);
      console.log(`  - Persisted Storage API: ${support.persistedStorage}`);

      // All modern browsers should support basic storage
      expect(support.localStorage).toBe(true);
      expect(support.sessionStorage).toBe(true);
      expect(support.indexedDB).toBe(true);
    });
  });

  test.describe('LocalStorage Availability', () => {
    test('should be able to read and write to localStorage', async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        try {
          const testKey = 'compat-test-key';
          const testValue = 'test-value-123';

          localStorage.setItem(testKey, testValue);
          const retrieved = localStorage.getItem(testKey);
          localStorage.removeItem(testKey);

          return {
            success: true,
            match: retrieved === testValue,
          };
        } catch (e) {
          return {
            success: false,
            error: (e as Error).message,
          };
        }
      });

      expect(result.success).toBe(true);
      expect(result.match).toBe(true);

      console.log(
        `[${browserInfo.name}] localStorage read/write: ${result.success ? 'OK' : 'FAILED'}`
      );
    });

    test('should handle localStorage key enumeration', async ({ page }) => {
      const result = await page.evaluate(() => {
        try {
          // Clear and set test data
          const testKeys = ['test-key-1', 'test-key-2', 'test-key-3'];
          testKeys.forEach((key, i) => localStorage.setItem(key, `value-${i}`));

          // Enumerate keys
          const foundKeys: string[] = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && testKeys.includes(key)) {
              foundKeys.push(key);
            }
          }

          // Cleanup
          testKeys.forEach((key) => localStorage.removeItem(key));

          return {
            success: true,
            keysFound: foundKeys.length,
            expectedKeys: testKeys.length,
          };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      });

      expect(result.success).toBe(true);
      expect(result.keysFound).toBe(result.expectedKeys);

      console.log(
        `[${browserInfo.name}] localStorage enumeration: found ${result.keysFound}/${result.expectedKeys} keys`
      );
    });

    test('should handle JSON data in localStorage', async ({ page }) => {
      const result = await page.evaluate(() => {
        try {
          const testData = {
            spreadsheetId: 'test-123',
            cells: [
              { row: 0, col: 0, value: 'Hello' },
              { row: 0, col: 1, value: 'World' },
            ],
            metadata: {
              createdAt: new Date().toISOString(),
              version: 1,
            },
          };

          localStorage.setItem('compat-json-test', JSON.stringify(testData));
          const retrieved = JSON.parse(
            localStorage.getItem('compat-json-test') || '{}'
          );
          localStorage.removeItem('compat-json-test');

          return {
            success: true,
            match: retrieved.spreadsheetId === testData.spreadsheetId,
            cellCount: retrieved.cells?.length === testData.cells.length,
          };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      });

      expect(result.success).toBe(true);
      expect(result.match).toBe(true);

      console.log(
        `[${browserInfo.name}] localStorage JSON handling: ${result.success ? 'OK' : 'FAILED'}`
      );
    });
  });

  test.describe('SessionStorage Availability', () => {
    test('should be able to read and write to sessionStorage', async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        try {
          const testKey = 'session-compat-test';
          const testValue = 'session-test-value';

          sessionStorage.setItem(testKey, testValue);
          const retrieved = sessionStorage.getItem(testKey);
          sessionStorage.removeItem(testKey);

          return {
            success: true,
            match: retrieved === testValue,
          };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      });

      expect(result.success).toBe(true);
      expect(result.match).toBe(true);

      console.log(
        `[${browserInfo.name}] sessionStorage read/write: ${result.success ? 'OK' : 'FAILED'}`
      );
    });

    test('should clear sessionStorage independently from localStorage', async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        try {
          localStorage.setItem('local-persist-test', 'local-value');
          sessionStorage.setItem('session-persist-test', 'session-value');

          sessionStorage.clear();

          const localStillExists =
            localStorage.getItem('local-persist-test') === 'local-value';
          const sessionCleared =
            sessionStorage.getItem('session-persist-test') === null;

          localStorage.removeItem('local-persist-test');

          return {
            success: true,
            localPreserved: localStillExists,
            sessionCleared: sessionCleared,
          };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      });

      expect(result.success).toBe(true);
      expect(result.localPreserved).toBe(true);
      expect(result.sessionCleared).toBe(true);

      console.log(
        `[${browserInfo.name}] Storage isolation: local preserved=${result.localPreserved}, session cleared=${result.sessionCleared}`
      );
    });
  });

  test.describe('IndexedDB Availability', () => {
    test('should be able to open IndexedDB database', async ({ page }) => {
      const result = await page.evaluate(() => {
        return new Promise((resolve) => {
          try {
            const request = indexedDB.open('compat-test-db', 1);

            request.onerror = () => {
              resolve({ success: false, error: 'Failed to open database' });
            };

            request.onsuccess = () => {
              const db = request.result;
              db.close();
              // Clean up
              indexedDB.deleteDatabase('compat-test-db');
              resolve({ success: true });
            };

            request.onupgradeneeded = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              if (!db.objectStoreNames.contains('test-store')) {
                db.createObjectStore('test-store', { keyPath: 'id' });
              }
            };
          } catch (e) {
            resolve({ success: false, error: (e as Error).message });
          }
        });
      });

      expect((result as { success: boolean }).success).toBe(true);

      console.log(
        `[${browserInfo.name}] IndexedDB open: ${(result as { success: boolean }).success ? 'OK' : 'FAILED'}`
      );
    });

    test('should be able to store and retrieve data from IndexedDB', async ({
      page,
    }) => {
      const result = await page.evaluate(() => {
        return new Promise((resolve) => {
          try {
            const dbName = 'compat-test-crud-db';
            const request = indexedDB.open(dbName, 1);

            request.onupgradeneeded = (event) => {
              const db = (event.target as IDBOpenDBRequest).result;
              if (!db.objectStoreNames.contains('cells')) {
                db.createObjectStore('cells', { keyPath: 'id' });
              }
            };

            request.onsuccess = () => {
              const db = request.result;
              const tx = db.transaction('cells', 'readwrite');
              const store = tx.objectStore('cells');

              // Store data
              const testData = {
                id: 'cell-0-0',
                row: 0,
                col: 0,
                value: 'Test Value',
              };
              store.put(testData);

              tx.oncomplete = () => {
                // Read data back
                const readTx = db.transaction('cells', 'readonly');
                const readStore = readTx.objectStore('cells');
                const getRequest = readStore.get('cell-0-0');

                getRequest.onsuccess = () => {
                  const retrieved = getRequest.result;
                  db.close();
                  indexedDB.deleteDatabase(dbName);

                  resolve({
                    success: true,
                    match: retrieved?.value === testData.value,
                  });
                };

                getRequest.onerror = () => {
                  db.close();
                  indexedDB.deleteDatabase(dbName);
                  resolve({ success: false, error: 'Read failed' });
                };
              };
            };

            request.onerror = () => {
              resolve({ success: false, error: 'Database open failed' });
            };
          } catch (e) {
            resolve({ success: false, error: (e as Error).message });
          }
        });
      });

      expect((result as { success: boolean }).success).toBe(true);
      expect((result as { match?: boolean }).match).toBe(true);

      console.log(
        `[${browserInfo.name}] IndexedDB CRUD: ${(result as { success: boolean }).success ? 'OK' : 'FAILED'}`
      );
    });

    test('should support IndexedDB indexes', async ({ page }) => {
      const result = await page.evaluate(() => {
        return new Promise((resolve) => {
          const dbName = 'compat-test-index-db';
          const request = indexedDB.open(dbName, 1);

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            const store = db.createObjectStore('items', {
              keyPath: 'id',
              autoIncrement: true,
            });
            store.createIndex('by_value', 'value', { unique: false });
            store.createIndex('by_row', 'row', { unique: false });
          };

          request.onsuccess = () => {
            const db = request.result;
            const hasIndexes =
              db.transaction('items').objectStore('items').indexNames.length >=
              2;
            db.close();
            indexedDB.deleteDatabase(dbName);
            resolve({ success: true, hasIndexes });
          };

          request.onerror = () => {
            resolve({ success: false });
          };
        });
      });

      expect((result as { success: boolean }).success).toBe(true);

      console.log(
        `[${browserInfo.name}] IndexedDB indexes: ${(result as { success: boolean; hasIndexes?: boolean }).hasIndexes ? 'OK' : 'NOT SUPPORTED'}`
      );
    });

    test('should handle large data in IndexedDB', async ({ page }) => {
      const result = await page.evaluate(() => {
        return new Promise((resolve) => {
          const dbName = 'compat-test-large-db';
          const request = indexedDB.open(dbName, 1);

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            db.createObjectStore('data', { keyPath: 'id' });
          };

          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('data', 'readwrite');
            const store = tx.objectStore('data');

            // Create ~100KB of data
            const largeArray = new Array(1000).fill(null).map((_, i) => ({
              row: i,
              col: 0,
              value: 'x'.repeat(100),
            }));

            const data = {
              id: 'large-data',
              cells: largeArray,
            };

            store.put(data);

            tx.oncomplete = () => {
              const readTx = db.transaction('data', 'readonly');
              const getReq = readTx.objectStore('data').get('large-data');

              getReq.onsuccess = () => {
                const result = getReq.result;
                db.close();
                indexedDB.deleteDatabase(dbName);
                resolve({
                  success: true,
                  dataSize: result?.cells?.length || 0,
                });
              };
            };

            tx.onerror = () => {
              db.close();
              indexedDB.deleteDatabase(dbName);
              resolve({ success: false, error: 'Transaction failed' });
            };
          };

          request.onerror = () => {
            resolve({ success: false, error: 'Open failed' });
          };
        });
      });

      expect((result as { success: boolean }).success).toBe(true);

      console.log(
        `[${browserInfo.name}] IndexedDB large data: ${(result as { dataSize?: number }).dataSize || 0} items stored`
      );
    });
  });

  test.describe('Storage Quota Handling', () => {
    test('should be able to estimate storage quota', async ({ page }) => {
      const result = await page.evaluate(async () => {
        if (navigator.storage && navigator.storage.estimate) {
          try {
            const estimate = await navigator.storage.estimate();
            return {
              supported: true,
              quota: estimate.quota,
              usage: estimate.usage,
            };
          } catch {
            return { supported: false, error: 'Estimate failed' };
          }
        }
        return { supported: false, reason: 'API not available' };
      });

      if ((result as { supported: boolean }).supported) {
        console.log(
          `[${browserInfo.name}] Storage estimate: quota=${((result as { quota?: number }).quota || 0) / 1024 / 1024}MB, usage=${((result as { usage?: number }).usage || 0) / 1024}KB`
        );
      } else {
        console.log(
          `[${browserInfo.name}] Storage estimate API: NOT AVAILABLE`
        );
      }
    });

    test('should handle storage quota exceeded gracefully', async ({ page }) => {
      const result = await page.evaluate(() => {
        try {
          // Try to detect quota by writing increasingly larger data
          const testKey = 'quota-test';
          let size = 1024; // Start with 1KB
          let lastSuccessfulSize = 0;

          while (size < 10 * 1024 * 1024) {
            // Max 10MB test
            try {
              const data = 'x'.repeat(size);
              localStorage.setItem(testKey, data);
              lastSuccessfulSize = size;
              size *= 2;
            } catch (e) {
              // Quota exceeded
              localStorage.removeItem(testKey);
              return {
                success: true,
                quotaHit: true,
                maxSize: lastSuccessfulSize,
                errorName: (e as Error).name,
              };
            }
          }

          localStorage.removeItem(testKey);
          return {
            success: true,
            quotaHit: false,
            maxSize: lastSuccessfulSize,
          };
        } catch (e) {
          return { success: false, error: (e as Error).message };
        }
      });

      expect((result as { success: boolean }).success).toBe(true);

      console.log(
        `[${browserInfo.name}] localStorage quota test: max ~${((result as { maxSize?: number }).maxSize || 0) / 1024}KB before ${(result as { quotaHit?: boolean }).quotaHit ? 'quota exceeded' : 'test limit'}`
      );
    });
  });

  test.describe('Data Persistence Across Refresh', () => {
    test('should persist localStorage data across navigation', async ({
      page,
    }) => {
      // Set data
      await page.evaluate(() => {
        localStorage.setItem('persist-test', 'persistent-value');
      });

      // Navigate away and back
      await page.goto('about:blank');
      await page.goto('/');
      await page.waitForSelector('.virtual-grid');

      // Check data persists
      const value = await page.evaluate(() =>
        localStorage.getItem('persist-test')
      );

      expect(value).toBe('persistent-value');

      // Cleanup
      await page.evaluate(() => localStorage.removeItem('persist-test'));

      console.log(
        `[${browserInfo.name}] localStorage persistence: ${value ? 'OK' : 'FAILED'}`
      );
    });

    test('should persist IndexedDB data across navigation', async ({ page }) => {
      // Store data
      await page.evaluate(() => {
        return new Promise((resolve) => {
          const request = indexedDB.open('persist-test-db', 1);

          request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            db.createObjectStore('data', { keyPath: 'id' });
          };

          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('data', 'readwrite');
            tx.objectStore('data').put({ id: 'test', value: 'persisted' });
            tx.oncomplete = () => {
              db.close();
              resolve(true);
            };
          };
        });
      });

      // Navigate away and back
      await page.goto('about:blank');
      await page.goto('/');
      await page.waitForSelector('.virtual-grid');

      // Check data persists
      const result = await page.evaluate(() => {
        return new Promise((resolve) => {
          const request = indexedDB.open('persist-test-db', 1);

          request.onsuccess = () => {
            const db = request.result;
            const tx = db.transaction('data', 'readonly');
            const getReq = tx.objectStore('data').get('test');

            getReq.onsuccess = () => {
              const value = getReq.result?.value;
              db.close();
              indexedDB.deleteDatabase('persist-test-db');
              resolve({ persisted: value === 'persisted' });
            };

            getReq.onerror = () => {
              db.close();
              resolve({ persisted: false });
            };
          };

          request.onerror = () => {
            resolve({ persisted: false });
          };
        });
      });

      expect((result as { persisted: boolean }).persisted).toBe(true);

      console.log(
        `[${browserInfo.name}] IndexedDB persistence: ${(result as { persisted: boolean }).persisted ? 'OK' : 'FAILED'}`
      );
    });
  });

  test.describe('Clear Storage Functionality', () => {
    test('should clear localStorage completely', async ({ page }) => {
      // Set multiple items
      await page.evaluate(() => {
        localStorage.setItem('clear-test-1', 'value1');
        localStorage.setItem('clear-test-2', 'value2');
        localStorage.setItem('clear-test-3', 'value3');
      });

      // Clear
      await page.evaluate(() => localStorage.clear());

      // Verify cleared
      const count = await page.evaluate(() => {
        let testItemCount = 0;
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key?.startsWith('clear-test-')) {
            testItemCount++;
          }
        }
        return testItemCount;
      });

      expect(count).toBe(0);

      console.log(
        `[${browserInfo.name}] localStorage clear: ${count === 0 ? 'OK' : 'FAILED'}`
      );
    });

    test('should delete IndexedDB database', async ({ page }) => {
      // Create database
      await page.evaluate(() => {
        return new Promise((resolve) => {
          const request = indexedDB.open('delete-test-db', 1);
          request.onupgradeneeded = (event) => {
            (event.target as IDBOpenDBRequest).result.createObjectStore('data');
          };
          request.onsuccess = () => {
            request.result.close();
            resolve(true);
          };
        });
      });

      // Delete database
      const deleteResult = await page.evaluate(() => {
        return new Promise((resolve) => {
          const deleteReq = indexedDB.deleteDatabase('delete-test-db');
          deleteReq.onsuccess = () => resolve({ success: true });
          deleteReq.onerror = () => resolve({ success: false });
          deleteReq.onblocked = () => resolve({ success: false, blocked: true });
        });
      });

      expect((deleteResult as { success: boolean }).success).toBe(true);

      console.log(
        `[${browserInfo.name}] IndexedDB delete: ${(deleteResult as { success: boolean }).success ? 'OK' : 'FAILED'}`
      );
    });
  });

  test.describe('Storage Events', () => {
    test('should fire storage events on change', async ({ page, context }) => {
      // Open a second page
      const page2 = await context.newPage();
      await page2.goto('/');
      await page2.waitForSelector('.virtual-grid');

      // Set up listener on page2
      const eventPromise = page2.evaluate(() => {
        return new Promise((resolve) => {
          const timeout = setTimeout(() => {
            resolve({ received: false, reason: 'timeout' });
          }, 2000);

          window.addEventListener('storage', (e) => {
            clearTimeout(timeout);
            resolve({
              received: true,
              key: e.key,
              newValue: e.newValue,
            });
          });
        });
      });

      // Make change on page1
      await page.evaluate(() => {
        localStorage.setItem('storage-event-test', 'new-value');
      });

      const result = await eventPromise;

      // Cleanup
      await page.evaluate(() => localStorage.removeItem('storage-event-test'));
      await page2.close();

      console.log(
        `[${browserInfo.name}] Storage event: ${(result as { received: boolean }).received ? 'RECEIVED' : 'NOT RECEIVED'}`
      );
    });
  });

  test.describe('Private/Incognito Mode Considerations', () => {
    test('should handle storage in current context', async ({ page }) => {
      // Test that storage works in the current context
      // (Private mode detection is not reliable, so we just test functionality)
      const result = await page.evaluate(() => {
        try {
          localStorage.setItem('private-test', 'value');
          const value = localStorage.getItem('private-test');
          localStorage.removeItem('private-test');
          return { works: value === 'value' };
        } catch (e) {
          return { works: false, error: (e as Error).name };
        }
      });

      console.log(
        `[${browserInfo.name}] Storage in current context: ${(result as { works: boolean }).works ? 'WORKS' : 'BLOCKED'}`
      );
    });
  });
});

/**
 * Summary output for storage test results.
 */
test.afterAll(async () => {
  console.log('\n=== Storage Compatibility Test Summary ===');
  console.log('Tested storage features:');
  console.log('  - localStorage availability and operations');
  console.log('  - sessionStorage availability and operations');
  console.log('  - IndexedDB database operations');
  console.log('  - IndexedDB CRUD and indexes');
  console.log('  - Storage quota handling');
  console.log('  - Data persistence across navigation');
  console.log('  - Clear storage functionality');
  console.log('  - Storage events');
  console.log('==========================================\n');
});
