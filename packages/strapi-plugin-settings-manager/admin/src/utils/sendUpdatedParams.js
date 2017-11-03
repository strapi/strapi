import { forEach, includes, replace, trimStart, split, unset } from 'lodash';

export default function sendUpdatedParams(isCreatingNewFields) {
  const prevSettings = this.props.home.initialData;
  const body = {};

  forEach(this.props.home.modifiedData, (value, key) => {
    if (value !== prevSettings[key] && key !== 'security.xframe.value.nested') {
      body[key] = value;
    }

    if (isCreatingNewFields && value && key !== 'security.xframe.value.nested') {
      body[key] = value;
    }

    else if (key === 'security.xframe.value.nested' && prevSettings['security.xframe.value.nested'] !== this.props.home.modifiedData['security.xframe.value.nested'] && this.props.home.modifiedData['security.xframe.value'] === 'ALLOW-FROM') {

      const xFrameValue = `ALLOW-FROM.ALLOW-FROM ${trimStart(replace(this.props.home.modifiedData['security.xframe.value.nested'], 'ALLOW-FROM', ''))}`;
      body['security.xframe.value'] = xFrameValue;
    }
  });

  const disabledSections = [];

  // Check all sections that depends on a toggle
  forEach(body, (bodyValue, target) => {
    if (includes(target, 'enabled') && !bodyValue) disabledSections.push(split(target, '.')[1]);
  });

  // Remove disabled values
  forEach(disabledSections, (sectionName) => {
    forEach(body, (v, bodyKey) => {
      if (!includes(bodyKey, 'enabled') && includes(bodyKey, sectionName)) {
        unset(body, bodyKey);
      }
    });
  });

  return body;
}
