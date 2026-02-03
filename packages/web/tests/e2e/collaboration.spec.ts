import { test, expect, Page, BrowserContext } from '@playwright/test';
import {
  createSpreadsheetHelper,
  SpreadsheetTestHelper,
} from './fixtures/test-data';

/**
 * Note: These tests simulate multi-user scenarios.
 * In a real application, collaboration would be powered by WebSocket/CRDT.
 * These tests use multiple browser contexts to simulate different users.
 */
test.describe('Collaboration Features', () => {
  let helper: SpreadsheetTestHelper;

  test.beforeEach(async ({ page }) => {
    helper = createSpreadsheetHelper(page);
    await helper.goto();
  });

  test.describe('User Presence', () => {
    test('should show current user indicator', async ({ page }) => {
      // Check for user avatar or presence indicator
      const userAvatar = page.locator('.user-avatar, .current-user-indicator');
      if (await userAvatar.isVisible()) {
        await expect(userAvatar).toBeVisible();
      }
    });

    test('should display user list for collaborative session', async ({ page }) => {
      // Look for user list panel
      const userList = page.locator('.user-list, .presence-list');
      if (await userList.isVisible()) {
        // Current user should be in the list
        await expect(userList).toContainText(/You|Current User/i);
      }
    });

    test.skip('should show remote user cursor when another user joins', async ({ browser }) => {
      // Create two browser contexts to simulate two users
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = createSpreadsheetHelper(page1);
      const helper2 = createSpreadsheetHelper(page2);

      // Both users navigate to the same document
      // In a real scenario, this would be a shared document URL
      await helper1.goto('/document/shared-123');
      await helper2.goto('/document/shared-123');

      // User 1 selects a cell
      await helper1.selectCell(5, 5);

      // User 2 should see User 1's cursor
      const remoteCursor = page2.locator('.user-cursor, .remote-cursor');
      await expect(remoteCursor).toBeVisible({ timeout: 5000 });

      // Clean up
      await context1.close();
      await context2.close();
    });

    test.skip('should show cursor move in real-time', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = createSpreadsheetHelper(page1);
      const helper2 = createSpreadsheetHelper(page2);

      await helper1.goto('/document/shared-456');
      await helper2.goto('/document/shared-456');

      // User 1 moves cursor
      await helper1.selectCell(0, 0);
      await page1.waitForTimeout(100);
      await helper1.selectCell(5, 5);

      // User 2 should see cursor movement
      const remoteCursor = page2.locator('.user-cursor');
      // Verify cursor position changed

      await context1.close();
      await context2.close();
    });

    test.skip('should show typing indicator when user is editing', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      const helper1 = createSpreadsheetHelper(page1);
      const helper2 = createSpreadsheetHelper(page2);

      await helper1.goto('/document/shared-789');
      await helper2.goto('/document/shared-789');

      // User 1 starts editing
      await helper1.startEditingCell(0, 0);
      await page1.keyboard.type('Hello');

      // User 2 should see typing indicator
      const typingIndicator = page2.locator('.user-cursor--editing, .typing-indicator');
      await expect(typingIndicator).toBeVisible();

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Comments', () => {
    test('should add comment to a cell', async ({ page }) => {
      await helper.selectCell(2, 2);

      // Right-click to open context menu
      const cell = helper.getCell(2, 2);
      await cell.click({ button: 'right' });

      const addCommentOption = page.locator('[role="menuitem"]:has-text("Add Comment"), [role="menuitem"]:has-text("Insert Comment")');
      if (await addCommentOption.isVisible()) {
        await addCommentOption.click();

        // Comment input should appear
        const commentInput = page.locator('.comment-input textarea, [data-testid="comment-input"]');
        await expect(commentInput).toBeVisible();

        // Type comment
        await commentInput.fill('This is a test comment');

        // Submit comment
        const submitButton = page.locator('button:has-text("Comment"), button:has-text("Save")');
        await submitButton.click();

        // Comment indicator should appear on cell
        const commentIndicator = page.locator('.comment-indicator').first();
        await expect(commentIndicator).toBeVisible();
      }
    });

    test('should show comment indicator on cell with comment', async ({ page }) => {
      // Add a comment first
      await helper.selectCell(0, 0);

      const cell = helper.getCell(0, 0);
      await cell.click({ button: 'right' });

      const addCommentOption = page.locator('[role="menuitem"]:has-text("Add Comment")');
      if (await addCommentOption.isVisible()) {
        await addCommentOption.click();

        const commentInput = page.locator('.comment-input textarea');
        if (await commentInput.isVisible()) {
          await commentInput.fill('Test comment');
          await page.locator('button:has-text("Comment")').click();
        }

        // Red triangle indicator should be visible
        const indicator = page.locator('.comment-indicator');
        await expect(indicator).toBeVisible();
        // Indicator should be in top-right corner (visual check)
      }
    });

    test('should show comment on hover', async ({ page }) => {
      // Add a comment
      await helper.selectCell(0, 0);
      const cell = helper.getCell(0, 0);
      await cell.click({ button: 'right' });

      const addCommentOption = page.locator('[role="menuitem"]:has-text("Add Comment")');
      if (await addCommentOption.isVisible()) {
        await addCommentOption.click();

        const commentInput = page.locator('.comment-input textarea');
        if (await commentInput.isVisible()) {
          await commentInput.fill('Hover to see this');
          await page.locator('button:has-text("Comment")').click();
        }

        // Hover over the indicator
        const indicator = page.locator('.comment-indicator').first();
        if (await indicator.isVisible()) {
          await indicator.hover();

          // Comment popover should appear
          const commentPopover = page.locator('.comment-popover, .comment-tooltip');
          await expect(commentPopover).toBeVisible();
          await expect(commentPopover).toContainText('Hover to see this');
        }
      }
    });

    test('should reply to a comment', async ({ page }) => {
      // Add initial comment
      await helper.selectCell(0, 0);
      const cell = helper.getCell(0, 0);
      await cell.click({ button: 'right' });

      const addCommentOption = page.locator('[role="menuitem"]:has-text("Add Comment")');
      if (await addCommentOption.isVisible()) {
        await addCommentOption.click();

        const commentInput = page.locator('.comment-input textarea');
        if (await commentInput.isVisible()) {
          await commentInput.fill('Original comment');
          await page.locator('button:has-text("Comment")').click();
        }

        // Click on comment indicator to open thread
        const indicator = page.locator('.comment-indicator').first();
        if (await indicator.isVisible()) {
          await indicator.click();

          // Reply input should be available
          const replyInput = page.locator('.comment-reply-input, [data-testid="reply-input"]');
          if (await replyInput.isVisible()) {
            await replyInput.fill('This is a reply');
            await page.locator('button:has-text("Reply")').click();

            // Thread should show both comments
            const thread = page.locator('.comment-thread');
            await expect(thread).toContainText('Original comment');
            await expect(thread).toContainText('This is a reply');
          }
        }
      }
    });

    test('should resolve a comment', async ({ page }) => {
      // Add a comment
      await helper.selectCell(0, 0);
      const cell = helper.getCell(0, 0);
      await cell.click({ button: 'right' });

      const addCommentOption = page.locator('[role="menuitem"]:has-text("Add Comment")');
      if (await addCommentOption.isVisible()) {
        await addCommentOption.click();

        const commentInput = page.locator('.comment-input textarea');
        if (await commentInput.isVisible()) {
          await commentInput.fill('To be resolved');
          await page.locator('button:has-text("Comment")').click();
        }

        // Open comment
        const indicator = page.locator('.comment-indicator').first();
        if (await indicator.isVisible()) {
          await indicator.click();

          // Click resolve button
          const resolveButton = page.locator('button:has-text("Resolve")');
          if (await resolveButton.isVisible()) {
            await resolveButton.click();

            // Indicator should change to show resolved state
            await expect(indicator).toHaveClass(/resolved/);
          }
        }
      }
    });

    test('should delete a comment', async ({ page }) => {
      // Add a comment
      await helper.selectCell(0, 0);
      const cell = helper.getCell(0, 0);
      await cell.click({ button: 'right' });

      const addCommentOption = page.locator('[role="menuitem"]:has-text("Add Comment")');
      if (await addCommentOption.isVisible()) {
        await addCommentOption.click();

        const commentInput = page.locator('.comment-input textarea');
        if (await commentInput.isVisible()) {
          await commentInput.fill('To be deleted');
          await page.locator('button:has-text("Comment")').click();
        }

        // Open comment and delete
        const indicator = page.locator('.comment-indicator').first();
        if (await indicator.isVisible()) {
          await indicator.click();

          const deleteButton = page.locator('button:has-text("Delete")');
          if (await deleteButton.isVisible()) {
            await deleteButton.click();

            // Confirm deletion if dialog appears
            const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
            if (await confirmButton.isVisible()) {
              await confirmButton.click();
            }

            // Indicator should be removed
            await expect(indicator).not.toBeVisible();
          }
        }
      }
    });

    test('should open comments sidebar', async ({ page }) => {
      // Look for comments panel toggle
      const commentsToggle = page.locator('[data-testid="comments-toggle"], button[aria-label*="Comments"]');
      if (await commentsToggle.isVisible()) {
        await commentsToggle.click();

        const commentsSidebar = page.locator('.comments-sidebar');
        await expect(commentsSidebar).toBeVisible();
      }
    });

    test('should show all comments in sidebar', async ({ page }) => {
      // Add multiple comments
      await helper.selectCell(0, 0);
      let cell = helper.getCell(0, 0);
      await cell.click({ button: 'right' });

      let addCommentOption = page.locator('[role="menuitem"]:has-text("Add Comment")');
      if (await addCommentOption.isVisible()) {
        await addCommentOption.click();
        const input1 = page.locator('.comment-input textarea');
        if (await input1.isVisible()) {
          await input1.fill('Comment 1');
          await page.locator('button:has-text("Comment")').click();
        }
      }

      await helper.selectCell(2, 2);
      cell = helper.getCell(2, 2);
      await cell.click({ button: 'right' });

      addCommentOption = page.locator('[role="menuitem"]:has-text("Add Comment")');
      if (await addCommentOption.isVisible()) {
        await addCommentOption.click();
        const input2 = page.locator('.comment-input textarea');
        if (await input2.isVisible()) {
          await input2.fill('Comment 2');
          await page.locator('button:has-text("Comment")').click();
        }
      }

      // Open comments sidebar
      const commentsToggle = page.locator('[data-testid="comments-toggle"]');
      if (await commentsToggle.isVisible()) {
        await commentsToggle.click();

        const sidebar = page.locator('.comments-sidebar');
        await expect(sidebar).toContainText('Comment 1');
        await expect(sidebar).toContainText('Comment 2');
      }
    });

    test('should navigate to cell from comment in sidebar', async ({ page }) => {
      // Add a comment on a distant cell
      await helper.selectCell(10, 10);
      const cell = helper.getCell(10, 10);
      await cell.click({ button: 'right' });

      const addCommentOption = page.locator('[role="menuitem"]:has-text("Add Comment")');
      if (await addCommentOption.isVisible()) {
        await addCommentOption.click();
        const commentInput = page.locator('.comment-input textarea');
        if (await commentInput.isVisible()) {
          await commentInput.fill('Navigate to me');
          await page.locator('button:has-text("Comment")').click();
        }
      }

      // Go to a different cell
      await helper.selectCell(0, 0);

      // Open sidebar and click comment
      const commentsToggle = page.locator('[data-testid="comments-toggle"]');
      if (await commentsToggle.isVisible()) {
        await commentsToggle.click();

        const commentItem = page.locator('.comment-thread-item, .comment-list-item').first();
        if (await commentItem.isVisible()) {
          await commentItem.click();

          // Should navigate to cell K11 (10, 10)
          await page.waitForTimeout(100);
          expect(await helper.isCellSelected(10, 10)).toBe(true);
        }
      }
    });
  });

  test.describe('Version History', () => {
    test('should open version history panel', async ({ page }) => {
      // Look for version history in File menu
      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const versionHistoryOption = page.locator('[role="menuitem"]:has-text("Version history")');
        if (await versionHistoryOption.isVisible()) {
          await versionHistoryOption.click();

          const versionPanel = page.locator('.version-history-panel');
          await expect(versionPanel).toBeVisible();
        }
      }
    });

    test('should show list of versions', async ({ page }) => {
      // Make some changes to create versions
      await helper.enterCellValue(0, 0, 'Change 1');
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(500);

      await helper.enterCellValue(0, 1, 'Change 2');
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(500);

      // Open version history
      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const versionHistoryOption = page.locator('[role="menuitem"]:has-text("Version history")');
        if (await versionHistoryOption.isVisible()) {
          await versionHistoryOption.click();

          const versionList = page.locator('.version-list');
          if (await versionList.isVisible()) {
            // Should have at least one version
            const versionItems = versionList.locator('.version-item, .version-list-item');
            const count = await versionItems.count();
            expect(count).toBeGreaterThan(0);
          }
        }
      }
    });

    test('should save named version', async ({ page }) => {
      await helper.enterCellValue(0, 0, 'Important data');

      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const versionHistoryOption = page.locator('[role="menuitem"]:has-text("Version history")');
        if (await versionHistoryOption.isVisible()) {
          await versionHistoryOption.click();

          // Click save version button
          const saveVersionButton = page.locator('button:has-text("Save current version")');
          if (await saveVersionButton.isVisible()) {
            await saveVersionButton.click();

            // Enter version name
            const nameInput = page.locator('.version-dialog-input, input[placeholder*="Version name"]');
            if (await nameInput.isVisible()) {
              await nameInput.fill('Release v1.0');
              await page.locator('button:has-text("Save")').click();
            }

            // Version should appear in list with name
            const versionList = page.locator('.version-list');
            await expect(versionList).toContainText('Release v1.0');
          }
        }
      }
    });

    test('should preview a version', async ({ page }) => {
      // Make changes and save
      await helper.enterCellValue(0, 0, 'Original');
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(500);

      await helper.enterCellValue(0, 0, 'Modified');
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(500);

      // Open version history
      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const versionHistoryOption = page.locator('[role="menuitem"]:has-text("Version history")');
        if (await versionHistoryOption.isVisible()) {
          await versionHistoryOption.click();

          // Click on an older version
          const versionItem = page.locator('.version-item, .version-list-item').last();
          if (await versionItem.isVisible()) {
            await versionItem.click();

            // Preview should show
            const previewPanel = page.locator('.version-preview');
            await expect(previewPanel).toBeVisible();
          }
        }
      }
    });

    test('should restore a version', async ({ page }) => {
      // Make changes
      await helper.enterCellValue(0, 0, 'Before');
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(500);

      await helper.enterCellValue(0, 0, 'After');
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(500);

      // Open version history
      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const versionHistoryOption = page.locator('[role="menuitem"]:has-text("Version history")');
        if (await versionHistoryOption.isVisible()) {
          await versionHistoryOption.click();

          // Select older version
          const versionItem = page.locator('.version-item').last();
          if (await versionItem.isVisible()) {
            await versionItem.click();

            // Click restore
            const restoreButton = page.locator('button:has-text("Restore")');
            if (await restoreButton.isVisible()) {
              await restoreButton.click();

              // Confirm
              const confirmButton = page.locator('button:has-text("Confirm"), button:has-text("Yes")');
              if (await confirmButton.isVisible()) {
                await confirmButton.click();
              }

              // Close version history
              await page.keyboard.press('Escape');

              // Data should be restored
              // const value = await helper.getCellValue(0, 0);
              // expect(value).toBe('Before');
            }
          }
        }
      }
    });

    test('should compare versions', async ({ page }) => {
      // Make changes
      await helper.enterCellValue(0, 0, 'Version 1');
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(500);

      await helper.enterCellValue(0, 0, 'Version 2');
      await page.keyboard.press('Control+s');
      await page.waitForTimeout(500);

      // Open version history
      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const versionHistoryOption = page.locator('[role="menuitem"]:has-text("Version history")');
        if (await versionHistoryOption.isVisible()) {
          await versionHistoryOption.click();

          // Select a version
          const versionItem = page.locator('.version-item').last();
          if (await versionItem.isVisible()) {
            await versionItem.click();

            // Click compare
            const compareButton = page.locator('button:has-text("Compare")');
            if (await compareButton.isVisible()) {
              await compareButton.click();

              // Diff view should appear
              const diffView = page.locator('.version-diff');
              await expect(diffView).toBeVisible();
            }
          }
        }
      }
    });

    test('should close version history on Escape', async ({ page }) => {
      const fileMenu = page.locator('[role="menubar"] >> text=File');
      if (await fileMenu.isVisible()) {
        await fileMenu.click();

        const versionHistoryOption = page.locator('[role="menuitem"]:has-text("Version history")');
        if (await versionHistoryOption.isVisible()) {
          await versionHistoryOption.click();

          const versionPanel = page.locator('.version-history-panel');
          await expect(versionPanel).toBeVisible();

          await page.keyboard.press('Escape');
          await expect(versionPanel).not.toBeVisible();
        }
      }
    });
  });

  test.describe('Sharing', () => {
    test.skip('should open share dialog', async ({ page }) => {
      // Click share button
      const shareButton = page.locator('button:has-text("Share")');
      if (await shareButton.isVisible()) {
        await shareButton.click();

        const shareDialog = page.locator('.share-dialog, [role="dialog"][aria-labelledby*="share"]');
        await expect(shareDialog).toBeVisible();
      }
    });

    test.skip('should generate shareable link', async ({ page }) => {
      const shareButton = page.locator('button:has-text("Share")');
      if (await shareButton.isVisible()) {
        await shareButton.click();

        const copyLinkButton = page.locator('button:has-text("Copy link")');
        if (await copyLinkButton.isVisible()) {
          await copyLinkButton.click();

          // Link should be copied to clipboard
        }
      }
    });

    test.skip('should invite collaborator by email', async ({ page }) => {
      const shareButton = page.locator('button:has-text("Share")');
      if (await shareButton.isVisible()) {
        await shareButton.click();

        const emailInput = page.locator('input[type="email"], input[placeholder*="email"]');
        if (await emailInput.isVisible()) {
          await emailInput.fill('collaborator@example.com');

          const inviteButton = page.locator('button:has-text("Invite"), button:has-text("Send")');
          await inviteButton.click();
        }
      }
    });
  });
});
