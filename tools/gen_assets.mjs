// 아이템·생산기 일러스트 생성기 (Replicate flux-schnell).
// 동일 화풍 프리픽스로 일관성 유지. 흰 배경 → 게임에서 카드에 녹여 토큰처럼 렌더.
// 이미 있는 파일은 건너뜀(재실행 저렴). 실행: node tools/gen_assets.mjs
import { THEMES } from '../src/data/themes.js';
import { PRODUCERS } from '../src/data/producers.js';
import { readFileSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, '..');
const OUT = join(ROOT, 'assets', 'items');
mkdirSync(OUT, { recursive: true });

// .env.local 읽기
const env = readFileSync(join(ROOT, '.env.local'), 'utf8');
const KEY = (env.match(/replicate_KEY=(.+)/) || [])[1]?.trim();
if (!KEY) { console.error('no replicate key'); process.exit(1); }

const STYLE = 'adorable kawaii flat vector game character icon, chunky rounded shapes, big glossy 3d highlights, smooth soft gradient shading, thick soft drop shadow under it, sparkly shine, vibrant cheerful pastel colors, bold clean outline, single object centered with empty margin, isolated on pure plain solid white background, Gossip Harbor and Merge Mansion mobile merge game art style, cohesive consistent style, no text, no words, no letters';
const FACE = ' Give it an adorable cute mascot face with big sparkly happy eyes and a friendly little smile, full of character and charm.';

function buildJobs() {
  const jobs = [];
  for (const t of THEMES) {
    t.chain.forEach((e, i) => {
      jobs.push({ id: `${t.id}_${i + 1}`, prompt: `${STYLE}. Subject: ${e.subj}.${FACE}` });
    });
  }
  for (const p of PRODUCERS) {
    jobs.push({ id: `prod_${p.id}`, prompt: `${STYLE}. Subject: ${p.name} — a cute lively mini building workshop, ${p.theme} themed, with glowing windows.${FACE}` });
  }
  return jobs;
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function genOnce(prompt) {
  const res = await fetch('https://api.replicate.com/v1/models/black-forest-labs/flux-schnell/predictions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json', Prefer: 'wait' },
    body: JSON.stringify({ input: {
      prompt, aspect_ratio: '1:1', num_outputs: 1, output_format: 'webp', output_quality: 92, go_fast: true,
    } }),
  });
  if (res.status === 429) { throw Object.assign(new Error('rate limited'), { retry: true }); }
  const data = await res.json();
  if (data.status === 'failed') throw new Error('gen failed: ' + (data.error || ''));
  let out = data.output, tries = 0;
  while (!out && data.urls?.get && tries < 40) {
    await sleep(1200);
    const d2 = await (await fetch(data.urls.get, { headers: { Authorization: `Bearer ${KEY}` } })).json();
    if (d2.status === 'failed' || d2.status === 'canceled') throw new Error('gen failed');
    out = d2.output; tries++;
  }
  const url = Array.isArray(out) ? out[0] : out;
  if (!url) throw Object.assign(new Error('no output url'), { retry: true });
  return url;
}
async function gen(prompt) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try { return await genOnce(prompt); }
    catch (e) { if (!e.retry || attempt === 4) throw e; await sleep(2000 + attempt * 2000); }
  }
}

async function download(url, path) {
  const r = await fetch(url);
  const buf = Buffer.from(await r.arrayBuffer());
  writeFileSync(path, buf);
  return buf.length;
}

async function run() {
  const jobs = buildJobs().filter(j => !existsSync(join(OUT, j.id + '.webp')));
  console.log(`총 ${jobs.length}개 생성 시작`);
  const CONC = 1;
  let done = 0, fail = 0;
  for (let i = 0; i < jobs.length; i += CONC) {
    const batch = jobs.slice(i, i + CONC);
    await Promise.all(batch.map(async (j) => {
      try {
        const url = await gen(j.prompt);
        const sz = await download(url, join(OUT, j.id + '.webp'));
        done++; console.log(`✓ ${j.id} (${(sz/1024|0)}KB) [${done}/${jobs.length}]`);
      } catch (e) { fail++; console.error(`✗ ${j.id}: ${e.message}`); }
    }));
  }
  console.log(`완료: 성공 ${done}, 실패 ${fail}`);
}
run();
