import { forEach, includes } from 'lodash';

export default function sendUpdatedParams() {
  const prevSettings = this.props.home.initialData;
  const body = {};

  forEach(this.props.home.modifiedData, (value, key) => {
    if (value !== prevSettings[key] && key !== 'security.xframe.value.nested') {
      body[key] = value;
    }
    else if (key === 'security.xframe.value.nested' && prevSettings['security.xframe.value.nested'] !== this.props.home.modifiedData['security.xframe.value.nested'] && this.props.home.modifiedData['security.xframe.value'] === 'ALLOW-FROM') {
      const xFrameValue = includes(this.props.home.modifiedData['security.xframe.value.nested'], 'ALLOW-FROM') ?
      `ALLOW-FROM ${this.props.home.modifiedData['security.xframe.value.nested']}`
       : `ALLOW-FROM.ALLOW-FROM ${this.props.home.modifiedData['security.xframe.value.nested']}`;

      body['security.xframe.value'] = xFrameValue;
    }
  });

  return body;
}
