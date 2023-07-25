import * as React from 'react';

import { useCallbackRef } from '@strapi/helper-plugin';

function isEnterprise() {
  return window.strapi.isEE;
}

export function useEnterprise(
  ceData,
  eeCallback,
  { defaultValue = null, combine = (ceData, eeData) => eeData, enabled = true } = {}
) {
  const eeCallbackRef = useCallbackRef(eeCallback);
  const combineCallbackRef = useCallbackRef(combine);

  // We have to use a nested object here, because functions (e.g. Components)
  // can not be stored as value directly
  const [{ data }, setData] = React.useState({
    data: isEnterprise() && enabled ? defaultValue : ceData,
  });

  React.useEffect(() => {
    async function importEE() {
      const eeData = await eeCallbackRef();

      setData({ data: combineCallbackRef(ceData, eeData) });
    }

    if (isEnterprise() && enabled) {
      importEE();
    }
  }, [ceData, eeCallbackRef, combineCallbackRef, enabled]);

  return data;
}
