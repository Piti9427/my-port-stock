import fs from 'fs';
import { globSync } from 'glob';

console.log('🔍 Running Tailwind Migration Architecture & Governance Linter...');

let errors = [];
const rawPaletteUtility =
  /\b(?:bg|text|border|ring|divide)-(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|black|white)(?:-|\/|\b)/;

// 1. Scan JSX files for forbidden dynamic class string interpolation (e.g. className={`bg-${color}`})
const jsxFiles = globSync('src/**/*.{jsx,tsx}', { cwd: process.cwd() });

for (const file of jsxFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

  if (/#[0-9a-fA-F]{3,8}|rgba\(\s*\d|0x[0-9a-fA-F]{6}/.test(content)) {
    errors.push(`[HARDCODED COLOR] ${file} -> JSX/TS sources must use semantic tokens, including canvas and data-visualization colors.`);
  }

  if (/className=[^\n]*(?:\[\.(?!\.)|dark:)/.test(content)) {
    errors.push(`[MALFORMED OR THEME CLASS] ${file} -> Malformed selector or dark: variant detected. Use static semantic utilities.`);
  }

  if (/style\s*=\s*\{\{/.test(content)) {
    errors.push(`[STATIC INLINE STYLE] ${file} -> Move static styles to Tailwind. Runtime values must use inline CSS custom properties only.`);
  }

  if (/className\s*=\s*\{`[^`]*\$\{/.test(content)) {
    errors.push(`[DYNAMIC CLASS STRING] ${file} -> Use cn(), cva(), or a static variant map instead of interpolating class strings.`);
  }

  for (const match of content.matchAll(/style\s*=\s*\{/g)) {
    const styleExpression = content.slice(match.index, match.index + 420);
    if (!styleExpression.includes('cssVars(') && !styleExpression.includes("'--")) {
      errors.push(`[NON-TOKEN INLINE STYLE] ${file} -> Inline style expressions may set runtime CSS custom properties only.`);
      break;
    }
  }

  lines.forEach((line, index) => {
    // Check for string interpolation in utility prefixes
    if (/className=\{`[^`]*\b(bg|text|border|w|h|p|m|gap)-\$\{/g.test(line)) {
      errors.push(
        `[FORBIDDEN DYNAMIC CLASS] ${file}:${index + 1} -> Dynamic string interpolation detected in utility class. Use cn() or lookup map instead.\n    Line: ${line.trim()}`
      );
    }

    // Check for hardcoded hex colors in Tailwind utility strings
    if (/className=.*?\b(bg|text|border)-\[#(?:[0-9a-fA-F]{3}){1,2}\]/g.test(line)) {
      errors.push(
        `[HARDCODED HEX] ${file}:${index + 1} -> Hardcoded hex color in utility class. Use design token or Tailwind theme token.\n    Line: ${line.trim()}`
      );
    }

    if (/className=/.test(line) && rawPaletteUtility.test(line)) {
      errors.push(
        `[RAW PALETTE] ${file}:${index + 1} -> Migrated components must use semantic theme utilities instead of Tailwind palette colors.\n    Line: ${line.trim()}`
      );
    }
  });
}

// 2. Check for unauthorized new .css files
const cssFiles = globSync('src/**/*.css', { cwd: process.cwd() });
const allowedCssFiles = ['src/index.css', 'src/styles/tokens.css', 'src/styles/base.css', 'src/styles/animations.css'];

for (const file of cssFiles) {
  const normalizedPath = file.replace(/\\/g, '/');
  if (!allowedCssFiles.includes(normalizedPath)) {
    errors.push(
      `[UNAUTHORIZED CSS FILE] New CSS file created: ${file}. Component and page styling must use Tailwind; only the approved token, base, and animation CSS files may remain.`
    );
  }
}

if (errors.length > 0) {
  console.error('\n❌ Tailwind Governance Verification Failed:\n');
  errors.forEach((err) => console.error(err));
  process.exit(1);
} else {
  console.log('✅ All Tailwind Governance checks passed successfully!');
}
