import { toLower, size, forEach, upperCase, split } from 'lodash';

export default function getFlag(languageArray) {
  return toLower(languageArray[size(languageArray) -1]);
}

export function formatLanguageLocale(data) {
  const array = [];

  forEach(split(data, '_'), (value, key) => {
    if (key === 0){
      array.push(toLower(value));
    } else {
      array.push(upperCase(value));
    }
  });

  return array;
}
