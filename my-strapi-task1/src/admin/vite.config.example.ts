import { mergeConfig, type UserConfig } from 'vite';

export default function viteConfig(config: UserConfig) {
  // Important: always return the modified config
  return mergeConfig(config, {
    resolve: {
      alias: {
        '@': '/src',
      },
    },
  });
}
