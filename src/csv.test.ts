import { describe, expect, it } from 'vitest';
import { parseCsv, parseCsvObjects, toCsv } from './csv';

describe('csv', () => {
  it('parses quotes, commas, escaped quotes, newlines in cells, CRLF and BOM', () => {
    const text = '﻿a,b,c\r\n1,"x, y","say ""hi"""\r\n2,"line1\nline2",\r\n';
    expect(parseCsv(text)).toEqual([['a', 'b', 'c'], ['1', 'x, y', 'say "hi"'], ['2', 'line1\nline2', '']]);
  });
  it('round-trips awkward values including Chinese', () => {
    const rows = [['id', 'text'], ['1', ' padded '], ['2', 'a,"b"\nc'], ['3', '香港，你好']];
    expect(parseCsv(toCsv(rows))).toEqual(rows);
  });
  it('parseCsvObjects maps headers and rejects ragged rows', () => {
    expect(parseCsvObjects('a,b\n1,2\n')).toEqual([{ a: '1', b: '2' }]);
    expect(() => parseCsvObjects('a,b\n1,2,3\n')).toThrow(/columns/);
  });
  it('throws on unterminated quotes and ignores blank lines', () => {
    expect(() => parseCsv('a,"b')).toThrow(/unterminated/);
    expect(parseCsv('a\n\n\nb\n')).toEqual([['a'], ['b']]);
  });
});
