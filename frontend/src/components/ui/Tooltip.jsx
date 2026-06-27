import { cloneElement, isValidElement, useId, useState } from 'react';

export function Tooltip({ content, children }) {
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
    <span className="ui-tooltip-wrap">
      {trigger}
      {open && (
        <span className="ui-tooltip" id={tooltipId} role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}
