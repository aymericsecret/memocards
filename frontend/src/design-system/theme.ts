export const theme = {
  colors: {
    background: "hsl(40 20% 99%)",
    foreground: "hsl(220 15% 22%)",
    card: "hsl(0 0% 100%)",
    popover: "hsl(0 0% 100%)",
    primary: "hsl(220 15% 22%)",
    primaryForeground: "hsl(0 0% 100%)",
    secondary: "hsl(220 14% 96%)",
    muted: "hsl(220 14% 96%)",
    mutedForeground: "hsl(220 9% 46%)",
    accent: "hsl(150 55% 40%)",
    accentForeground: "hsl(0 0% 100%)",
    destructive: "hsl(0 75% 55%)",
    border: "hsl(220 13% 91%)",
    input: "hsl(220 13% 91%)",
    ring: "hsl(220 15% 22%)"
  },
  fonts: {
    body: "\"Geist\", sans-serif",
    display: "\"Geist\", sans-serif"
  },
  fontSizes: {
    xs: "0.68rem",
    sm: "0.75rem",
    md: "0.875rem",
    base: "1rem",
    lg: "1.15rem",
    xl: "1.35rem"
  },
  sizes: {
    controlSm: "32px",
    controlMd: "36px",
    iconButton: "36px",
    input: "38px",
    menuItem: "34px"
  },
  space: {
    0: "0",
    1: "2px",
    2: "4px",
    3: "6px",
    4: "8px",
    5: "10px",
    6: "12px",
    7: "14px",
    8: "16px",
    10: "20px",
    11: "22px",
    12: "24px",
    14: "28px",
    16: "32px"
  },
  radii: {
    sm: "0.5rem",
    md: "0.75rem",
    lg: "1rem",
    pill: "999px"
  },
  shadows: {
    popover: "0 18px 48px -20px hsl(220 15% 22% / 0.28)",
    modal: "0 28px 80px -30px hsl(220 15% 22% / 0.45)"
  },
  breakpoints: {
    mobile: "720px"
  }
} as const;

export type AppTheme = typeof theme;
