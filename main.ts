// Neon Sunset Studio — entrypoint for make.fun gta6-cover-art-01 (Node 22, stdlib only).
// Hands the app in: copies app/ and screenshots/ from beside this file into the
// output directory and writes dossier.json, the summary the judge reads, using
// the vendored make.fun library. Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader MAKEFUN_OUTPUT_DIR stands in for /output; inside the
// grader the program runs twice and both runs must write the same bytes.

import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The repository root is the directory this file lives in.
const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The gate's caps for this bounty (from the kit's reference/gate.json): at most
// 4 screenshots at 256 KiB each, at most 993 files / 48 MiB under app/, and a
// dossier text budget of 160 KiB. The program refuses nothing itself — it just
// hands in exactly what the repository holds, and the scorer decides validity.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

function handIn() {
  // Start from an empty output directory so a second run writes identical bytes.
  rmSync(outputDir, { recursive: true, force: true });
  mkdirSync(outputDir, { recursive: true });

  // The app: plain static files, served offline from app/index.html.
  cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });

  // The screenshots: 3 or 4 PNGs, the first by name the cover.
  mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
  const shotsDir = join(repoRoot, 'screenshots');
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, join(outputDir, 'screenshots'), { recursive: true });
  }

  // The dossier: the judge's view of the app, built by the vendored library.
  const dossier = buildDossier(outputDir, DOSSIER_LIMITS);
  writeFileSync(join(outputDir, 'dossier.json'), dossier);
}

handIn();
