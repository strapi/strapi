'use strict';

class UnknownConnector extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'UnknownConnector';
  }
}
class InvalidConnector extends Error {
  constructor(msg) {
    super(msg);
    this.name = 'InvalidConnector';
  }
}

module.exports = {
  UnknownConnector,
  InvalidConnector,
};
