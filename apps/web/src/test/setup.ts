import '@testing-library/jest-dom/vitest';

Object.defineProperty(navigator, 'clipboard', {
  value: { writeText: vi.fn().mockResolvedValue(undefined) },
  configurable: true,
  writable: true,
});
