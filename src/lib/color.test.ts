import { describe, expect, it } from 'vitest';
import { isSafeCssColor } from './color';

describe('isSafeCssColor', () => {
  it('accepts 3/4/6/8-digit hex colors', () => {
    expect(isSafeCssColor('#0af')).toBe(true);
    expect(isSafeCssColor('#0af8')).toBe(true);
    expect(isSafeCssColor('#00aaff')).toBe(true);
    expect(isSafeCssColor('#00aaff88')).toBe(true);
  });

  it('accepts rgb()/rgba() colors', () => {
    expect(isSafeCssColor('rgb(34, 211, 238)')).toBe(true);
    expect(isSafeCssColor('rgba(34, 211, 238, 0.5)')).toBe(true);
    expect(isSafeCssColor('rgba(34,211,238,1)')).toBe(true);
  });

  it('accepts hsl()/hsla() colors', () => {
    expect(isSafeCssColor('hsl(187, 85%, 53%)')).toBe(true);
    expect(isSafeCssColor('hsla(187, 85%, 53%, 0.5)')).toBe(true);
  });

  it('rejects CSS injection attempts and anything else', () => {
    expect(isSafeCssColor('')).toBe(false);
    expect(isSafeCssColor('red')).toBe(false);
    expect(isSafeCssColor('var(--evil)')).toBe(false);
    expect(isSafeCssColor('#fff; } body { display: none')).toBe(false);
    expect(isSafeCssColor('url(javascript:alert(1))')).toBe(false);
    expect(isSafeCssColor('#0af</style><script>alert(1)</script>')).toBe(false);
    expect(isSafeCssColor('expression(alert(1))')).toBe(false);
    expect(isSafeCssColor('#0af\nbody{color:red}')).toBe(false);
  });
});
