import { forEach, has, includes } from 'lodash';

export default function sendUpdatedParams() {
  const prevSettings = this.props.home.initialData;
  const body = {};

  forEach(this.props.home.modifiedData, (value, key) => {
    if (value !== prevSettings[key] && key !== 'security.xframe.value.nested') {
      body[key] = value;
    }
  });

  if (has(this.props.home.modifiedData, 'security.xframe.value.nested') && this.props.home.modifiedData['security.xframe.value'] === 'ALLOW-FROM') {
    const value = includes(this.props.home.modifiedData['security.xframe.value.nested'], 'ALLOW-FROM') ?
    `ALLOW-FROM ${this.props.home.modifiedData['security.xframe.value.nested']}`
     : `ALLOW-FROM.ALLOW-FROM ${this.props.home.modifiedData['security.xframe.value.nested']}`;

    body['security.xframe.value'] = value;
  }
  return body;
}
