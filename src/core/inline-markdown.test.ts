import { test, describe } from 'node:test';
import assert from 'node:assert';
import { escapeHtml, renderInlineMarkdown } from './inline-markdown.ts';

describe('escapeHtml', () => {
  test('escapes &, <, >, and "', () => {
    assert.strictEqual(
      escapeHtml('a & b < c > d "e"'),
      'a &amp; b &lt; c &gt; d &quot;e&quot;'
    );
  });
});

describe('renderInlineMarkdown', () => {
  test('converts [text](https url) into an external link', () => {
    assert.strictEqual(
      renderInlineMarkdown('See [the paper](https://doi.org/10.1/x) now.'),
      'See <a href="https://doi.org/10.1/x" target="_blank" rel="noopener noreferrer">the paper</a> now.'
    );
  });

  test('escapes surrounding text and the link text', () => {
    assert.strictEqual(
      renderInlineMarkdown('a < b [x & y](https://e.com) > c'),
      'a &lt; b <a href="https://e.com" target="_blank" rel="noopener noreferrer">x &amp; y</a> &gt; c'
    );
  });

  test('leaves a non-http link as escaped text (blocks javascript:)', () => {
    assert.strictEqual(
      renderInlineMarkdown('[click](javascript:alert(1))'),
      '[click](javascript:alert(1))'
    );
  });

  test('plain prose with no link is just escaped', () => {
    assert.strictEqual(renderInlineMarkdown('plain & simple'), 'plain &amp; simple');
  });

  test('handles multiple links in one string', () => {
    assert.strictEqual(
      renderInlineMarkdown('[a](https://a.com) and [b](https://b.com)'),
      '<a href="https://a.com" target="_blank" rel="noopener noreferrer">a</a> and ' +
        '<a href="https://b.com" target="_blank" rel="noopener noreferrer">b</a>'
    );
  });
});
