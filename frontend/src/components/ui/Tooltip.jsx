import { cloneElement, isValidElement, useId, useState } from 'react';
import { cn } from '@/lib/utils';

export function Tooltip({ content, children, className = '' }) {
  const [open, setOpen] = useState(false);
  const tooltipId = useId();

  if (!isValidElement(children)) {
    return children;
  }

  const trigger = cloneElement(children, {
    'aria-describedby': open ? tooltipId : undefined,
    onBlur: (event) => {
      children.props.onBlur?.(event);
      setOpen(false);
    },
    onFocus: (event) => {
      children.props.onFocus?.(event);
      setOpen(true);
    },
    onMouseEnter: (event) => {
      children.props.onMouseEnter?.(event);
      setOpen(true);
    },
    onMouseLeave: (event) => {
      children.props.onMouseLeave?.(event);
      setOpen(false);
    },
  });

  return (
    <span className="relative inline-flex">
      {trigger}
      {open && (
        <span
          className={cn(
            'absolute bottom-full left-1/2 z-50 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded border border-border bg-surface px-2 py-1 text-xs font-medium text-foreground animate-in fade-in zoom-in-95 duration-100',
            className
          )}
          id={tooltipId}
          role="tooltip"
        >
          {content}
        </span>
      )}
    </span>
  );
}
