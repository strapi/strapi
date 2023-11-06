/* eslint-disable react-hooks/exhaustive-deps */
import { useEffect } from 'react';

/**
 *
 * @param {import('react').EffectCallback} effect
 * @returns void
 */
export const useOnce = (effect) => useEffect(effect, emptyDeps);

/**
 * @type {import('react').DependencyList}
 */
const emptyDeps = [];
