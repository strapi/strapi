'use strict';

module.exports = {
  collectionName: 'components_unique_all',
  displayName: 'compo_unique_all',
  singularName: 'compo_unique_all',
  category: 'article',
  attributes: {
    TextShort: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'string',
      unique: true,
    },
    TextLong: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'text',
      unique: true,
    },
    NumberInteger: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'integer',
      unique: true,
    },
    NumberBigInteger: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'biginteger',
      unique: true,
    },
    NumberDecimal: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'decimal',
      unique: true,
    },
    NumberFloat: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'float',
      unique: true,
    },
    Email: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'email',
      unique: true,
    },
    DateDate: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'date',
      unique: true,
    },
    DateDateTime: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'datetime',
      unique: true,
    },
    DateTime: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'time',
      unique: true,
    },
  },
};
