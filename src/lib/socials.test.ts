import { describe, expect, it } from 'vitest';
import { normalizeSocials } from './socials';

describe('normalizeSocials', () => {
  it('normalizes the new array shape, filtering out malformed entries', () => {
    const raw = [
      { type: 'github', value: 'https://github.com/rohit' },
      { type: 'linkedin', value: 'https://linkedin.com/in/rohit' },
      { type: 'missingValue' }, // malformed — no `value`
      { value: 'no-type' }, // malformed — no `type`
      null,
      'not-an-object',
      42,
    ];

    const result = normalizeSocials(raw);

    expect(result).toEqual([
      { type: 'github', value: 'https://github.com/rohit' },
      { type: 'linkedin', value: 'https://linkedin.com/in/rohit' },
    ]);
  });

  it('returns an empty array for an empty array input', () => {
    expect(normalizeSocials([])).toEqual([]);
  });

  it('normalizes the legacy object-map shape into an array of { type, value }', () => {
    const raw = {
      github: 'https://github.com/rohit',
      linkedin: 'https://linkedin.com/in/rohit',
    };

    const result = normalizeSocials(raw);

    expect(result).toEqual([
      { type: 'github', value: 'https://github.com/rohit' },
      { type: 'linkedin', value: 'https://linkedin.com/in/rohit' },
    ]);
  });

  it('drops non-string and empty-string values from the legacy object-map shape', () => {
    const raw = {
      github: 'https://github.com/rohit',
      twitter: '', // empty string — dropped
      linkedin: 123, // non-string — dropped
      website: null,
    };

    const result = normalizeSocials(raw);

    expect(result).toEqual([{ type: 'github', value: 'https://github.com/rohit' }]);
  });

  it('returns an empty array for null, undefined, and non-object primitives', () => {
    expect(normalizeSocials(null)).toEqual([]);
    expect(normalizeSocials(undefined)).toEqual([]);
    expect(normalizeSocials('a string')).toEqual([]);
    expect(normalizeSocials(42)).toEqual([]);
  });
});
