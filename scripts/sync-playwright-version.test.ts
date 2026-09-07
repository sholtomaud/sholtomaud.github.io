import { describe, it } from 'node:test';
import assert from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import {
  cleanVersion,
  readPlaywrightVersionFile,
  writePlaywrightVersionFile,
  readPackageJson,
  writePackageJson,
  syncPlaywrightVersion,
} from './sync-playwright-version.ts';

describe('cleanVersion', () => {
  it('strips leading ^, ~, or v', () => {
    assert.strictEqual(cleanVersion('^1.63.0'), '1.63.0');
    assert.strictEqual(cleanVersion('~1.63.0'), '1.63.0');
    assert.strictEqual(cleanVersion('v1.63.0'), '1.63.0');
    assert.strictEqual(cleanVersion('1.63.0'), '1.63.0');
  });
});

describe('syncPlaywrightVersion', () => {
  it('syncs package.json from .playwright-version file by default', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'pw-sync-test-'));
    try {
      const versionPath = path.join(tmpDir, '.playwright-version');
      const pkgPath = path.join(tmpDir, 'package.json');

      await writePlaywrightVersionFile(versionPath, '1.63.0');
      await writePackageJson(pkgPath, {
        name: 'test-app',
        devDependencies: {
          '@playwright/test': '^1.60.0',
          playwright: '^1.60.0',
        },
      });

      await syncPlaywrightVersion({ rootDir: tmpDir });

      const updatedPkg = await readPackageJson(pkgPath);
      assert.strictEqual(updatedPkg.devDependencies?.['@playwright/test'], '^1.63.0');
      assert.strictEqual(updatedPkg.devDependencies?.['playwright'], '^1.63.0');
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('syncs .playwright-version from package.json when fromPackage is true', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'pw-sync-test-'));
    try {
      const versionPath = path.join(tmpDir, '.playwright-version');
      const pkgPath = path.join(tmpDir, 'package.json');

      await writePlaywrightVersionFile(versionPath, '1.60.0');
      await writePackageJson(pkgPath, {
        name: 'test-app',
        devDependencies: {
          '@playwright/test': '^1.63.0',
          playwright: '^1.63.0',
        },
      });

      await syncPlaywrightVersion({ rootDir: tmpDir, fromPackage: true });

      const updatedVersion = await readPlaywrightVersionFile(versionPath);
      assert.strictEqual(updatedVersion, '1.63.0');
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('passes check when versions match', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'pw-sync-test-'));
    try {
      const versionPath = path.join(tmpDir, '.playwright-version');
      const pkgPath = path.join(tmpDir, 'package.json');

      await writePlaywrightVersionFile(versionPath, '1.63.0');
      await writePackageJson(pkgPath, {
        name: 'test-app',
        devDependencies: {
          '@playwright/test': '^1.63.0',
          playwright: '^1.63.0',
        },
      });

      await assert.doesNotReject(async () => {
        await syncPlaywrightVersion({ rootDir: tmpDir, check: true });
      });
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });

  it('fails check when versions mismatch', async () => {
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'pw-sync-test-'));
    try {
      const versionPath = path.join(tmpDir, '.playwright-version');
      const pkgPath = path.join(tmpDir, 'package.json');

      await writePlaywrightVersionFile(versionPath, '1.63.0');
      await writePackageJson(pkgPath, {
        name: 'test-app',
        devDependencies: {
          '@playwright/test': '^1.60.0',
          playwright: '^1.60.0',
        },
      });

      await assert.rejects(async () => {
        await syncPlaywrightVersion({ rootDir: tmpDir, check: true });
      }, /Playwright version mismatch/);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  });
});
