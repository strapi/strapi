/**
 *
 * This component is the skeleton around the actual pages, and should only
 * contain code that should be seen on all pages. (e.g. navigation bar)
 *
 */

import { AnErrorOccurred } from '@strapi/helper-plugin';
import { Routes, Route } from 'react-router-dom';

import { pluginId } from '../pluginId';

import { HomePage } from './HomePage';

const App = () => {
  return (
    <div>
      <Routes>
        <Route index element={<HomePage />} />
        <Route path="*" element={<AnErrorOccurred />} />
      </Routes>
    </div>
  );
};

export { App };
