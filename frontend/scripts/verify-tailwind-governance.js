import fs from 'fs';
import { globSync } from 'glob';

console.log('🔍 Running Tailwind Migration Architecture & Governance Linter...');

let errors = [];

// 1. Scan JSX files for forbidden dynamic class string interpolation (e.g. className={`bg-${color}`})
const jsxFiles = globSync('src/**/*.{jsx,tsx}', { cwd: process.cwd() });

for (const file of jsxFiles) {
  const content = fs.readFileSync(file, 'utf-8');
  const lines = content.split('\n');

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
  });
}

// 2. Check for unauthorized new .css files
const cssFiles = globSync('src/**/*.css', { cwd: process.cwd() });
const allowedCssFiles = [
  'src/index.css',
  'src/styles/tokens.css',
  'src/styles/base.css',
  'src/styles/layout.css',
  'src/styles/components.css',
  'src/styles/pages.css',
  'src/styles/animations.css',
];

for (const file of cssFiles) {
  const normalizedPath = file.replace(/\\/g, '/');
  if (!allowedCssFiles.includes(normalizedPath)) {
    errors.push(
      `[UNAUTHORIZED CSS FILE] New CSS file created: ${file}. All styling must be Tailwind classes or added to authorized hybrid CSS files.`
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
