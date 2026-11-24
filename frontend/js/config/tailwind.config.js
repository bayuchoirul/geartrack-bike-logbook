tailwind.config = {
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        "surface-tint": "#abd600",
        "on-secondary": "#003640",
        "secondary": "#4cd7f6",
        "error-container": "#93000a",
        "on-surface": "#dce1fb",
        "on-background": "#dce1fb",
        "surface-container-highest": "#2e3447",
        "on-primary": "#283500",
        "error": "#ffb4ab",
        "on-surface-variant": "#c4c9ac",
        "surface-container-lowest": "#070d1f",
        "primary": "#ffffff",
        "on-error": "#690005",
        "primary-container": "#c3f400",
        "surface-container": "#191f31",
        "tertiary-container": "#6ffbbe",
        "surface-container-high": "#23293c",
        "surface-container-low": "#151b2d",
        "background": "#0c1324",
        "tertiary-fixed": "#6ffbbe",
        "outline-variant": "#444933",
        "primary-fixed": "#c3f400",
        "secondary-container": "#03b5d3",
        "tertiary-fixed-dim": "#4edea3",
        "outline": "#8e9379",
        "surface": "#0c1324"
      },
      spacing: {
        "margin-desktop": "2rem",
        "gutter-desktop": "1.5rem",
        "space-xl": "2.5rem",
        "space-lg": "1.5rem",
        "space-md": "1rem",
        "space-sm": "0.5rem",
        "space-xs": "0.25rem"
      },
      fontFamily: {
        "headline-lg": ["Space Grotesk"],
        "headline-md": ["Space Grotesk"],
        "headline-sm": ["Space Grotesk"],
        "body-md": ["Inter"],
        "body-sm": ["Inter"],
        "telemetry-data": ["JetBrains Mono"],
        "telemetry-metric-md": ["JetBrains Mono"],
        "telemetry-metric-lg": ["JetBrains Mono"],
        "label-caps": ["JetBrains Mono"]
      },
      fontSize: {
        "headline-lg": ["32px", { lineHeight: "38px", fontWeight: "600" }],
        "headline-md": ["22px", { lineHeight: "28px", fontWeight: "600" }],
        "headline-sm": ["18px", { lineHeight: "24px", fontWeight: "600" }],
        "body-md": ["14px", { lineHeight: "20px" }],
        "body-sm": ["12px", { lineHeight: "16px" }],
        "telemetry-data": ["13px", { lineHeight: "18px" }],
        "telemetry-metric-md": ["20px", { lineHeight: "26px", fontWeight: "600" }],
        "telemetry-metric-lg": ["30px", { lineHeight: "34px", fontWeight: "700" }],
        "label-caps": ["11px", { lineHeight: "14px", letterSpacing: "0.08em", fontWeight: "600" }]
      }
    }
  }
};
