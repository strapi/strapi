import { toLower } from 'lodash';

export default function getFlag(languageArray) {
  let flag;
  switch (languageArray.length) {
    case 2:
      flag = toLower(languageArray[1]);
      break;
    case 3:
      flag = toLower(languageArray[2]);
      break;
    default:
      flag = toLower(languageArray[0]);
  }
  return flag;
}
