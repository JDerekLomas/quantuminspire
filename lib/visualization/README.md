# Visualization helpers

- `rabiConfig.ts`: Colormaps, view configs, and recipes for the Rabi explorer. UI components import these so visualization constants stay out of React code.

If you add new visualizations, keep pure configs/helpers here (no React dependencies) and import from your app pages.
