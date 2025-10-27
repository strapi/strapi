/// <reference types="vitest/importMeta" />
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Project paths
      '@': path.resolve(__dirname, 'admin/src'),
      '@tests': path.resolve(__dirname, 'admin/tests'),

      // React dependencies - correctly resolved
      react: path.resolve(__dirname, '../../../node_modules/react'),
      'react-dom': path.resolve(__dirname, '../../../node_modules/react-dom'),
      'react/jsx-runtime': path.resolve(__dirname, '../../../node_modules/react/jsx-runtime'),
      'react/jsx-dev-runtime': path.resolve(
        __dirname,
        '../../../node_modules/react/jsx-dev-runtime'
      ),
      '@testing-library/react': path.resolve(
        __dirname,
        '../../../node_modules/@testing-library/react'
      ),
      '@testing-library/jest-dom': path.resolve(
        __dirname,
        '../../../node_modules/@testing-library/jest-dom'
      ),

      // Other dependencies you might need
      'styled-components': path.resolve(__dirname, '../../../node_modules/styled-components'),
      '@strapi/design-system': path.resolve(
        __dirname,
        '../../../node_modules/@strapi/design-system'
      ),
      '@strapi/icons': path.resolve(__dirname, '../../../node_modules/@strapi/icons'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './admin/vitest.setup.ts',
    environmentOptions: {
      jsdom: {
        url: 'http://localhost:1337/admin',
      },
    },
    include: ['./admin/src/**/*.test.{ts,tsx}'],
    transformMode: {
      web: [/\.[jt]sx?$/],
    },
    logHeapUsage: true,
    reporters: ['default'],
  },
});
