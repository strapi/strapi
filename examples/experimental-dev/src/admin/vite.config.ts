import { UserConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default (config: UserConfig): UserConfig => {
  const USE_REACT_COMPILER = process.env.USE_REACT_COMPILER === 'true';

  if (USE_REACT_COMPILER) {
    console.log('--------------------------------');
    console.log('---- Using React Compiler ----');
    console.log('--------------------------------');

    const existingPlugins = config.plugins?.slice(1) ?? [];

    const newConfig: UserConfig = {
      ...config,
      plugins: [
        react({
          babel: {
            plugins: [['babel-plugin-react-compiler']],
          },
        }),
        ...existingPlugins,
      ],
    };

    return newConfig;
  }

  return config;
};
