import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export function cleanVersion(raw: string): string {
  return raw.replace(/^[~^v]/, '').trim();
}

export async function readPlaywrightVersionFile(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf-8');
  return content.trim();
}

export async function writePlaywrightVersionFile(filePath: string, version: string): Promise<void> {
  await writeFile(filePath, `${version.trim()}\n`, 'utf-8');
}

export interface PackageJson {
  devDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
  [key: string]: unknown;
}

export async function readPackageJson(filePath: string): Promise<PackageJson> {
  const content = await readFile(filePath, 'utf-8');
  return JSON.parse(content) as PackageJson;
}

export async function writePackageJson(filePath: string, pkg: PackageJson): Promise<void> {
  await writeFile(filePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf-8');
}

export interface SyncOptions {
  check?: boolean;
  fromPackage?: boolean;
  rootDir?: string;
}

export async function syncPlaywrightVersion(options: SyncOptions = {}): Promise<void> {
  const rootDir = options.rootDir ?? process.cwd();
  const versionFilePath = path.join(rootDir, '.playwright-version');
  const packageJsonPath = path.join(rootDir, 'package.json');

  const fileVersion = cleanVersion(await readPlaywrightVersionFile(versionFilePath));
  const pkg = await readPackageJson(packageJsonPath);

  const devDeps = pkg.devDependencies ?? {};
  const pkgPlaywrightTest = devDeps['@playwright/test'] ? cleanVersion(devDeps['@playwright/test']) : null;
  const pkgPlaywright = devDeps['playwright'] ? cleanVersion(devDeps['playwright']) : null;

  if (options.check) {
    if (pkgPlaywrightTest !== fileVersion || pkgPlaywright !== fileVersion) {
      throw new Error(
        `Playwright version mismatch! .playwright-version is "${fileVersion}", but package.json has "@playwright/test": "${devDeps['@playwright/test']}" and "playwright": "${devDeps['playwright']}".`
      );
    }
    console.log(`[sync-playwright] Version check passed (${fileVersion})`);
    return;
  }

  if (options.fromPackage) {
    const pkgVersion = pkgPlaywrightTest || pkgPlaywright;
    if (!pkgVersion) {
      throw new Error('No playwright dependency found in package.json devDependencies');
    }
    await writePlaywrightVersionFile(versionFilePath, pkgVersion);
    console.log(`[sync-playwright] Updated .playwright-version to ${pkgVersion} from package.json`);
    return;
  }

  // Default mode: sync package.json from .playwright-version
  let modified = false;
  const newSpecifier = `^${fileVersion}`;

  if (devDeps['@playwright/test'] !== newSpecifier) {
    devDeps['@playwright/test'] = newSpecifier;
    modified = true;
  }
  if (devDeps['playwright'] !== newSpecifier) {
    devDeps['playwright'] = newSpecifier;
    modified = true;
  }

  if (modified) {
    pkg.devDependencies = devDeps;
    await writePackageJson(packageJsonPath, pkg);
    console.log(`[sync-playwright] Updated package.json Playwright dependencies to ${newSpecifier}`);
  } else {
    console.log(`[sync-playwright] package.json Playwright dependencies already up to date (${newSpecifier})`);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const check = process.argv.includes('--check');
  const fromPackage = process.argv.includes('--from-package');

  syncPlaywrightVersion({ check, fromPackage }).catch((error) => {
    console.error('[sync-playwright] Error:', error.message);
    process.exit(1);
  });
}
