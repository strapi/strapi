'use strict';

const _ = require('lodash/fp');

class Field {
  constructor(config) {
    this.config = config;
  }

  // TODO: impl
  validate() {
    // // use config validators directly
    // if (this.config.validators) {
    //   this.config.validators.forEach(validator => {
    //     validator(value)
    //   })
    // }
  }

  toDB(value) {
    return value;
  }

  fromDB(value) {
    return value;
  }
}

class StringField extends Field {
  toDB(value) {
    return _.toString(value);
  }
}

class JSONField extends Field {
  toDB(value) {
    return JSON.stringify(value);
  }
}

class BooleanField extends Field {
  toDB(value) {
    if (typeof value === 'boolean') return value;

    if (['true', 't', '1', 1].includes(value)) {
      return true;
    }

    if (['false', 'f', '0', 0].includes(value)) {
      return false;
    }
  }
}

const typeToFieldMap = {
  increments: Field,
  password: StringField,
  email: StringField,
  string: StringField,
  uid: StringField,
  richtext: StringField,
  text: StringField,
  json: JSONField,
  enumeration: StringField,
  integer: Field,
  biginteger: StringField,
  float: Field,
  decimal: Field,
  date: Field,
  time: Field,
  datetime: Field,
  timestamp: Field,
  boolean: BooleanField,
};

const createField = (type /*attribute*/) => {
  if (_.has(type, typeToFieldMap)) {
    return new typeToFieldMap[type]({});
  }

  throw new Error(`Undefined field for type ${type}`);
};

module.exports = {
  createField,
};

// class ArrayField {
//   fields: Field[] = [];

//   add(f: Field) {
//     this.fields.push(f);
//     return this;
//   }

//   remove(f: Field) {
//     this.fields.splice(this.fields.indexOf(f), 1);
//     return this;
//   }

//   wrapError(err, idx) {
//     return new Error(`Error on field ${idx + 1}: ${err.message}`);
//   }

//   validate() {
//     return this.fields?.flatMap((field, idx) =>
//       field.validate().map(error => this.wrapError(error, idx))
//     );
//   }
// }

// class GroupField {
//   fields: { [key: string]: Field } = {};

//   add(key: string, f: Field) {
//     this.fields[key] = f;
//     return this;
//   }

//   remove(key: string) {
//     delete this.fields[key];
//     return this;
//   }

//   wrapError(err: Error, key: string) {
//     return new Error(`Error on field ${key}: ${err.message}`);
//   }

//   validate() {
//     return Object.keys(this.fields).flatMap(key =>
//       this.fields[key].validate().map(error => this.wrapError(error, key))
//     );
//   }
// }
