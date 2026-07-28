import * as React from 'react';
import * as ProgressPrimitive from '@radix-ui/react-progress';

import { cn, cssVars } from '@/lib/utils';

const Progress = React.forwardRef(
  /** @param {React.ComponentPropsWithoutRef<typeof ProgressPrimitive.Root> & {value?: number}} props */
  ({ className, value = 0, 'aria-label': ariaLabel = 'Progress indicator', ...props }, ref) => (
    <ProgressPrimitive.Root
      ref={ref}
      aria-label={ariaLabel}
      className={cn('relative h-2 w-full overflow-hidden rounded-full bg-surface-hover', className)}
      {...props}
    >
      <ProgressPrimitive.Indicator
        className="h-full w-full flex-1 translate-x-[var(--progress-offset)] bg-primary transition-transform"
        style={cssVars({ '--progress-offset': `-${100 - (value || 0)}%` })}
      />
    </ProgressPrimitive.Root>
  )
);
Progress.displayName = ProgressPrimitive.Root.displayName;

export { Progress };
