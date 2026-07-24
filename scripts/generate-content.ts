import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatterMarkdown, parseParagraphs, type Perspective } from './lib/markdown.ts';
import { parseWorkManifest } from './lib/manifest.ts';
import { generateResearchPublications } from './lib/research-content.ts';

export const PERSPECTIVES_DIR = 'content/perspectives';
export const ABOUT_BIO_PATH = 'content/about/bio.md';
export const WORKS_DIR = 'content/works';
const OUTPUT_DIR = 'src/generated';

async function writeJson(filename: string, data: unknown): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  await writeFile(path.join(OUTPUT_DIR, filename), `${JSON.stringify(data, null, 2)}\n`);
}

export async function regeneratePerspectives(): Promise<void> {
  const files = (await readdir(PERSPECTIVES_DIR)).filter((file) => file.endsWith('.md'));
  const entries = await Promise.all(
    files.map(async (file) => {
      const slug = path.basename(file, '.md');
      const raw = await readFile(path.join(PERSPECTIVES_DIR, file), 'utf-8');
      return [slug, parseFrontmatterMarkdown(raw)] as const;
    })
  );
  const perspectives: Record<string, Perspective> = Object.fromEntries(entries);
  await writeJson('perspectives.json', perspectives);
  console.log(
    `[generate-content] Wrote ${OUTPUT_DIR}/perspectives.json (${Object.keys(perspectives).length} entries)`
  );
}

export async function regenerateAboutBio(): Promise<void> {
  const raw = await readFile(ABOUT_BIO_PATH, 'utf-8');
  const aboutBio = parseParagraphs(raw);
  await writeJson('about.json', aboutBio);
  console.log(`[generate-content] Wrote ${OUTPUT_DIR}/about.json (${aboutBio.length} paragraphs)`);
}

export async function regenerateResearch(): Promise<void> {
  const research = await generateResearchPublications();
  await writeJson('research.json', research);
  console.log(`[generate-content] Wrote ${OUTPUT_DIR}/research.json (${research.length} items)`);
}

export async function regenerateWorks(): Promise<void> {
  const entries = await readdir(WORKS_DIR, { withFileTypes: true });
  const projectDirs = entries
    .filter((entry) => entry.isDirectory())
    .sort((a, b) => a.name.localeCompare(b.name));

  const works = await Promise.all(
    projectDirs.map(async (dir) => {
      const raw = await readFile(path.join(WORKS_DIR, dir.name, 'Manifest.md'), 'utf-8');
      return parseWorkManifest(raw);
    })
  );
  works.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  await writeJson('works.json', works);
  console.log(`[generate-content] Wrote ${OUTPUT_DIR}/works.json (${works.length} items)`);
}

export async function generateAll(): Promise<void> {
  await regeneratePerspectives();
  await regenerateResearch();
  await regenerateAboutBio();
  await regenerateWorks();
}

// Only auto-run when executed directly (`node scripts/generate-content.ts`),
// not when imported — e.g. by vite.config.ts's dev-time content watcher,
// which calls the granular regenerate* functions instead of generateAll().
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  generateAll().catch((error) => {
    console.error('[generate-content] Failed:', error);
    process.exit(1);
  });
}
