import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import * as fs from 'fs';
import * as path from 'path';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'laptop', width: 1024, height: 768 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 390, height: 844 },
];

const ROUTES = [
  { path: '/', name: 'Today' },
  { path: '/dashboard', name: 'Dashboard' },
  { path: '/risk', name: 'Risk' },
  { path: '/command-center', name: 'CommandCenter' },
  { path: '/market', name: 'MarketExplorer' },
  { path: '/journal', name: 'Journal' },
  { path: '/analytics', name: 'Analytics' },
  { path: '/config', name: 'Config' },
  { path: '/ticker/AAPL', name: 'TickerDetail' },
];

interface AuditIssue {
  type: string;
  viewport: string;
  route: string;
  selector?: string;
  details: string;
}

test.describe('Impeccable UI Responsiveness & Text Layout Audit', () => {
  test.use({
    extraHTTPHeaders: {
      Authorization: 'Bearer dev-ui-auth-bypass',
    },
  });

  const auditIssues: AuditIssue[] = [];

  test.afterAll(() => {
    const rootDir = process.cwd().endsWith('frontend') ? path.resolve(process.cwd(), '..') : process.cwd();
    const reportDir = path.join(rootDir, '.impeccable', 'critique');
    if (!fs.existsSync(reportDir)) {
      fs.mkdirSync(reportDir, { recursive: true });
    }

    const reportPath = path.join(reportDir, '2026-07-27-ui-responsiveness-audit-report.md');
    let reportContent = `# Impeccable UI Responsiveness & Text Layout Audit Report\n\n`;
    reportContent += `**Audit Date:** ${new Date().toISOString()}\n`;
    reportContent += `**Tested Viewports:** Desktop (1440x900), Laptop (1024x768), Tablet (768x1024), Mobile (390x844)\n`;
    reportContent += `**Routes Scanned:** ${ROUTES.length} routes\n\n`;

    if (auditIssues.length === 0) {
      reportContent += `## Status: PASS\nAll pages and viewports passed zero text clipping, zero horizontal page overflow, and accessibility color contrast checks.\n`;
    } else {
      reportContent += `## Status: ISSUES DETECTED (${auditIssues.length} items)\n\n`;
      reportContent += `| Viewport | Route | Issue Type | Details |\n`;
      reportContent += `|---|---|---|---|\n`;
      for (const issue of auditIssues) {
        reportContent += `| \`${issue.viewport}\` | \`${issue.route}\` | **${issue.type}** | ${issue.details} |\n`;
      }
    }

    fs.writeFileSync(reportPath, reportContent, 'utf-8');
  });

  for (const vp of VIEWPORTS) {
    test.describe(`Viewport: ${vp.name} (${vp.width}x${vp.height})`, () => {
      for (const route of ROUTES) {
        test(`Audit layout & text integrity on ${route.name} (${route.path})`, async ({ page }) => {
          const issueCountBeforeAudit = auditIssues.length;
          await page.setViewportSize({ width: vp.width, height: vp.height });
          await page.goto(route.path);

          // Wait for loading indicator to finish
          const loading = page.locator('text=กำลังโหลดข้อมูล');
          if (await loading.isVisible().catch(() => false)) {
            await expect(loading).not.toBeVisible({ timeout: 15000 });
          }

          // Wait for the longest global theme transition before measuring
          // geometry and contrast.
          await page.waitForTimeout(700);

          // 1. Check Body Horizontal Overflow
          const overflowInfo = await page.evaluate(() => {
            const docWidth = document.documentElement.clientWidth;
            const scrollWidth = document.documentElement.scrollWidth;
            const bodyScrollWidth = document.body.scrollWidth;
            const maxScroll = Math.max(scrollWidth, bodyScrollWidth);
            return {
              hasOverflow: maxScroll > docWidth + 2,
              docWidth,
              maxScroll,
            };
          });

          if (overflowInfo.hasOverflow) {
            auditIssues.push({
              type: 'Page Horizontal Overflow',
              viewport: vp.name,
              route: route.path,
              details: `Document width is ${overflowInfo.docWidth}px but scroll width is ${overflowInfo.maxScroll}px`,
            });
          }

          // 2. Check Text Clipping and Micro Font Sizes
          const elementIssues = await page.evaluate(() => {
            const issues: { selector: string; type: string; details: string }[] = [];
            const textNodes = Array.from(
              document.querySelectorAll('h1, h2, h3, h4, h5, h6, p, span, button, a, label, th, td, div.metric-value, div.card-title')
            );

            for (const el of textNodes) {
              const htmlEl = el as HTMLElement;
              const text = htmlEl.innerText?.trim();
              if (!text || text.length === 0) continue;

              const style = window.getComputedStyle(htmlEl);
              const fontSizePx = parseFloat(style.fontSize);

              // Font size check
              // Preserve the compact 10.7-10.9px labels from the develop
              // baseline while rejecting genuinely illegible microcopy.
              if (fontSizePx < 10.5 && !htmlEl.closest('svg') && !htmlEl.classList.contains('sr-only')) {
                issues.push({
                  selector: htmlEl.className || htmlEl.tagName,
                  type: 'Micro Font Size',
                  details: `Text "${text.slice(0, 20)}" has font-size ${fontSizePx}px (<10.5px)`,
                });
              }

              // Text clipping check on overflow: hidden containers (ignore screen reader sr-only elements)
              if (
                !htmlEl.classList.contains('sr-only') &&
                !htmlEl.closest('.sr-only') &&
                (style.overflow === 'hidden' || style.overflowX === 'hidden' || style.overflowY === 'hidden')
              ) {
                const isClippedHeight = htmlEl.scrollHeight > htmlEl.clientHeight + 4;
                const isClippedWidth = htmlEl.scrollWidth > htmlEl.clientWidth + 4;
                const hasEllipsis = style.textOverflow === 'ellipsis' || style.webkitLineClamp !== 'none';

                if ((isClippedHeight || isClippedWidth) && !hasEllipsis) {
                  issues.push({
                    selector: htmlEl.className || htmlEl.tagName,
                    type: 'Text Truncation / Clipping',
                    details: `Text "${text.slice(0, 25)}" is clipped (scroll: ${htmlEl.scrollWidth}x${htmlEl.scrollHeight}, client: ${htmlEl.clientWidth}x${htmlEl.clientHeight})`,
                  });
                }
              }
            }

            return issues;
          });

          for (const ei of elementIssues) {
            auditIssues.push({
              type: ei.type,
              viewport: vp.name,
              route: route.path,
              selector: ei.selector,
              details: ei.details,
            });
          }

          // 3. Accessibility Scan via Axe (including color contrast)
          const axeResults = await new AxeBuilder({ page })
            // TradingView owns the embedded document; its internals cannot be
            // corrected by this application. The iframe itself remains in the
            // app-level layout and accessible-name checks above.
            .exclude('.tradingview-widget-container')
            .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
            .analyze();

          for (const violation of axeResults.violations) {
            const affectedNodes = violation.nodes
              .slice(0, 6)
              .map((node) => `${node.target.join(' ')}: ${node.failureSummary || 'failed'}`)
              .join('; ');
            auditIssues.push({
              type: `A11y Violation: ${violation.id}`,
              viewport: vp.name,
              route: route.path,
              details: `${violation.help} (${violation.nodes.length} nodes) — ${affectedNodes}`,
            });
          }

          const rootDir = process.cwd().endsWith('frontend') ? path.resolve(process.cwd(), '..') : process.cwd();
          const screenshotDir = path.join(rootDir, 'artifacts', 'screenshots', 'ui-audit', vp.name);
          if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
          }

          const fileSlug = route.name.toLowerCase();
          await page.screenshot({
            path: path.join(screenshotDir, `${fileSlug}.png`),
            fullPage: true,
          });

          // Core expectation: No horizontal page overflow
          expect(overflowInfo.hasOverflow).toBe(false);
          expect(auditIssues.slice(issueCountBeforeAudit), `${route.name} must pass layout, text, and contrast audit`).toEqual([]);
        });
      }

      // Interactive Functions Test (Command Palette & Sidebar Toggle)
      test(`Audit interactive functions on ${vp.name}`, async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height });
        await page.goto('/dashboard');
        await page.waitForTimeout(300);

        // Test Command Palette (⌘K / Ctrl+K)
        await page.keyboard.press('ControlOrMeta+K');
        const dialog = page.getByRole('dialog');
        if (await dialog.isVisible().catch(() => false)) {
          const dialogBounds = await dialog.boundingBox();
          if (dialogBounds) {
            expect(dialogBounds.width).toBeLessThanOrEqual(vp.width);
            expect(dialogBounds.x).toBeGreaterThanOrEqual(0);
          }
          await page.keyboard.press('Escape');
        }

        // Test Sidebar Toggle Shortcut (⌘B / Ctrl+B)
        const sideNav = page.locator('nav.side-nav');
        if (await sideNav.isVisible().catch(() => false)) {
          await page.keyboard.press('ControlOrMeta+B');
          await page.waitForTimeout(200);
          const isCollapsed = await sideNav.evaluate((el) => el.classList.contains('collapsed'));
          expect(isCollapsed).toBe(true);
        }
      });
    });
  }
});
