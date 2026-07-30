import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

export function cssVars(variables) {
  return /** @type {import('react').CSSProperties} */ (variables);
}
