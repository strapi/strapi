"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = __importDefault(require("path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const fs_1 = __importDefault(require("../fs"));
jest.mock('fs-extra', () => ({
    ensureFile: jest.fn(() => Promise.resolve()),
    writeFile: jest.fn(() => Promise.resolve()),
}));
describe('Strapi fs utils', () => {
    const strapi = {
        dirs: { dist: { root: '/tmp' }, app: { root: '/tmp' } },
    };
    test('Provides new functions', () => {
        const strapiFS = (0, fs_1.default)(strapi);
        expect(strapiFS.writeAppFile).toBeInstanceOf(Function);
        expect(strapiFS.writePluginFile).toBeInstanceOf(Function);
    });
    describe('Write App File', () => {
        test('Makes sure the path exists and writes', async () => {
            const strapiFS = (0, fs_1.default)(strapi);
            const content = '';
            await strapiFS.writeAppFile('test', content);
            expect(fs_extra_1.default.ensureFile).toHaveBeenCalledWith(path_1.default.join('/', 'tmp', 'test'));
            expect(fs_extra_1.default.writeFile).toHaveBeenCalledWith(path_1.default.join('/', 'tmp', 'test'), content);
        });
        test('Normalize the path to avoid relative access to folders in parent directories', async () => {
            const strapiFS = (0, fs_1.default)(strapi);
            const content = '';
            await strapiFS.writeAppFile('../../test', content);
            expect(fs_extra_1.default.ensureFile).toHaveBeenCalledWith(path_1.default.join('/', 'tmp', 'test'));
            expect(fs_extra_1.default.writeFile).toHaveBeenCalledWith(path_1.default.join('/', 'tmp', 'test'), content);
        });
        test('Works with array path', async () => {
            const strapiFS = (0, fs_1.default)(strapi);
            const content = '';
            await strapiFS.writeAppFile(['test', 'sub', 'path'], content);
            expect(fs_extra_1.default.ensureFile).toHaveBeenCalledWith(path_1.default.join('/', 'tmp', 'test', 'sub', 'path'));
            expect(fs_extra_1.default.writeFile).toHaveBeenCalledWith(path_1.default.join('/', 'tmp', 'test', 'sub', 'path'), content);
        });
    });
    describe('Write Plugin File', () => {
        test('Scopes the writes in the extensions folder', async () => {
            const strapiFS = (0, fs_1.default)(strapi);
            const content = '';
            strapiFS.writeAppFile = jest.fn(() => Promise.resolve());
            await strapiFS.writePluginFile('users-permissions', ['test', 'sub', 'path'], content);
            expect(strapiFS.writeAppFile).toHaveBeenCalledWith('extensions/users-permissions/test/sub/path', content);
        });
    });
});
//# sourceMappingURL=fs.test.js.map