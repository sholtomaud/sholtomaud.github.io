import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseFrontmatterMarkdown, parseParagraphs, parseAboutBio } from './markdown.ts';

describe('parseFrontmatterMarkdown', () => {
  test('parses frontmatter fields and blank-line-separated paragraphs', () => {
    const raw = [
      '---',
      'author: Claude',
      'date: 2026-07-22',
      'kind: ai',
      '---',
      'First paragraph.',
      '',
      'Second paragraph.',
    ].join('\n');

    assert.deepStrictEqual(parseFrontmatterMarkdown(raw), {
      author: 'Claude',
      date: '2026-07-22',
      kind: 'ai',
      paragraphs: ['First paragraph.', 'Second paragraph.'],
    });
  });

  test('accepts "human" as a kind', () => {
    const raw = ['---', 'author: A', 'date: 2026-01-01', 'kind: human', '---', 'Body.'].join(
      '\n'
    );
    assert.strictEqual(parseFrontmatterMarkdown(raw).kind, 'human');
  });

  test('collapses internal whitespace/line-wraps within a paragraph', () => {
    const raw = [
      '---',
      'author: A',
      'date: 2026-01-01',
      'kind: ai',
      '---',
      'Line one\nline two.',
    ].join('\n');

    assert.deepStrictEqual(parseFrontmatterMarkdown(raw).paragraphs, ['Line one line two.']);
  });

  test('ignores frontmatter lines with no colon', () => {
    const raw = [
      '---',
      'not-a-field',
      'author: A',
      'date: 2026-01-01',
      'kind: ai',
      '---',
      'Body.',
    ].join('\n');

    const result = parseFrontmatterMarkdown(raw);
    assert.strictEqual(result.author, 'A');
    assert.strictEqual(result.date, '2026-01-01');
  });

  test('throws when the frontmatter block is missing', () => {
    assert.throws(() => parseFrontmatterMarkdown('Just some text.'));
  });

  test('throws when required fields are missing', () => {
    const raw = ['---', 'author: Claude', '---', 'Body text.'].join('\n');
    assert.throws(() => parseFrontmatterMarkdown(raw));
  });

  test('throws when kind is not "ai" or "human"', () => {
    const raw = ['---', 'author: A', 'date: 2026-01-01', 'kind: robot', '---', 'Body.'].join(
      '\n'
    );
    assert.throws(() => parseFrontmatterMarkdown(raw));
  });
});

describe('parseParagraphs', () => {
  test('splits plain prose with no frontmatter into paragraphs', () => {
    const raw = 'First paragraph.\n\nSecond paragraph.';
    assert.deepStrictEqual(parseParagraphs(raw), ['First paragraph.', 'Second paragraph.']);
  });

  test('collapses internal whitespace/line-wraps within a paragraph', () => {
    assert.deepStrictEqual(parseParagraphs('Line one\nline two.'), ['Line one line two.']);
  });

  test('drops blank paragraphs from extra surrounding whitespace', () => {
    assert.deepStrictEqual(parseParagraphs('\n\nOnly paragraph.\n\n'), ['Only paragraph.']);
  });
});

describe('parseAboutBio', () => {
  test('strips frontmatter and surfaces author/date as metadata', () => {
    const raw = [
      '---',
      'author: Sholto Maud',
      'date: 2026-07-25',
      'kind: human',
      '---',
      'First paragraph.',
      '',
      'Second paragraph.',
    ].join('\n');
    assert.deepStrictEqual(parseAboutBio(raw), {
      author: 'Sholto Maud',
      date: '2026-07-25',
      paragraphs: ['First paragraph.', 'Second paragraph.'],
    });
  });

  test('the frontmatter never leaks into the paragraphs', () => {
    const bio = parseAboutBio('---\nauthor: X\ndate: 2026\nkind: human\n---\nProse only.');
    assert.deepStrictEqual(bio.paragraphs, ['Prose only.']);
    assert.ok(!bio.paragraphs.some((p) => p.includes('author:')));
  });

  test('treats a frontmatter-less file as plain prose with no byline', () => {
    const bio = parseAboutBio('Just prose.\n\nMore prose.');
    assert.strictEqual(bio.author, undefined);
    assert.strictEqual(bio.date, undefined);
    assert.deepStrictEqual(bio.paragraphs, ['Just prose.', 'More prose.']);
  });
});
