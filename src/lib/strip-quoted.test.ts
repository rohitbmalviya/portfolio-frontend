import { describe, expect, it } from 'vitest';
import { splitQuoted } from './strip-quoted';

describe('splitQuoted', () => {
  it('returns the whole trimmed body as visible when no quote marker is present', () => {
    const body = '  Hello there,\nJust checking in.  ';

    const result = splitQuoted(body);

    expect(result).toEqual({ visible: 'Hello there,\nJust checking in.', quoted: '' });
  });

  it('splits on a single-line "On ... wrote:" attribution header', () => {
    const body = [
      'Sounds good, thanks!',
      '',
      'On Sun, 28 Jun 2026, 1:00 pm Foo <foo@example.com> wrote:',
      '> Original message text',
    ].join('\n');

    const result = splitQuoted(body);

    expect(result.visible).toBe('Sounds good, thanks!');
    expect(result.quoted).toContain('On Sun, 28 Jun 2026, 1:00 pm Foo <foo@example.com> wrote:');
    expect(result.quoted).toContain('> Original message text');
  });

  it('splits on a two-line wrapped "On ..." / "wrote:" attribution header', () => {
    const body = [
      'Reply text here.',
      'On Sun, 28 Jun 2026 at 13:00, Foo <foo@example.com>',
      'wrote:',
      '> quoted content',
    ].join('\n');

    const result = splitQuoted(body);

    expect(result.visible).toBe('Reply text here.');
    expect(result.quoted.startsWith('On Sun, 28 Jun 2026 at 13:00, Foo <foo@example.com>')).toBe(
      true,
    );
  });

  it('splits on a chevron-quoted block', () => {
    const body = ['New reply content.', '> This is quoted', '> more quoted text'].join('\n');

    const result = splitQuoted(body);

    expect(result).toEqual({
      visible: 'New reply content.',
      quoted: '> This is quoted\n> more quoted text',
    });
  });

  it('splits on a "-----Original Message-----" separator', () => {
    const body = [
      'My reply.',
      '-----Original Message-----',
      'From: someone@example.com',
      'Subject: Hi',
    ].join('\n');

    const result = splitQuoted(body);

    expect(result.visible).toBe('My reply.');
    expect(result.quoted.startsWith('-----Original Message-----')).toBe(true);
  });

  it('splits on a long-underscore separator line', () => {
    const body = [
      'My reply.',
      '________________________________',
      'From: someone@example.com',
    ].join('\n');

    const result = splitQuoted(body);

    expect(result.visible).toBe('My reply.');
    expect(result.quoted.startsWith('________________________________')).toBe(true);
  });

  it('normalizes Windows (\\r\\n) line endings before splitting', () => {
    const body = 'My reply.\r\n> quoted line\r\n> more';

    const result = splitQuoted(body);

    expect(result.visible).toBe('My reply.');
    expect(result.quoted).toBe('> quoted line\n> more');
  });

  it('falls back to showing the whole body when it is entirely a quote (guards against a blank bubble)', () => {
    const body = '> This whole message is quoted\n> with nothing else';

    const result = splitQuoted(body);

    expect(result.visible).toBe(body);
    expect(result.quoted).toBe('');
  });
});
