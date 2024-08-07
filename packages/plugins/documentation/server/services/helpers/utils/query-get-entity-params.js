'use strict';

const queryParams = require('./query-params');

const singleEntityGetParams = ['fields', 'populate']

module.exports = queryParams.filter(({ name }) => (
	singleEntityGetParams.includes(name) === true
));
