'use strict';

module.exports = {
  attributes: {
    resetPasswordToken: {
      hidden: true,
    },
    confirmationToken: {
      hidden: true,
    },
  },
  metadatas: {
    provider: {
      edit: {
        label: 'provider',
        description: '',
        placeholder: '',
        visible: false,
        editable: false,
      },
      list: {
        label: 'provider',
        searchable: true,
        sortable: true,
      },
    },
  },
};
