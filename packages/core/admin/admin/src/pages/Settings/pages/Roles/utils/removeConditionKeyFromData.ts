type DataWithoutCondition<TData extends { conditions?: unknown }> = Omit<TData, 'conditions'>;

const removeConditionKeyFromData = <TData extends { conditions?: unknown }>(
  obj?: TData
): DataWithoutCondition<TData> | null => {
  if (!obj) {
    return null;
  }

  return Object.entries(obj).reduce((acc, [key, value]) => {
    if (key !== 'conditions') {
      // @ts-expect-error – TODO: fix this type error correctly.
      acc[key] = value;
    }

    return acc;
  }, {} as DataWithoutCondition<TData>);
};

export { removeConditionKeyFromData };
export type { DataWithoutCondition };
