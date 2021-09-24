'use strict';

const addressMetaData = {
  id: { edit: {}, list: { label: 'Id', searchable: true, sortable: true } },
  postal_coder: {
    edit: {
      label: 'Postal_coder',
      description: '',
      placeholder: '',
      visible: true,
      editable: true,
    },
    list: { label: 'Postal_coder', searchable: true, sortable: true },
  },
  categories: {
    list: {
      label: 'Categories',
      searchable: false,
      sortable: false,
      mainField: { name: 'name', schema: { type: 'string' } },
    },
    edit: {
      label: 'Categories',
      description: '',
      placeholder: '',
      visible: true,
      editable: true,
      mainField: { name: 'name', schema: { type: 'string' } },
    },
  },
  cover: {
    edit: { label: 'Cover', description: '', placeholder: '', visible: true, editable: true },
    list: { label: 'Cover', searchable: false, sortable: false },
  },
  images: {
    edit: { label: 'Images', description: '', placeholder: '', visible: true, editable: true },
    list: { label: 'Images', searchable: false, sortable: false },
  },
  city: {
    edit: { label: 'City', description: '', placeholder: '', visible: true, editable: true },
    list: { label: 'City', searchable: true, sortable: true },
  },
  likes: {
    list: {
      label: 'Likes',
      searchable: false,
      sortable: false,
      mainField: { name: 'id', schema: { type: 'integer' } },
    },
    edit: {
      label: 'Likes',
      description: '',
      placeholder: '',
      visible: true,
      editable: true,
      mainField: { name: 'id', schema: { type: 'integer' } },
    },
  },
  json: {
    edit: { label: 'Json', description: '', placeholder: '', visible: true, editable: true },
    list: { label: 'Json', searchable: false, sortable: false },
  },
  slug: {
    edit: { label: 'Slug', description: '', placeholder: '', visible: true, editable: true },
    list: { label: 'Slug', searchable: true, sortable: true },
  },
  notrepeat_req: {
    edit: {
      label: 'Notrepeat_req',
      description: '',
      placeholder: '',
      visible: true,
      editable: true,
    },
    list: { label: 'Notrepeat_req', searchable: false, sortable: false },
  },
  repeat_req: {
    edit: { label: 'Repeat_req', description: '', placeholder: '', visible: true, editable: true },
    list: { label: 'Repeat_req', searchable: false, sortable: false },
  },
  repeat_req_min: {
    edit: {
      label: 'Repeat_req_min',
      description: '',
      placeholder: '',
      visible: true,
      editable: true,
    },
    list: { label: 'Repeat_req_min', searchable: false, sortable: false },
  },
  createdAt: {
    edit: { label: 'Created_at', description: '', placeholder: '', visible: false, editable: true },
    list: { label: 'Created_at', searchable: true, sortable: true },
  },
  updatedAt: {
    edit: { label: 'Updated_at', description: '', placeholder: '', visible: false, editable: true },
    list: { label: 'Updated_at', searchable: true, sortable: true },
  },
};

module.exports = addressMetaData;
