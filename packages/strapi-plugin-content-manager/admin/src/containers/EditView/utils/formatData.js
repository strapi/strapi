import { cloneDeep, get, isArray, isObject, set, unset } from 'lodash';

export const getMediaAttributes = (ctLayout, groupLayouts) => {
  const getMedia = (
    layout,
    prefix = '',
    isGroupType = false,
    repeatable = false
  ) => {
    const attributes = get(layout, ['schema', 'attributes'], {});

    return Object.keys(attributes).reduce((acc, current) => {
      const type = get(attributes, [current, 'type']);
      const multiple = get(attributes, [current, 'multiple'], false);
      const isRepeatable = get(attributes, [current, 'repeatable']);
      const isGroup = type === 'group';

      if (isGroup) {
        const group = get(attributes, [current, 'group']);

        return {
          ...acc,
          ...getMedia(groupLayouts[group], current, isGroup, isRepeatable),
        };
      }

      if (type === 'media') {
        const path = prefix !== '' ? `${prefix}.${current}` : current;

        acc[path] = { multiple, isGroup: isGroupType, repeatable };
      }

      return acc;
    }, {});
  };

  return getMedia(ctLayout);
};

export const getFilesToUpload = (data, prefix = '') => {
  return Object.keys(data).reduce((acc, current) => {
    if (isObject(data[current]) && !isArray(data[current])) {
      return getFilesToUpload(data[current], current);
    }

    if (get(data, [current]) instanceof File) {
      const path = prefix !== '' ? `${prefix}.${current}` : current;

      acc[path] = data[current];
    }

    return acc;
  }, {});
};

const helperCleanData = (value, key) => {
  if (isArray(value)) {
    return value.map(obj => (obj[key] ? obj[key] : obj));
  } else if (isObject(value)) {
    return value[key];
  } else {
    return value;
  }
};

export const cleanData = (retrievedData, ctLayout, groupLayouts) => {
  const getType = (schema, attrName) =>
    get(schema, ['attributes', attrName, 'type'], '');
  const getOtherInfos = (schema, arr) =>
    get(schema, ['attributes', ...arr], '');

  const recursiveCleanData = (data, layout) => {
    return Object.keys(data).reduce((acc, current) => {
      const attrType = getType(layout.schema, current);
      const value = get(data, current);
      const group = getOtherInfos(layout.schema, [current, 'group']);
      const isRepeatable = getOtherInfos(layout.schema, [
        current,
        'repeatable',
      ]);
      let cleanedData;

      switch (attrType) {
        case 'json':
          cleanedData = value;
          break;
        case 'date':
          cleanedData =
            value && value._isAMomentObject === true
              ? value.toISOString()
              : value;
          break;
        case 'media':
          if (getOtherInfos(layout.schema, [current, 'multiple'])) {
            cleanedData = value
              ? value.filter(file => !(file instanceof File))
              : null;
          } else {
            cleanedData =
              get(value, 0) instanceof File ? '' : get(value, 'id', null);
          }
          break;
        case 'group':
          if (isRepeatable) {
            cleanedData = value
              ? value.map(data => {
                  delete data._temp__id;
                  const subCleanedData = recursiveCleanData(
                    data,
                    groupLayouts[group]
                  );

                  return subCleanedData;
                })
              : value;
          } else {
            cleanedData = recursiveCleanData(value, groupLayouts[group]);
          }
          break;
        default:
          cleanedData = helperCleanData(value, 'id');
      }

      acc[current] = cleanedData;

      return acc;
    }, {});
  };

  return recursiveCleanData(retrievedData, ctLayout);
};

export const associateFilesToData = (data, filesMap, uploadedFiles) => {
  const ret = cloneDeep(data);

  Object.keys(uploadedFiles).forEach(key => {
    const keys = key.split('.');
    const filesMapKey =
      keys.length > 2
        ? [keys[0], keys[2]]
        : [keys[0], keys[1]].filter(k => !!k);
    const isMultiple = get(filesMap, [...filesMapKey, 'multiple'], false);
    const cleanedValue = get(uploadedFiles, key, []).map(v =>
      helperCleanData(v, 'id')
    );

    if (isMultiple) {
      const previousFiles = get(data, key, []);
      set(ret, key, [...previousFiles, ...cleanedValue]);
    } else {
      unset(ret, key);
      set(ret, key, cleanedValue[0] || null);
    }
  });

  return ret;
};
