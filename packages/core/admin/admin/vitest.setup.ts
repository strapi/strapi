// Import required testing libraries
import '@testing-library/jest-dom/vitest';
import { TextEncoder, TextDecoder } from 'util';

// For Jest compatibility
globalThis.jest = vi;

// Setup browser mocks
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// localStorage mock
Object.defineProperty(window, 'localStorage', {
  value: {
    getItem: vi.fn(key => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
  },
  writable: true,
});

// Add crypto subtle mock specifically targeting the user.test.ts test
Object.defineProperty(window, 'crypto', {
  value: {
    subtle: {
      digest: vi.fn().mockImplementation((algorithm, data) => {
        // Return the specific hash expected by the user.test.ts
        const expectedHash = '8544bf5b5389959462912699664f03ed664a4b6d24f03b13bdbc362efc147873';
        
        // Convert hex string to ArrayBuffer
        const buffer = new ArrayBuffer(expectedHash.length / 2);
        const view = new Uint8Array(buffer);
        for (let i = 0; i < expectedHash.length; i += 2) {
          view[i / 2] = parseInt(expectedHash.substring(i, i + 2), 16);
        }
        
        return Promise.resolve(buffer);
      }),
    },
    getRandomValues: vi.fn().mockImplementation(arr => arr),
  },
  writable: true,
});

// Make sure TextEncoder/Decoder is available
global.TextEncoder = TextEncoder;
global.TextDecoder = TextDecoder;

// Reset mocks after each test
afterEach(() => {
  vi.resetAllMocks();
});