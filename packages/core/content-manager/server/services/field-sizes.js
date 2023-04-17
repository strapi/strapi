'use strict';

const needsFullSize = {
  default: 12,
  resizable: false,
};

const smallSize = {
  default: 4,
  resizable: true,
};

const defaultSize = {
  default: 6,
  resizable: true,
};

const fieldSizes = {
  // Full row and not resizable
  dynamiczone: needsFullSize,
  component: needsFullSize,
  json: needsFullSize,
  richtext: needsFullSize,
  // Small and resizable
  checkbox: smallSize,
  boolean: smallSize,
  date: smallSize,
  time: smallSize,
  biginteger: smallSize,
  decimal: smallSize,
  float: smallSize,
  integer: smallSize,
  number: smallSize,
  // Medium and resizable
  datetime: defaultSize,
  email: defaultSize,
  enumeration: defaultSize,
  media: defaultSize,
  password: defaultSize,
  relation: defaultSize,
  string: defaultSize,
  text: defaultSize,
  timestamp: defaultSize,
  uid: defaultSize,
};

module.exports = () => ({
  getAllFieldSizes() {
    return fieldSizes;
  },
  getFieldSize(type) {
    return fieldSizes[type];
  },
});
