import type { StorybookConfig } from '@storybook/react-vite';

const config: StorybookConfig = {
  "stories": [
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "staticDirs": [
    {
      "from": "../../storage",
      "to": "/storage"
    }
  ],
  "addons": [],
  "framework": "@storybook/react-vite"
};
export default config;
