import { formatBytes } from '../utils';

describe('formatBytes', () => {
  it('formats 0 bytes', () => {
    expect(formatBytes(0)).toBe('0.0 GB');
  });

  it('formats positive bytes', () => {
    expect(formatBytes(1024 * 1024 * 1024)).toBe('1.0 GB');
  });

  it('formats large values', () => {
    expect(formatBytes(16 * 1024 * 1024 * 1024)).toBe('16.0 GB');
  });

  it('formats fractional values', () => {
    expect(formatBytes(Math.round(1.5 * 1024 * 1024 * 1024))).toBe('1.5 GB');
  });

  it('handles negative values', () => {
    expect(formatBytes(-1024 * 1024 * 1024)).toBe('-1.0 GB');
  });

  it('formats very large values (TB range)', () => {
    expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe('1024.0 GB');
  });
});
