/**
 * Vitest Setup File for Roby Store
 * Provides environment polyfills, localStorage mock, window.open mock,
 * clipboard writeText mock, matchMedia mock, observer mocks, and DOM matchers.
 */
import '@testing-library/jest-dom';
import { vi, afterEach, beforeEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// 1. Mock LocalStorage
class LocalStorageMock {
  private store: Record<string, string> = {};

  clear() {
    this.store = {};
  }

  getItem(key: string): string | null {
    return this.store[key] ?? null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  get length(): number {
    return Object.keys(this.store).length;
  }

  key(index: number): string | null {
    return Object.keys(this.store)[index] ?? null;
  }
}

const mockLocalStorage = new LocalStorageMock();
Object.defineProperty(globalThis, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
    writable: true,
  });
}

// 2. Mock window.open
const mockWindowOpen = vi.fn();
if (typeof window !== 'undefined') {
  window.open = mockWindowOpen;
} else {
  Object.defineProperty(globalThis, 'window', {
    value: { open: mockWindowOpen },
    writable: true,
  });
}

// 3. Mock navigator.clipboard
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue(''),
};

if (typeof navigator !== 'undefined') {
  Object.defineProperty(navigator, 'clipboard', {
    value: mockClipboard,
    writable: true,
  });
} else {
  Object.defineProperty(globalThis, 'navigator', {
    value: { clipboard: mockClipboard },
    writable: true,
  });
}

// 4. Mock window.matchMedia & scrollTo
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
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

  Object.defineProperty(window, 'scrollTo', {
    writable: true,
    value: vi.fn(),
  });
}

// 5. Mock Observers
global.ResizeObserver = class ResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
};

global.IntersectionObserver = class IntersectionObserver {
  root = null;
  rootMargin = '';
  thresholds = [];
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  takeRecords = vi.fn().mockReturnValue([]);
} as unknown as typeof IntersectionObserver;

beforeEach(() => {
  mockLocalStorage.clear();
  mockWindowOpen.mockClear();
  mockClipboard.writeText.mockClear();
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

export { mockLocalStorage, mockWindowOpen, mockClipboard };
