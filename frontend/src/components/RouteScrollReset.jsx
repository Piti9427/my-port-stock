import { useLayoutEffect } from 'react';
import { useLocation } from 'react-router-dom';

export function RouteScrollReset() {
  const location = useLocation();

  useLayoutEffect(() => {
    const scrollRoot = document.scrollingElement || document.documentElement;
    scrollRoot.scrollTop = 0;
    scrollRoot.scrollLeft = 0;
  }, [location.pathname, location.search]);

  return null;
}
