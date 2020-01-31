import { get, isArray, isEmpty, isObject } from 'lodash';

/* eslint-disable indent */

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
          cleanedData = JSON.parse(value);
          break;
        case 'date':
          cleanedData =
            value && value._isAMomentObject === true
              ? value.toISOString()
              : value;
          break;
        case 'media':
          if (getOtherInfos(layout.schema, [current, 'multiple']) === true) {
            cleanedData = value
              ? helperCleanData(
                  value.filter(file => !(file instanceof File)),
                  'id'
                )
              : null;
          } else {
            cleanedData =
              get(value, 0) instanceof File ? null : get(value, 'id', null);
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
            cleanedData = value
              ? recursiveCleanData(value, groupLayouts[group])
              : value;
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

export const helperCleanData = (value, key) => {
  if (isArray(value)) {
    return value.map(obj => (obj[key] ? obj[key] : obj));
  }
  if (isObject(value)) {
    return value[key];
  }

  return value;
};

export const mapDataKeysToFilesToUpload = (filesMap, data) => {
  return Object.keys(filesMap).reduce((acc, current) => {
    const keys = current.split('.');
    const isMultiple = get(filesMap, [current, 'multiple'], false);
    const isGroup = get(filesMap, [current, 'isGroup'], false);
    const isRepeatable = get(filesMap, [current, 'repeatable'], false);

    const getFilesToUpload = path => {
      const value = get(data, path, []) || [];

      return value.filter(file => {
        return file instanceof File;
      });
    };
    const getFileToUpload = path => {
      const file = get(data, [...path, 0], '');

      if (file instanceof File) {
        return [file];
      }

      return [];
    };

    if (!isRepeatable) {
      const currentFilesToUpload = isMultiple
        ? getFilesToUpload(keys)
        : getFileToUpload([...keys]);

      if (!isEmpty(currentFilesToUpload)) {
        acc[current] = currentFilesToUpload;
      }
    }

    if (isGroup && isRepeatable) {
      const [key, targetKey] = current.split('.');
      const groupData = get(data, [key], []);
      const groupFiles = groupData.reduce((acc1, current, index) => {
        const files = isMultiple
          ? getFilesToUpload([key, index, targetKey])
          : getFileToUpload([key, index, targetKey]);

        if (!isEmpty(files)) {
          acc1[`${key}.${index}.${targetKey}`] = files;
        }

        return acc1;
      }, {});

      return { ...acc, ...groupFiles };
    }

    return acc;
  }, {});
};
