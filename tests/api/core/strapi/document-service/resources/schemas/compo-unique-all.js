'use strict';

module.exports = {
  collectionName: 'components_unique_all',
  displayName: 'compo_unique_all',
  singularName: 'compo_unique_all',
  category: 'article',
  attributes: {
    ComponentTextShort: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'string',
      unique: true,
    },
    ComponentTextLong: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'text',
      unique: true,
    },
    ComponentNumberInteger: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'integer',
      unique: true,
    },
    ComponentNumberBigInteger: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'biginteger',
      unique: true,
    },
    ComponentNumberDecimal: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'decimal',
      unique: true,
    },
    ComponentNumberFloat: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'float',
      unique: true,
    },
    ComponentEmail: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'email',
      unique: true,
    },
    ComponentDateDate: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'date',
      unique: true,
    },
    ComponentDateDateTime: {
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
      type: 'datetime',
      unique: true,
    },
    ComponentDateTime: {
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
