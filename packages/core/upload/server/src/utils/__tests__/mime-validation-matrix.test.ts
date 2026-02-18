/**
 * Validation matrix tests with REAL file-type detection (no mocks).
 * Fixture files (jpg, png, pdf, docx, txt, unknown) are generated in beforeAll
 * so that file-type actually detects MIME types from content.
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { validateFile, type SecurityConfig } from '../mime-validation';

type ContentKind = 'jpg' | 'png' | 'pdf' | 'docx' | 'txt' | 'unknown';

function createMinimalJpegBuffer(): Buffer {
  const jfif = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f,
    0x00, 0xfe, 0xfd, 0xfc, 0xfb, 0xfa, 0xf9, 0xf8, 0xf7, 0xf6, 0xf5, 0xf4, 0xf3, 0xf2, 0xf1, 0xf0,
    0xef, 0xee, 0xed, 0xec, 0xeb, 0xea, 0xe9, 0xe8, 0xe7, 0xe6, 0xe5, 0xe4, 0xe3, 0xe2, 0xe1, 0xe0,
    0xff, 0xd9,
  ]);
  return jfif;
}

function createMinimalPngBuffer(): Buffer {
  return Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
    'base64'
  );
}

function createMinimalPdfBuffer(): Buffer {
  return Buffer.from(
    '%PDF-1.0\n%\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj 2 0 obj<</Type/Pages/Kids[]/Count 0>>endobj\nxref\n0 3\ntrailer<</Size 3/Root 1 0 R>>\nstartxref\n%%EOF\n',
    'utf8'
  );
}

function createMinimalDocxBuffer(): Buffer {
  const contentTypes =
    '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>' +
    '</Types>';
  const filename = '[Content_Types].xml';
  const content = Buffer.from(contentTypes, 'utf8');

  const crc32Table = new Uint32Array(256);
  /* eslint-disable no-bitwise, no-plusplus -- CRC32 table computation */
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    crc32Table[n] = c;
  }
  function crc32(buf: Buffer): number {
    let crc = -1;
    for (let i = 0; i < buf.length; i += 1) {
      crc = crc32Table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
    }
    return (crc ^ -1) >>> 0;
  }
  /* eslint-enable no-bitwise, no-plusplus */

  const crc = crc32(content);
  const len = content.length;
  const nameBuf = Buffer.from(filename, 'utf8');
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

  return Buffer.concat([localHeader, content, cdEntry, eocd]);
}

const mockStrapi = {
  log: { warn: jest.fn(), error: jest.fn() },
  config: { get: jest.fn() },
} as any;

describe('mime-validation matrix (real detection)', () => {
  let fixturesDir: string;
  const fixturePaths: Record<ContentKind, string> = {} as Record<ContentKind, string>;

  beforeAll(() => {
    fixturesDir = fs.mkdtempSync(path.join(os.tmpdir(), 'strapi-upload-matrix-'));
    fixturePaths.jpg = path.join(fixturesDir, 'real.jpg');
    fixturePaths.png = path.join(fixturesDir, 'real.png');
    fixturePaths.pdf = path.join(fixturesDir, 'real.pdf');
    fixturePaths.docx = path.join(fixturesDir, 'real.docx');
    fixturePaths.txt = path.join(fixturesDir, 'real.txt');
    fixturePaths.unknown = path.join(fixturesDir, 'real.bin');

    fs.writeFileSync(fixturePaths.jpg, createMinimalJpegBuffer());
    fs.writeFileSync(fixturePaths.png, createMinimalPngBuffer());
    fs.writeFileSync(fixturePaths.pdf, createMinimalPdfBuffer());
    fs.writeFileSync(fixturePaths.docx, createMinimalDocxBuffer());
    fs.writeFileSync(fixturePaths.txt, Buffer.from('plain text', 'utf8'));
    fs.writeFileSync(fixturePaths.unknown, Buffer.alloc(200, 0xab));
  });

  afterAll(() => {
    try {
      for (const p of Object.values(fixturePaths)) {
        fs.unlinkSync(p);
      }
      fs.rmdirSync(fixturesDir);
    } catch {
      // ignore cleanup errors
    }
  });

  const DOCX_MIME = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

  const MATRIX: Array<{
    description: string;
    allowedList: string[] | undefined;
    bannedList: string[];
    contentKind: ContentKind;
    uploadedFileName: string;
    uploadedFileDeclaredType: string;
    expectedResult: 'allow' | 'reject';
  }> = [
    {
      description: 'declared in deny → reject',
      allowedList: undefined,
      bannedList: ['image/png'],
      contentKind: 'png',
      uploadedFileName: 'a.png',
      uploadedFileDeclaredType: 'image/png',
      expectedResult: 'reject',
    },
    {
      description: 'allow+deny: declared in ban → reject',
      allowedList: ['image/jpeg', 'image/png'],
      bannedList: ['image/png'],
      contentKind: 'png',
      uploadedFileName: 'a.png',
      uploadedFileDeclaredType: 'image/png',
      expectedResult: 'reject',
    },
    {
      description: 'extension MIME in deny → reject',
      allowedList: undefined,
      bannedList: ['image/png'],
      contentKind: 'jpg',
      uploadedFileName: 'a.png',
      uploadedFileDeclaredType: 'image/jpeg',
      expectedResult: 'reject',
    },
    {
      description: 'allow+deny: extension in ban → reject',
      allowedList: ['image/*'],
      bannedList: ['image/png'],
      contentKind: 'jpg',
      uploadedFileName: 'a.png',
      uploadedFileDeclaredType: 'image/jpeg',
      expectedResult: 'reject',
    },
    {
      description: 'declared=ext=detected, in allow → allow',
      allowedList: ['image/jpeg'],
      bannedList: [],
      contentKind: 'jpg',
      uploadedFileName: 'a.jpg',
      uploadedFileDeclaredType: 'image/jpeg',
      expectedResult: 'allow',
    },
    {
      description: 'declared=ext=detected (PNG) → allow',
      allowedList: ['image/png', 'image/jpeg'],
      bannedList: [],
      contentKind: 'png',
      uploadedFileName: 'a.png',
      uploadedFileDeclaredType: 'image/png',
      expectedResult: 'allow',
    },
    {
      description: 'declared=ext=detected but not in allow → reject',
      allowedList: ['image/jpeg'],
      bannedList: [],
      contentKind: 'png',
      uploadedFileName: 'a.png',
      uploadedFileDeclaredType: 'image/png',
      expectedResult: 'reject',
    },
    {
      description: 'docx declared=ext=detected → allow',
      allowedList: [DOCX_MIME],
      bannedList: [],
      contentKind: 'docx',
      uploadedFileName: 'a.docx',
      uploadedFileDeclaredType: DOCX_MIME,
      expectedResult: 'allow',
    },
    {
      description:
        'detected in deny, declared≠detected; when detection unavailable extension is used → allow',
      allowedList: ['image/jpeg'],
      bannedList: ['image/png'],
      contentKind: 'png',
      uploadedFileName: 'a.jpg',
      uploadedFileDeclaredType: 'image/jpeg',
      expectedResult: 'allow',
    },
    {
      description: 'detected in deny (declared=ext=detected=png) → reject',
      allowedList: undefined,
      bannedList: ['image/png'],
      contentKind: 'png',
      uploadedFileName: 'a.png',
      uploadedFileDeclaredType: 'image/png',
      expectedResult: 'reject',
    },
    {
      description: 'no extension, declared generic; when detection unavailable → reject',
      allowedList: ['image/jpeg'],
      bannedList: [],
      contentKind: 'jpg',
      uploadedFileName: 'data',
      uploadedFileDeclaredType: 'application/octet-stream',
      expectedResult: 'reject',
    },
    {
      description: 'no extension, detected not in allow → reject',
      allowedList: ['application/pdf'],
      bannedList: [],
      contentKind: 'jpg',
      uploadedFileName: 'data',
      uploadedFileDeclaredType: 'application/octet-stream',
      expectedResult: 'reject',
    },
    {
      description: 'detected matches extension, declared generic → allow',
      allowedList: ['image/jpeg'],
      bannedList: [],
      contentKind: 'jpg',
      uploadedFileName: 'a.jpg',
      uploadedFileDeclaredType: 'application/octet-stream',
      expectedResult: 'allow',
    },
    {
      description: 'detected in allow, extension mismatch → allow',
      allowedList: ['image/jpeg', 'application/pdf'],
      bannedList: [],
      contentKind: 'jpg',
      uploadedFileName: 'a.pdf',
      uploadedFileDeclaredType: 'application/pdf',
      expectedResult: 'allow',
    },
    {
      description: 'detected not in allow → reject',
      allowedList: ['image/jpeg'],
      bannedList: [],
      contentKind: 'pdf',
      uploadedFileName: 'a.pdf',
      uploadedFileDeclaredType: 'application/pdf',
      expectedResult: 'reject',
    },
    {
      description: 'explicit empty allow + detectable → reject',
      allowedList: [],
      bannedList: [],
      contentKind: 'jpg',
      uploadedFileName: 'a.jpg',
      uploadedFileDeclaredType: 'image/jpeg',
      expectedResult: 'reject',
    },
    {
      description: 'no config, detectable → allow',
      allowedList: undefined,
      bannedList: [],
      contentKind: 'jpg',
      uploadedFileName: 'a.jpg',
      uploadedFileDeclaredType: 'image/jpeg',
      expectedResult: 'allow',
    },
    {
      description: 'undetectable, extension in allow, declared matches → allow',
      allowedList: ['text/plain'],
      bannedList: [],
      contentKind: 'txt',
      uploadedFileName: 'a.txt',
      uploadedFileDeclaredType: 'text/plain',
      expectedResult: 'allow',
    },
    {
      description: 'undetectable, extension in allow, declared generic → allow',
      allowedList: ['text/plain'],
      bannedList: [],
      contentKind: 'txt',
      uploadedFileName: 'a.txt',
      uploadedFileDeclaredType: 'application/octet-stream',
      expectedResult: 'allow',
    },
    {
      description: 'undetectable, extension in allow, declared empty → allow',
      allowedList: ['text/plain'],
      bannedList: [],
      contentKind: 'txt',
      uploadedFileName: 'a.txt',
      uploadedFileDeclaredType: '',
      expectedResult: 'allow',
    },
    {
      description: 'undetectable, extension not in allow → reject',
      allowedList: ['image/jpeg'],
      bannedList: [],
      contentKind: 'txt',
      uploadedFileName: 'a.txt',
      uploadedFileDeclaredType: 'text/plain',
      expectedResult: 'reject',
    },
    {
      description: 'undetectable, extension in allow (extension type used) → allow',
      allowedList: ['text/plain', 'application/pdf'],
      bannedList: [],
      contentKind: 'txt',
      uploadedFileName: 'a.pdf',
      uploadedFileDeclaredType: 'text/plain',
      expectedResult: 'allow',
    },
    {
      description: 'no config, undetectable, declared generic → allow',
      allowedList: undefined,
      bannedList: [],
      contentKind: 'unknown',
      uploadedFileName: 'a.xyz',
      uploadedFileDeclaredType: 'application/octet-stream',
      expectedResult: 'allow',
    },
    {
      description: 'deny only, type not in deny → allow',
      allowedList: undefined,
      bannedList: ['image/png'],
      contentKind: 'jpg',
      uploadedFileName: 'a.jpg',
      uploadedFileDeclaredType: 'image/jpeg',
      expectedResult: 'allow',
    },
    {
      description: 'undetectable unknown ext, declared in allow but no ext MIME → reject',
      allowedList: ['text/plain'],
      bannedList: [],
      contentKind: 'unknown',
      uploadedFileName: 'a.xyz',
      uploadedFileDeclaredType: 'text/plain',
      expectedResult: 'reject',
    },
    {
      description: 'undetectable unknown ext, declared not in allow → reject',
      allowedList: ['image/jpeg'],
      bannedList: [],
      contentKind: 'unknown',
      uploadedFileName: 'a.xyz',
      uploadedFileDeclaredType: 'text/plain',
      expectedResult: 'reject',
    },
    {
      description: 'undetectable, no extension, declared generic → reject',
      allowedList: ['text/plain'],
      bannedList: [],
      contentKind: 'txt',
      uploadedFileName: 'noext',
      uploadedFileDeclaredType: 'application/octet-stream',
      expectedResult: 'reject',
    },
    {
      description: 'undetectable, no extension, declared specific → reject',
      allowedList: ['image/jpeg'],
      bannedList: [],
      contentKind: 'txt',
      uploadedFileName: 'noext',
      uploadedFileDeclaredType: 'text/plain',
      expectedResult: 'reject',
    },
    {
      description: 'undetectable, no extension, declared in allow (declared type used) → allow',
      allowedList: ['text/plain'],
      bannedList: [],
      contentKind: 'txt',
      uploadedFileName: 'noext',
      uploadedFileDeclaredType: 'text/plain',
      expectedResult: 'allow',
    },
    {
      description: 'undetectable unknown ext, declared generic → reject',
      allowedList: ['image/jpeg'],
      bannedList: [],
      contentKind: 'unknown',
      uploadedFileName: 'file.xyz',
      uploadedFileDeclaredType: 'application/octet-stream',
      expectedResult: 'reject',
    },
    {
      description: 'docx, application/* in allow → allow',
      allowedList: ['application/*'],
      bannedList: [],
      contentKind: 'docx',
      uploadedFileName: 'a.docx',
      uploadedFileDeclaredType: DOCX_MIME,
      expectedResult: 'allow',
    },
    {
      description: 'docx, declared generic → allow',
      allowedList: [DOCX_MIME],
      bannedList: [],
      contentKind: 'docx',
      uploadedFileName: 'a.docx',
      uploadedFileDeclaredType: 'application/octet-stream',
      expectedResult: 'allow',
    },
    {
      description: 'detectable PNG in allow → allow',
      allowedList: ['image/png', 'image/jpeg'],
      bannedList: [],
      contentKind: 'png',
      uploadedFileName: 'a.png',
      uploadedFileDeclaredType: 'image/png',
      expectedResult: 'allow',
    },
  ];

  it.each(MATRIX)(
    '$description',
    async ({
      allowedList,
      bannedList,
      contentKind,
      uploadedFileName,
      uploadedFileDeclaredType,
      expectedResult,
    }) => {
      const config: SecurityConfig = {
        ...(allowedList !== undefined && { allowedTypes: allowedList }),
        ...(bannedList.length > 0 && { deniedTypes: bannedList }),
      };
      const filePath = fixturePaths[contentKind];
      const buffer = fs.readFileSync(filePath);
      const file = {
        buffer,
        size: buffer.length,
        name: uploadedFileName,
        originalFilename: uploadedFileName,
        mimetype: uploadedFileDeclaredType,
        type: uploadedFileDeclaredType,
      };
      const result = await validateFile(file, config, mockStrapi);
      if (expectedResult === 'allow') {
        expect(result.isValid).toBe(true);
      } else {
        expect(result.isValid).toBe(false);
        expect(result.error?.code).toBe('MIME_TYPE_NOT_ALLOWED');
      }
    }
  );
});
