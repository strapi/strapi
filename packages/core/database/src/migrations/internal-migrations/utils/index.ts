// TODO: probably don't need this file at all, but easier to keep this here for dev

import { Metadata } from '../../../metadata';

export function diffMaps(map1: Metadata, map2: Metadata, path: string = '') {
  let diffs: Record<string, any> = {};

  for (const [key, value1] of map1) {
    if (!map2.has(key)) {
      diffs[fullPath(path, key)] = { map1: value1, map2: undefined };
    } else {
      const value2 = map2.get(key);
      const subDiffs = diffObjects(value1, value2, fullPath(path, key));
      if (Object.keys(subDiffs).length > 0) {
        diffs = { ...diffs, ...subDiffs };
      }
    }
  }

  for (const key of map2.keys()) {
    if (!map1.has(key)) {
      diffs[fullPath(path, key)] = { map1: undefined, map2: map2.get(key) };
    }
  }

  return diffs;
}

export function diffObjects2(obj1: any, obj2: any, path = '') {
  let diffs: Record<string, any> = {};

  for (const key in obj1) {
    if (!(key in obj2)) {
      diffs[fullPath(path, key)] = { original: obj1[key], compared: undefined };
    } else if (
      typeof obj1[key] === 'object' &&
      obj1[key] !== null &&
      typeof obj2[key] === 'object' &&
      obj2[key] !== null
    ) {
      const subDiffs = diffObjects(obj1[key], obj2[key], fullPath(path, key));
      diffs = { ...diffs, ...subDiffs };
    } else if (obj1[key] !== obj2[key]) {
      diffs[fullPath(path, key)] = { original: obj1[key], compared: obj2[key] };
    }
  }

  for (const key in obj2) {
    if (!(key in obj1)) {
      diffs[fullPath(path, key)] = { original: undefined, compared: obj2[key] };
    }
  }

  return diffs;
}

export function diffObjects3(obj1: any, obj2: any, path = '') {
  const diffs: Record<string, any> = {};

  for (const key in obj1) {
    if (!(key in obj2)) {
      diffs[key] = { original: obj1[key], compared: undefined };
    } else if (
      typeof obj1[key] === 'object' &&
      obj1[key] !== null &&
      typeof obj2[key] === 'object' &&
      obj2[key] !== null
    ) {
      const subDiffs = diffObjects2(obj1[key], obj2[key], fullPath(path, key));
      if (Object.keys(subDiffs).length > 0) {
        diffs[key] = subDiffs;
      }
    } else if (obj1[key] !== obj2[key]) {
      diffs[key] = { original: obj1[key], compared: obj2[key] };
    }
  }

  for (const key in obj2) {
    if (!(key in obj1)) {
      diffs[key] = { original: undefined, compared: obj2[key] };
    }
  }

  return diffs;
}

const fullPath = (path: string, key: string) => {
  return path ? `${path}.${key}` : key;
};

export function diffObjects(obj1: any, obj2: any, path: string = '') {
  let diffs: Record<string, any> = {};

  for (const key in obj1) {
    if (!(key in obj2)) {
      diffs[fullPath(path, key)] = { obj1: obj1[key], obj2: undefined };
    } else if (
      typeof obj1[key] === 'object' &&
      obj1[key] !== null &&
      typeof obj2[key] === 'object' &&
      obj2[key] !== null
    ) {
      const subDiffs = diffObjects(obj1[key], obj2[key], fullPath(path, key));
      if (Object.keys(subDiffs).length > 0) {
        diffs = { ...diffs, ...subDiffs };
      }
    } else if (JSON.stringify(obj1[key]) !== JSON.stringify(obj2[key])) {
      diffs[fullPath(path, key)] = { obj1: obj1[key], obj2: obj2[key] };
    }
  }

  for (const key in obj2) {
    if (!(key in obj1)) {
      diffs[fullPath(path, key)] = { obj1: undefined, obj2: obj2[key] };
    }
  }

  return diffs;
}

export const map2arr = (map: Map<string, unknown>, keyStartsWith?: string) => {
  return keyStartsWith
    ? Array.from(map.entries()).filter(([key]) => key.startsWith(keyStartsWith))
    : Array.from(map.entries());
};

export const map2str = (map: Map<string, unknown>, keyStartsWith?: string) => {
  return JSON.stringify(map2arr(map, keyStartsWith), null, 2);
};

// function diffStrings(str1: string, str2: string) {
//   const lines1 = str1.split('\n');
//   const lines2 = str2.split('\n');

//   const maxLength = Math.max(lines1.length, lines2.length);

//   let returnval = '';
//   for (let i = 0; i < maxLength; i += 1) {
//     if (lines1[i] !== lines2[i]) {
//       returnval += `Line ${i + 1}: ${lines1[i]} (str1) vs ${lines2[i]} (str2)`;
//     }
//   }
//   return returnval;
// }

// function diffObjects(path: string, obj1: any, obj2: any) {
//   if (obj1 == null || obj2 == null) {
//     console.log(`Path ${path}: ${JSON.stringify(obj1)} (obj1) vs ${JSON.stringify(obj2)} (obj2)`);
//     return;
//   }

//   const allKeys = new Set([...Object.keys(obj1), ...Object.keys(obj2)]);
//   allKeys.forEach((key) => {
//     const value1 = obj1[key];
//     const value2 = obj2[key];
//     if (typeof value1 === 'object' && typeof value2 === 'object') {
//       if (!isEqual(value1, value2)) {
//         diffObjects(`${path}.${key}`, value1, value2);
//       }
//     } else if (value1 !== value2) {
//       console.log(
//         `Path ${path}.${key}: ${JSON.stringify(value1)} (obj1) vs ${JSON.stringify(value2)} (obj2)`
//       );
//     }
//   });
// }
