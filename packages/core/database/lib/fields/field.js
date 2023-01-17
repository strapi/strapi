'use strict';

class Field {
  constructor(config) {
    this.config = config;
  }

  toDB(value) {
    return value;
  }

  fromDB(value) {
    return value;
  }
}

module.exports = Field;
