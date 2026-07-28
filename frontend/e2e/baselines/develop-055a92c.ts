export const DEVELOP_SHELL_BASELINE = {
  mobile: {
    nav: { x: 0, y: 772, width: 390, height: 72 },
    main: { x: 0, y: 0, width: 390 },
    header: { x: 0, y: 0, width: 390, height: 136.171875 },
    heading: { x: 16, y: 35.265625, height: 25.90625 },
  },
  tablet: {
    nav: { x: 0, y: 952, width: 768, height: 72 },
    main: { x: 0, y: 0, width: 768 },
    header: { x: 0, y: 0, width: 768, height: 136.171875 },
    heading: { x: 16, y: 35.265625, height: 25.90625 },
  },
  laptop: {
    nav: { x: 0, y: 0, width: 260, height: 768 },
    main: { x: 260, y: 0, width: 764, height: 768 },
    header: { x: 260, y: 0, width: 764, height: 80.171875 },
    heading: { x: 288, y: 37.265625, height: 25.90625 },
  },
  desktop: {
    nav: { x: 0, y: 0, width: 260, height: 900 },
    main: { x: 260, y: 0, width: 1180, height: 900 },
    header: { x: 260, y: 0, width: 1180, height: 80.171875 },
    heading: { x: 288, y: 37.265625, height: 25.90625 },
  },
} as const;

export const DEVELOP_DARK_TOKENS = {
  background: '#0a0a0a',
  foreground: '#ededed',
  surface: '#171717',
  border: '#262626',
} as const;
