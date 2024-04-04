import * as React from 'react';

import { useCallbackRef } from '@strapi/design-system';

function isEnterprise() {
  return window.strapi.isEE;
}

export interface UseEnterpriseOptions<TCEData, TEEData, TDefaultValue, TCombinedValue> {
  defaultValue?: TDefaultValue;
  combine?: (ceData: TCEData, eeData: TEEData) => TCombinedValue;
  enabled?: boolean;
}

type UseEnterpriseReturn<TCEData, TEEData, TDefaultValue, TCombinedValue> =
  TDefaultValue extends null
    ? TCEData | TEEData | TCombinedValue | null
    : TCEData | TEEData | TCombinedValue | TDefaultValue;

export const useEnterprise = <
  TCEData,
  TEEData = TCEData,
  TCombinedValue = TEEData,
  TDefaultValue = TCEData,
>(
  ceData: TCEData,
  eeCallback: () => Promise<TEEData>,
  opts: UseEnterpriseOptions<TCEData, TEEData, TDefaultValue, TCombinedValue> = {}
): UseEnterpriseReturn<TCEData, TEEData, TDefaultValue, TCombinedValue> => {
  const { defaultValue = null, combine = (_ceData, eeData) => eeData, enabled = true } = opts;
  const eeCallbackRef = useCallbackRef(eeCallback);
  const combineCallbackRef = useCallbackRef(combine);

  // We have to use a nested object here, because functions (e.g. Components)
  // can not be stored as value directly
  const [{ data }, setData] = React.useState<{
    data: TCEData | TEEData | TDefaultValue | TCombinedValue | null;
  }>({
    data: isEnterprise() && enabled ? defaultValue : ceData,
  });

  React.useEffect(() => {
    async function importEE() {
      const eeData = await eeCallbackRef();
      const combinedValue = combineCallbackRef(ceData, eeData);

      setData({ data: combinedValue ? combinedValue : eeData });
    }

    if (isEnterprise() && enabled) {
      importEE();
    }
  }, [ceData, eeCallbackRef, combineCallbackRef, enabled]);

  // @ts-expect-error – the hook type assertion works in practice. But seems to have issues here...
  return data;
};
