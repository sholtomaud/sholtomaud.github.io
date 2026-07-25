import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseFrontmatterMarkdown, parseAboutBio, type Perspective } from './lib/markdown.ts';
import { parseWorkManifest } from './lib/manifest.ts';
import { generateResearch } from './lib/research-content.ts';

export const PERSPECTIVES_DIR = 'content/perspectives';
export const ABOUT_BIO_PATH = 'content/about/autobio.md';
export const PROJECTS_DIR = 'content/projects';
export const WRITING_DIR = 'content/writing';
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
  const aboutBio = parseAboutBio(raw);
  await writeJson('about.json', aboutBio);
  console.log(
    `[generate-content] Wrote ${OUTPUT_DIR}/about.json (${aboutBio.paragraphs.length} paragraphs)`
  );
}

export async function regenerateResearch(): Promise<void> {
  const research = await generateResearch();
  await writeJson('research.json', research);
  console.log(`[generate-content] Wrote ${OUTPUT_DIR}/research.json (${research.length} items)`);
}

export async function regenerateProjects(): Promise<void> {
  const files = (await readdir(PROJECTS_DIR))
    .filter((file) => file.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));

  const projects = await Promise.all(
    files.map(async (file) => parseWorkManifest(await readFile(path.join(PROJECTS_DIR, file), 'utf-8')))
  );
  projects.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  await writeJson('projects.json', projects);
  console.log(`[generate-content] Wrote ${OUTPUT_DIR}/projects.json (${projects.length} items)`);
}

export async function regenerateWriting(): Promise<void> {
  const files = (await readdir(WRITING_DIR))
    .filter((file) => file.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b));

  const writing = await Promise.all(
    files.map(async (file) => parseWorkManifest(await readFile(path.join(WRITING_DIR, file), 'utf-8')))
  );
  writing.sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));
  await writeJson('writing.json', writing);
  console.log(`[generate-content] Wrote ${OUTPUT_DIR}/writing.json (${writing.length} items)`);
}

export async function generateAll(): Promise<void> {
  await regeneratePerspectives();
  await regenerateResearch();
  await regenerateAboutBio();
  await regenerateProjects();
  await regenerateWriting();
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
