import { test, describe } from 'node:test';
import assert from 'node:assert';
import {
  parseBibFields,
  parseBibliography,
  cleanBibText,
  bibEntryToResearchItem,
  orcidWorkToResearchItem,
  dedupeAgainst,
  parsePlannedResearch,
  type ResearchItem,
} from './research-content.ts';

describe('parseBibFields', () => {
  test('extracts brace-delimited field values', () => {
    const fields = parseBibFields('title = {A Paper}, date = {2020-01-01},');
    assert.strictEqual(fields.title, 'A Paper');
    assert.strictEqual(fields.date, '2020-01-01');
  });

  test('handles nested braces (case-protection)', () => {
    const fields = parseBibFields('title = {The {{DirectScience}} Method},');
    assert.strictEqual(fields.title, 'The {{DirectScience}} Method');
  });

  test('lowercases field names', () => {
    const fields = parseBibFields('Title = {X},');
    assert.strictEqual(fields.title, 'X');
  });
});

describe('parseBibliography', () => {
  test('splits multiple @entries and parses each', () => {
    const raw = [
      '@article{keyOne,',
      '  title = {First},',
      '  date = {2019-05-01},',
      '}',
      '@article{keyTwo,',
      '  title = {Second},',
      '  date = {2021-03-01},',
      '}',
    ].join('\n');

    const entries = parseBibliography(raw);
    assert.strictEqual(entries.length, 2);
    assert.strictEqual(entries[0].key, 'keyOne');
    assert.strictEqual(entries[0].fields.title, 'First');
    assert.strictEqual(entries[1].key, 'keyTwo');
    assert.strictEqual(entries[1].fields.title, 'Second');
  });

  test('returns an empty array for blank input', () => {
    assert.deepStrictEqual(parseBibliography(''), []);
  });
});

describe('cleanBibText', () => {
  test('strips braces and unescapes &', () => {
    assert.strictEqual(cleanBibText('{Foo} \\& {Bar}'), 'Foo & Bar');
  });

  test('returns undefined for empty/undefined input', () => {
    assert.strictEqual(cleanBibText(undefined), undefined);
    assert.strictEqual(cleanBibText('   '), undefined);
  });
});

describe('bibEntryToResearchItem', () => {
  test('prefers a local PDF override when the citekey matches', () => {
    const item = bibEntryToResearchItem({
      key: 'mo_Heuristic_2015f',
      fields: { title: 'Heuristic Paper', doi: '10.1234/x' },
    });
    assert.strictEqual(item.kind, 'pdf');
    assert.strictEqual(
      item.href,
      'Mo and Maud - 2015 - Heuristic Systems Engineering of a Web Based Service System.pdf'
    );
  });

  test('falls back to a doi.org link when there is a doi', () => {
    const item = bibEntryToResearchItem({
      key: 'someKey',
      fields: { title: 'A Title', doi: '10.5555/abc' },
    });
    assert.strictEqual(item.kind, 'article');
    assert.strictEqual(item.href, 'https://doi.org/10.5555/abc');
  });

  test('falls back to a bare url when there is no doi', () => {
    const item = bibEntryToResearchItem({
      key: 'someKey',
      fields: { title: 'A Title', url: 'https://example.com/paper' },
    });
    assert.strictEqual(item.href, 'https://example.com/paper');
  });

  test('has no href when neither override, doi, nor url is present', () => {
    const item = bibEntryToResearchItem({ key: 'someKey', fields: { title: 'A Title' } });
    assert.strictEqual(item.href, undefined);
  });

  test('extracts a 4-digit year from the date field', () => {
    const item = bibEntryToResearchItem({
      key: 'someKey',
      fields: { title: 'A Title', date: '2018-11-02' },
    });
    assert.strictEqual(item.date, '2018');
  });
});

describe('orcidWorkToResearchItem', () => {
  test('builds a doi.org link from the doi external-id, ignoring external-id-url', () => {
    const item = orcidWorkToResearchItem({
      title: { title: { value: 'ORCID Paper' } },
      'publication-date': { year: { value: '2022' } },
      'external-ids': {
        'external-id': [
          {
            'external-id-type': 'doi',
            'external-id-value': '10.9999/z',
            'external-id-url': { value: 'https://paywall.example.com/z' },
          },
        ],
      },
    });
    assert.strictEqual(item.href, 'https://doi.org/10.9999/z');
    assert.strictEqual(item.title, 'ORCID Paper');
    assert.strictEqual(item.date, '2022');
  });

  test('falls back to summary.url when there is no doi', () => {
    const item = orcidWorkToResearchItem({
      title: { title: { value: 'No DOI Paper' } },
      url: { value: 'https://example.com/no-doi' },
    });
    assert.strictEqual(item.href, 'https://example.com/no-doi');
  });

  test('defaults the title to "Untitled" when missing', () => {
    const item = orcidWorkToResearchItem({});
    assert.strictEqual(item.title, 'Untitled');
    assert.strictEqual(item.href, undefined);
  });
});

describe('dedupeAgainst', () => {
  test('filters out incoming items whose href already exists', () => {
    const existing: ResearchItem[] = [
      { title: 'A', kind: 'article', category: 'publication', href: 'https://doi.org/1' },
    ];
    const incoming: ResearchItem[] = [
      { title: 'A dup', kind: 'article', category: 'publication', href: 'https://doi.org/1' },
      { title: 'B', kind: 'article', category: 'publication', href: 'https://doi.org/2' },
    ];

    const result = dedupeAgainst(existing, incoming);
    assert.strictEqual(result.length, 1);
    assert.strictEqual(result[0].title, 'B');
  });

  test('keeps hrefless incoming items', () => {
    const incoming: ResearchItem[] = [
      { title: 'No link', kind: 'article', category: 'publication' },
    ];
    assert.deepStrictEqual(dedupeAgainst([], incoming), incoming);
  });
});

describe('parsePlannedResearch', () => {
  test('parses a pdf item with all fields and category planned', () => {
    const item = parsePlannedResearch(
      [
        '---',
        'title = Preface',
        'venue = PhD thesis (draft)',
        'date = 2026',
        'kind = pdf',
        'href = preface.pdf',
        '---',
        'A draft preface.',
        '',
        'Second paragraph.',
      ].join('\n')
    );
    assert.deepStrictEqual(item, {
      title: 'Preface',
      kind: 'pdf',
      category: 'planned',
      href: 'preface.pdf',
      venue: 'PhD thesis (draft)',
      date: '2026',
      summary: 'A draft preface. Second paragraph.',
    });
  });

  test('defaults kind to article and leaves optional fields undefined', () => {
    const item = parsePlannedResearch('---\ntitle = Some Article\n---\n');
    assert.strictEqual(item.kind, 'article');
    assert.strictEqual(item.category, 'planned');
    assert.strictEqual(item.href, undefined);
    assert.strictEqual(item.venue, undefined);
    assert.strictEqual(item.date, undefined);
    assert.strictEqual(item.summary, undefined);
  });

  test('throws when title is missing', () => {
    assert.throws(() => parsePlannedResearch('---\ndate = 2026\n---\nBody.'), /title/);
  });

  test('throws when the frontmatter block is missing', () => {
    assert.throws(() => parsePlannedResearch('no frontmatter here'), /frontmatter/);
  });
});
