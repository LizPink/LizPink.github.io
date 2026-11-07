# Noto Sans SC

Noto Sans SC is self-hosted for Chinese body and interface text. IBM Plex Mono remains the command typeface; Source Serif 4 remains the heading and wordmark typeface.

- Font family: Noto Sans SC, normal style, variable weights 400–700. Body/UI use 400 and 500; semantic bold uses 700.
- Source: [Google Fonts CSS API](https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400..700&display=swap), obtained on 2026-11-07 with a modern browser user agent.
- Upstream family and license: [google/fonts — ofl/notosanssc](https://github.com/google/fonts/tree/main/ofl/notosanssc).
- License: SIL Open Font License 1.1, included in `NotoSansSC-OFL.txt`.
- Loader: `noto-sans-sc.css`; 101 WOFF2 Unicode-range subsets are stored in `noto-sans-sc/`.

The CSS retains the upstream Unicode ranges and `font-display: swap`. Only subsets needed for the text on a page are fetched by the browser. All font URLs are relative to this repository; visitors do not need the font installed, and the published page does not request fonts from Google.

Keep every subset when publishing so future articles can use characters absent from the current content. The normal site build copies and versions both the loader and font files.
