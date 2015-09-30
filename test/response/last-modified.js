'use strict';

const response = require('../helpers/context').response;

describe('res.lastModified', function () {
  it('should set the header as a UTCString', function () {
    const res = response();
    const date = new Date();
    res.lastModified = date;
    res.header['last-modified'].should.equal(date.toUTCString());
  });

  it('should work with date strings', function () {
    const res = response();
    const date = new Date();
    res.lastModified = date.toString();
    res.header['last-modified'].should.equal(date.toUTCString());
  });

  it('should get the header as a Date', function () {
    const res = response();
    const date = new Date();
    res.lastModified = date;
    (res.lastModified.getTime() / 1000)
    .should.equal(Math.floor(date.getTime() / 1000));
  });

  describe('when lastModified not set', function () {
    it('should get undefined', function () {
      const res = response();
      (res.lastModified === undefined).should.be.ok;
    });
  });
});
