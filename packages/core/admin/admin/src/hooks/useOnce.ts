/* eslint-disable react-hooks/exhaustive-deps */
import * as React from 'react';

export const useOnce = (effect: React.EffectCallback) => React.useEffect(effect, emptyDeps);

const emptyDeps: React.DependencyList = [];
