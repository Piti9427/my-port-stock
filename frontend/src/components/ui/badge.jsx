import * as React from 'react';
import { cva } from 'class-variance-authority';

import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-surface-hover hover:text-foreground',
        secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-surface-hover',
        destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-fin-loss-dim hover:text-fin-loss',
        outline: 'text-foreground',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

const Badge = React.forwardRef(
  /** @param {React.HTMLAttributes<HTMLDivElement> & {variant?: 'default'|'secondary'|'destructive'|'outline'}} props */
  function Badge({ className, variant = 'default', ...props }, ref) {
    return <div ref={ref} className={cn(badgeVariants({ variant }), className)} {...props} />;
  }
);

export { Badge };
