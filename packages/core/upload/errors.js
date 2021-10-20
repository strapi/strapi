'use strict';

const { ApplicationError } = require('@strapi/utils').errors;

class FileTooLargeError extends ApplicationError {
  constructor(message, details) {
    super(message, details);
    this.name = 'FileTooLargeError';
    this.message = message || 'The file is bigger than the limit size';
  }
}

class FileNotFoundError extends ApplicationError {
  constructor(message, details) {
    super(message, details);
    this.name = 'FileNotFoundError';
    this.message = message || 'File not found';
  }
}

module.exports = {
  FileTooLargeError,
  FileNotFoundError,
};
