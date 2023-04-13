'use strict';

const fullSize = {
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
  dynamiczone: fullSize,
  component: fullSize,
  json: fullSize,
  richtext: fullSize,
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
  // TODO
};

module.exports = () => ({
  getFieldSizes() {
    return fieldSizes;
  },
});
