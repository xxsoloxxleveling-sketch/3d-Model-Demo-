import { readdir, readFile, writeFile, mkdir, cp, access } from 'node:fs/promises';
import { extname, basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const root = fileURLToPath(new URL('../', import.meta.url));
const modelsDir = join(root, 'public/models');
const supported = new Set(['.glb', '.gltf', '.obj', '.fbx', '.stl']);
const config = JSON.parse(await readFile(join(root, 'portfolio.config.json'), 'utf8'));
await mkdir(modelsDir, { recursive: true });

async function walk(folder, prefix = '') {
  const entries = await readdir(folder, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) files.push(...await walk(join(folder, entry.name), `${path}/`));
    else if (entry.isFile()) files.push(path);
  }
  return files.sort((a, b) => a.localeCompare(b, 'en'));
}

const files = await walk(modelsDir);
const assetUrl = path => `/models/${path.split('/').map(encodeURIComponent).join('/')}`;
const models = [];
for (const path of files.filter(path => supported.has(extname(path).toLowerCase()))) {
  const ext = extname(path);
  const override = config.models?.[path] ?? {};
  const slug = basename(path, ext).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'model';
  const sameNameMtl = path.slice(0, -ext.length) + '.mtl';
  const folderMaterials = files.filter(file => dirname(file) === dirname(path) && extname(file).toLowerCase() === '.mtl');
  const mtlPath = override.mtl ?? (files.includes(sameNameMtl) ? sameNameMtl : folderMaterials.length === 1 ? folderMaterials[0] : null);
  models.push({
    id: `${slug}-${createHash('sha256').update(path).digest('hex').slice(0, 8)}`,
    name: override.name ?? basename(path, ext).replace(/[_-]+/g, ' ').replace(/\b\w/g, letter => letter.toUpperCase()),
    description: override.description ?? 'Explore this model from every angle.',
    category: override.category ?? '3D model',
    format: ext.slice(1).toUpperCase(),
    url: assetUrl(path),
    ...(override.thumbnail ? { thumbnail: override.thumbnail } : {}),
    ...(mtlPath && ext.toLowerCase() === '.obj' ? { mtl: assetUrl(mtlPath) } : {}),
    ...(override.rotation ? { rotation: override.rotation } : {}),
  });
}
await writeFile(join(root, 'public/models.json'), JSON.stringify({ name: config.name, description: config.description, models }, null, 2) + '\n');

// Keep compression decoders on the same origin so model viewing needs no CDN.
const threeRoot = join(root, 'node_modules/three/examples/jsm/libs');
await access(threeRoot);
await mkdir(join(root, 'public/decoders'), { recursive: true });
await cp(join(threeRoot, 'draco/gltf'), join(root, 'public/decoders/draco'), { recursive: true });
await cp(join(threeRoot, 'basis'), join(root, 'public/decoders/basis'), { recursive: true });
console.log(`Collection ready: ${models.length} model${models.length === 1 ? '' : 's'}.`);
if (files.some(path => extname(path).toLowerCase() === '.blend')) console.warn('Blender projects must be exported as GLB before they can be viewed in the browser.');
