"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dataTransfer = __importStar(require("@strapi/data-transfer"));
const commands_test_utils_1 = require("../../../__tests__/commands.test.utils");
const action_1 = __importDefault(require("../action"));
const { strapi: { providers: { DEFAULT_CONFLICT_STRATEGY }, }, engine: { DEFAULT_SCHEMA_STRATEGY, DEFAULT_VERSION_STRATEGY }, } = dataTransfer;
const createTransferEngine = jest.fn(() => {
    return {
        transfer: jest.fn(() => {
            return {
                engine: {},
            };
        }),
        progress: {
            on: jest.fn(),
            stream: {
                on: jest.fn(),
            },
        },
        sourceProvider: { name: 'testFileSource', type: 'source', getMetadata: jest.fn() },
        destinationProvider: {
            name: 'testStrapiDest',
            type: 'destination',
            getMetadata: jest.fn(),
        },
        diagnostics: {
            on: jest.fn().mockReturnThis(),
            onDiagnostic: jest.fn().mockReturnThis(),
        },
        onSchemaDiff: jest.fn(),
    };
});
describe('Import', () => {
    // mock command utils
    jest.mock('../../../utils/data-transfer.js', () => {
        return {
            ...jest.requireActual('../../../utils/data-transfer.js'),
            getTransferTelemetryPayload: jest.fn().mockReturnValue({}),
            loadersFactory: jest.fn().mockReturnValue({ updateLoader: jest.fn() }),
            formatDiagnostic: jest.fn(),
            createStrapiInstance: jest.fn().mockReturnValue({
                telemetry: {
                    send: jest.fn(),
                },
                destroy: jest.fn(),
            }),
            buildTransferTable: jest.fn(() => {
                return {
                    toString() {
                        return 'table';
                    },
                };
            }),
            exitMessageText: jest.fn(),
            getDiffHandler: jest.fn(),
            setSignalHandler: jest.fn(),
        };
    });
    // mock @strapi/data-transfer
    const mockDataTransfer = {
        file: {
            providers: {
                createLocalFileSourceProvider: jest
                    .fn()
                    .mockReturnValue({ name: 'testFileSource', type: 'source', getMetadata: jest.fn() }),
            },
        },
        strapi: {
            providers: {
                DEFAULT_CONFLICT_STRATEGY,
                createLocalStrapiDestinationProvider: jest
                    .fn()
                    .mockReturnValue({ name: 'testStrapiDest', type: 'destination', getMetadata: jest.fn() }),
            },
        },
        engine: {
            ...jest.requireActual('@strapi/data-transfer').engine,
            DEFAULT_SCHEMA_STRATEGY,
            DEFAULT_VERSION_STRATEGY,
            createTransferEngine,
        },
    };
    jest.mock('@strapi/data-transfer', () => mockDataTransfer);
    // console spies
    jest.spyOn(console, 'log').mockImplementation(() => { });
    jest.spyOn(console, 'warn').mockImplementation(() => { });
    jest.spyOn(console, 'info').mockImplementation(() => { });
    jest.spyOn(console, 'error').mockImplementation(() => { });
    // Now that everything is mocked, load the 'import' command
    beforeEach(() => {
        jest.clearAllMocks();
    });
    it('creates providers with correct options ', async () => {
        const options = {
            file: 'test.tar.gz.enc',
            decrypt: true,
            decompress: true,
            exclude: [],
            only: [],
        };
        await (0, commands_test_utils_1.expectExit)(0, async () => {
            await (0, action_1.default)(options);
        });
        // strapi options
        expect(mockDataTransfer.strapi.providers.createLocalStrapiDestinationProvider).toHaveBeenCalledWith(expect.objectContaining({ strategy: DEFAULT_CONFLICT_STRATEGY }));
        // file options
        expect(mockDataTransfer.file.providers.createLocalFileSourceProvider).toHaveBeenCalledWith(expect.objectContaining({
            file: { path: 'test.tar.gz.enc' },
            encryption: { enabled: options.decrypt },
            compression: { enabled: options.decompress },
        }));
        // engine options
        expect(mockDataTransfer.engine.createTransferEngine).toHaveBeenCalledWith(expect.objectContaining({ name: 'testFileSource' }), expect.objectContaining({ name: 'testStrapiDest' }), expect.objectContaining({
            schemaStrategy: DEFAULT_SCHEMA_STRATEGY,
            versionStrategy: DEFAULT_VERSION_STRATEGY,
        }));
    });
});
//# sourceMappingURL=import.test.js.map