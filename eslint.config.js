import finsweetConfigs from '@finsweet/eslint-config';

export default [
  ...finsweetConfigs,
  {
    languageOptions: {
      globals: {
        // Browser globals used across the modules.
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        Event: 'readonly',
        CustomEvent: 'readonly',
        URLSearchParams: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        // Google Maps Places API (loaded via the Webflow page).
        google: 'readonly',
      },
    },
  },
];
