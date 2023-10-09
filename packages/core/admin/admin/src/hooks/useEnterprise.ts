import * as React from 'react';

import { useCallbackRef } from '@strapi/helper-plugin';

function isEnterprise() {
  return window.strapi.isEE;
}

export interface UseEnterpriseOptions<TCEData, TEEData, TCombinedData> {
  defaultValue?: TCEData | TEEData | null;
  combine?: (ceData: TCEData, eeData: TEEData) => TCEData | TEEData | TCombinedData;
  enabled?: boolean;
}

export function useEnterprise<TCEData, TEEData, TCombinedData = unknown>(
  ceData: TCEData,
  eeCallback: () => Promise<TEEData>,
  {
    defaultValue = null,
    combine = (ceData: TCEData, eeData: TEEData) => eeData,
    enabled = true,
  }: UseEnterpriseOptions<TCEData, TEEData, TCombinedData> = {}
) {
  const eeCallbackRef = useCallbackRef(eeCallback);
  const combineCallbackRef = useCallbackRef(combine);

  // We have to use a nested object here, because functions (e.g. Components)
  // can not be stored as value directly
  const [{ data }, setData] = React.useState<{ data: TCEData | TEEData | TCombinedData | null }>({
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
