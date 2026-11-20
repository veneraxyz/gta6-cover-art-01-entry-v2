// Vice Cover Studio II — a gta6-cover-art-01 entry (Node 22, standard library only).
//
// The app itself is plain static files in app/ (index.html plus ES modules, no
// library, no network request at runtime). This program hands it in: it copies
// app/ and screenshots/ from beside this file into the output directory and
// writes /output/dossier.json with the vendored make.fun library, so the judge
// reads the dossier, the screenshots and an outline of the source.
//
// Run it outside the grader's container with MAKEFUN_OUTPUT_DIR standing in
// for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The scorer's caps for this competition (reference/gate.json): at most 4
// screenshots, each at most 256 KiB; app/ at most 993 files and 48 MiB in all,
// each app/ path at most 1000 bytes; the dossier's text at most 160 KiB.
const DOSSIER_LIMITS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  app_max_files: 993,
  app_max_bytes: 50331648,
  app_path_max_bytes: 1000,
};

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

writeFileSync(join(out, 'dossier.json'), buildDossier(out, DOSSIER_LIMITS));
