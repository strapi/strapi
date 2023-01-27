'use strict';

module.exports = {
  passport: require('./passport'),
  role: require('./role'),
  workflows: require('./review-workflows/workflows'),
  stages: require('./review-workflows/stages'),
  'review-workflows': require('./review-workflows/review-workflows'),
};
