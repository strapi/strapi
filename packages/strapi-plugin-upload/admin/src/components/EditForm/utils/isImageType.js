import { get } from 'lodash';

const isImageType = file => get(file, 'type', '').includes('image');

export default isImageType;
