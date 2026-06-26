'use strict';

/**
 * Generates tests/api/core/upload/utils/rec.docx
 * Minimal valid .docx (ZIP with [Content_Types].xml) so file-type detects it as docx.
 * Run from repo root: node tests/api/core/upload/scripts/generate-rec-docx.js
 */

const fs = require('fs');
const path = require('path');

function crc32(buf) {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ -1) >>> 0;
}

const contentTypes =
  '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
  '<Default Extension="xml" ContentType="application/xml"/>' +
  '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
  '</Types>';
const content = Buffer.from(contentTypes, 'utf8');
const crc = crc32(content);
const len = content.length;
const nameBuf = Buffer.from('[Content_Types].xml', 'utf8');

const localHeader = Buffer.alloc(30 + nameBuf.length);
localHeader.writeUInt32LE(0x04034b50, 0);
localHeader.writeUInt16LE(10, 4);
localHeader.writeUInt16LE(0, 6);
localHeader.writeUInt16LE(0, 8);
localHeader.writeUInt16LE(0, 10);
localHeader.writeUInt16LE(0, 12);
localHeader.writeUInt32LE(crc, 14);
localHeader.writeUInt32LE(len, 18);
localHeader.writeUInt32LE(len, 22);
localHeader.writeUInt16LE(nameBuf.length, 26);
localHeader.writeUInt16LE(0, 28);
nameBuf.copy(localHeader, 30);

const cdEntry = Buffer.alloc(46 + nameBuf.length);
cdEntry.writeUInt32LE(0x02014b50, 0);
cdEntry.writeUInt16LE(20, 4);
cdEntry.writeUInt16LE(10, 6);
cdEntry.writeUInt16LE(0, 8);
cdEntry.writeUInt16LE(0, 10);
cdEntry.writeUInt32LE(crc, 16);
cdEntry.writeUInt32LE(len, 20);
cdEntry.writeUInt32LE(len, 24);
cdEntry.writeUInt16LE(nameBuf.length, 28);
cdEntry.writeUInt16LE(0, 30);
cdEntry.writeUInt16LE(0, 32);
cdEntry.writeUInt16LE(0, 34);
cdEntry.writeUInt32LE(0, 36);
cdEntry.writeUInt32LE(30 + nameBuf.length + len, 42);
nameBuf.copy(cdEntry, 46);

const eocd = Buffer.alloc(22);
eocd.writeUInt32LE(0x06054b50, 0);
eocd.writeUInt16LE(0, 4);
eocd.writeUInt16LE(0, 6);
eocd.writeUInt16LE(1, 8);
eocd.writeUInt16LE(1, 10);
eocd.writeUInt32LE(cdEntry.length, 12);
eocd.writeUInt32LE(30 + nameBuf.length + len, 16);
eocd.writeUInt16LE(0, 20);

const outPath = path.join(__dirname, '../utils/rec.docx');
fs.writeFileSync(outPath, Buffer.concat([localHeader, content, cdEntry, eocd]));
console.log('Wrote', outPath);
