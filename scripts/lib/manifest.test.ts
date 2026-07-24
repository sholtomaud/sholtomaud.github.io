import { test, describe } from 'node:test';
import assert from 'node:assert';
import { parseWorkManifest } from './manifest.ts';

describe('parseWorkManifest', () => {
  test('parses title, date, artifact sections, and joins the summary body', () => {
    const raw = [
      '---',
      'title = GSSK',
      'date = 2026',
      '',
      '[artifact.1]',
      'kind = repo',
      'label = Source',
      'url = https://github.com/sholtomaud/GSSK',
      '',
      '[artifact.2]',
      'kind = demo',
      'label = Live Demo',
      'url = https://sholtomaud.github.io/GSSK/demo/',
      '---',
      'First sentence.',
      '',
      'Second sentence.',
    ].join('\n');

    assert.deepStrictEqual(parseWorkManifest(raw), {
      title: 'GSSK',
      date: '2026',
      summary: 'First sentence. Second sentence.',
      artifacts: [
        { kind: 'repo', label: 'Source', url: 'https://github.com/sholtomaud/GSSK' },
        { kind: 'demo', label: 'Live Demo', url: 'https://sholtomaud.github.io/GSSK/demo/' },
      ],
    });
  });

  test('defaults kind to "link" when the artifact section omits it', () => {
    const raw = [
      '---',
      'title = Boba',
      '',
      '[artifact.1]',
      'label = Demo',
      'url = https://sholtomaud.github.io/boba/',
      '---',
      'A summary.',
    ].join('\n');

    assert.strictEqual(parseWorkManifest(raw).artifacts[0].kind, 'link');
  });

  test('works with zero artifact sections', () => {
    const raw = ['---', 'title = Something', '---', 'A summary.'].join('\n');
    assert.deepStrictEqual(parseWorkManifest(raw).artifacts, []);
  });

  test('date is optional', () => {
    const raw = ['---', 'title = Something', '---', 'A summary.'].join('\n');
    assert.strictEqual(parseWorkManifest(raw).date, undefined);
  });

  test('throws when title is missing', () => {
    const raw = ['---', 'date = 2026', '---', 'A summary.'].join('\n');
    assert.throws(() => parseWorkManifest(raw));
  });

  test('throws when an artifact section is missing label or url', () => {
    const raw = [
      '---',
      'title = Something',
      '',
      '[artifact.1]',
      'kind = repo',
      'url = https://example.com',
      '---',
      'A summary.',
    ].join('\n');

    assert.throws(() => parseWorkManifest(raw));
  });

  test("a URL's own colons/equals-like content do not break parsing", () => {
    const raw = [
      '---',
      'title = Something',
      '',
      '[artifact.1]',
      'label = Demo',
      'url = https://example.com:8080/path?x=1&y=2',
      '---',
      'A summary.',
    ].join('\n');

    assert.deepStrictEqual(parseWorkManifest(raw).artifacts, [
      { kind: 'link', label: 'Demo', url: 'https://example.com:8080/path?x=1&y=2' },
    ]);
  });
});
