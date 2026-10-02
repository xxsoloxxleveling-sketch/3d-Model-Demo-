import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const icons = {
  cube: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9M8 5.25l8 4.5"/>',
  arrow: '<path d="M7 17 17 7M7 7h10v10"/>',
  rotate: '<path d="M20 7v5h-5M4 17v-5h5"/><path d="M6 8a7 7 0 0 1 12-2l2 3M4 15l2 3a7 7 0 0 0 12-2"/>',
  reset: '<path d="M3 10a9 9 0 1 1 2 8M3 4v6h6"/>',
  expand: '<path d="M8 3H3v5M16 3h5v5M3 16v5h5M21 16v5h-5"/>',
  grid: '<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>',
  share: '<path d="M12 16V3m-4 4 4-4 4 4M5 13v7h14v-7"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  play: '<path d="m8 5 11 7-11 7Z"/>',
};
const icon = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
const escapeHtml = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <a class="brand" href="/" aria-label="Portfolio home"><span class="brand-symbol">${icon('cube')}</span><span id="brand-name">SOLO</span><span class="brand-divider"></span><span class="brand-caption">3D PORTFOLIO</span></a>
    <a class="header-link" href="https://github.com/xxsoloxxleveling-sketch/3d-Model-Demo-" target="_blank" rel="noopener noreferrer">GitHub ${icon('arrow')}</a>
  </header>
  <main>
    <section class="intro" aria-labelledby="page-title">
      <div><p class="eyebrow"><span class="live-dot"></span> SPACECRAFT & MECHANICAL MODELS</p><h1 id="page-title">The fleet, <span>in 3D.</span></h1></div>
      <p class="intro-copy" id="portfolio-description">A collection of 3D work.<br>Choose a model. Explore every angle.</p>
    </section>
    <div class="workspace">
      <aside class="collection" aria-label="Model collection">
        <div class="collection-heading"><h2>Collection</h2><span class="count" id="model-count">00</span></div>
        <p class="collection-hint" id="collection-hint">Select a model to explore</p>
        <div class="model-list" id="model-list"><p class="empty-note">Loading collection…</p></div>
        <div class="collection-bottom"><span class="small-dot"></span> MADE TO BE EXPLORED</div>
      </aside>
      <section class="viewer-panel" id="viewer-panel" aria-label="Interactive 3D viewer">
        <div class="viewer-top"><span class="viewer-label"><span class="live-dot"></span> LIVE VIEW</span><span id="format-label" class="format-label">3D</span></div>
        <div class="canvas-wrap" id="canvas-wrap"></div>
        <div class="viewer-state" id="viewer-state" role="status" aria-live="polite"><span class="spinner"></span><p>Preparing the viewer…</p></div>
        <div class="zoom-controls"><button id="zoom-in" class="icon-button" aria-label="Zoom in" title="Zoom in">${icon('plus')}</button><button id="zoom-out" class="icon-button" aria-label="Zoom out" title="Zoom out">${icon('minus')}</button></div>
        <div class="viewer-controls">
          <div class="control-group"><button id="rotate" class="tool-button" aria-pressed="false" title="Toggle automatic rotation">${icon('rotate')}<span>Auto rotate</span></button><button id="wireframe" class="tool-button" aria-pressed="false" title="Toggle wireframe">${icon('cube')}<span>Wireframe</span></button><button id="grid" class="icon-button" aria-pressed="true" aria-label="Show floor grid" title="Show floor grid">${icon('grid')}</button></div>
          <div class="control-group"><button id="reset" class="icon-button" aria-label="Reset view" title="Reset view">${icon('reset')}</button><button id="fullscreen" class="icon-button" aria-label="Enter fullscreen" title="Enter fullscreen">${icon('expand')}</button></div>
        </div>
      </section>
    </div>
    <section class="model-details" aria-label="Selected model details">
      <div class="model-summary"><p class="eyebrow" id="model-category">VIEWER PREVIEW</p><h2 id="model-title">Loading collection</h2><p id="model-description"></p></div>
      <div class="details-right"><button class="share-button" id="share">${icon('share')} Share this view</button><p class="gesture-hint">Drag to rotate <span>·</span> Scroll to zoom <span>·</span> Right-drag to pan</p><p id="share-status" class="share-status" role="status" aria-live="polite"></p></div>
    </section>
  </main>
  <footer><span><span id="footer-name">SOLO</span> <span class="footer-muted">/ 3D WORK</span></span><span class="footer-muted">A little perspective changes everything.</span><span class="footer-mark">${icon('cube')}</span></footer>
`;

const $ = selector => document.querySelector(selector);
const panel = $('#viewer-panel');
const canvasWrap = $('#canvas-wrap');
let renderer, scene, camera, controls, grid, currentModel, mixer, environment;
let catalog = [], currentEntry, loadGeneration = 0, wireframeEnabled = false, active = true;
let needsFrame = true, cameraDistance = 5, rotationEnabled = false, modelRadius = 1.5;
const modelCenter = new THREE.Vector3(0, 1.15, 0);
const modelBounds = new THREE.Box3();
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
const savedWireframe = new Map();
let dracoLoader, ktx2Loader;

function showState(message, { error = false, busy = true, retry = false } = {}) {
  const state = $('#viewer-state');
  state.hidden = false;
  state.classList.toggle('is-error', error);
  state.innerHTML = `${busy ? '<span class="spinner"></span>' : icon('cube')}<p>${escapeHtml(message)}</p>${retry ? '<button class="retry-button" id="retry">Try again</button>' : ''}`;
  $('#retry')?.addEventListener('click', () => selectModel(currentEntry));
}

function setupViewer() {
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;
  renderer.domElement.setAttribute('aria-label', '3D model. Drag to rotate, scroll or pinch to zoom.');
  renderer.domElement.setAttribute('tabindex', '0');
  canvasWrap.append(renderer.domElement);
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 0.01, 100);
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotateSpeed = 1.1;
  controls.maxPolarAngle = Math.PI * 0.93;
  controls.listenToKeyEvents(renderer.domElement);
  controls.addEventListener('change', () => { needsFrame = true; });
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  environment = pmrem.fromScene(room, 0.04).texture;
  scene.environment = environment;
  room.dispose();
  pmrem.dispose();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x59646b, 0.8));
  const key = new THREE.DirectionalLight(0xffffff, 2);
  key.position.set(3, 5, 4);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xa1c5ff, 1.5);
  rim.position.set(-4, 2, -3);
  scene.add(rim);
  grid = new THREE.GridHelper(12, 24, 0x435343, 0x303a31);
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);
  const observer = new ResizeObserver(() => {
    const { width, height } = canvasWrap.getBoundingClientRect();
    renderer.setSize(width, height);
    camera.aspect = width / Math.max(height, 1);
    camera.updateProjectionMatrix();
    if (currentModel) resetView();
    needsFrame = true;
  });
  observer.observe(canvasWrap);
  renderer.domElement.addEventListener('webglcontextlost', event => {
    event.preventDefault();
    active = false;
    showState('The 3D viewer paused. Reload this page to continue.', { error: true, busy: false });
  });
  let previousTime = performance.now();
  renderer.setAnimationLoop(time => {
    const delta = Math.min((time - previousTime) / 1000, 0.1);
    previousTime = time;
    if (!active || document.hidden) return;
    controls.update(delta);
    if (mixer && !reducedMotion.matches) { mixer.update(delta); needsFrame = true; }
    if (needsFrame || controls.autoRotate) {
      renderer.render(scene, camera);
      needsFrame = false;
    }
  });
}

function disposeModel(model) {
  const resources = new Set();
  model.traverse(child => {
    if (child.geometry) resources.add(child.geometry);
    for (const material of Array.isArray(child.material) ? child.material : child.material ? [child.material] : []) {
      resources.add(material);
      Object.values(material).forEach(value => { if (value?.isTexture) resources.add(value); });
    }
    if (child.skeleton?.boneTexture) resources.add(child.skeleton.boneTexture);
  });
  resources.forEach(resource => resource.dispose());
}

function resetView() {
  const halfFov = THREE.MathUtils.degToRad(camera.fov / 2);
  const horizontalFov = Math.atan(Math.tan(halfFov) * camera.aspect);
  cameraDistance = modelRadius / Math.sin(Math.min(halfFov, horizontalFov)) * 1.12;
  controls.target.copy(modelCenter);
  const direction = new THREE.Vector3(1, 0.55, 1.4).normalize();
  if (!modelBounds.isEmpty()) {
    const right = new THREE.Vector3().crossVectors(camera.up, direction).normalize();
    const up = new THREE.Vector3().crossVectors(direction, right).normalize();
    let fittedDistance = 0;
    for (const x of [modelBounds.min.x, modelBounds.max.x]) {
      for (const y of [modelBounds.min.y, modelBounds.max.y]) {
        for (const z of [modelBounds.min.z, modelBounds.max.z]) {
          const corner = new THREE.Vector3(x, y, z).sub(modelCenter);
          fittedDistance = Math.max(fittedDistance, corner.dot(direction) + Math.max(Math.abs(corner.dot(right)) / Math.tan(horizontalFov), Math.abs(corner.dot(up)) / Math.tan(halfFov)));
        }
      }
    }
    cameraDistance = fittedDistance * 1.15;
  }
  camera.position.copy(direction).multiplyScalar(cameraDistance).add(controls.target);
  camera.near = 0.01;
  camera.far = Math.max(100, cameraDistance * 10);
  camera.updateProjectionMatrix();
  controls.minDistance = 0.35;
  controls.maxDistance = cameraDistance * 4;
  controls.update();
  needsFrame = true;
}

function setWireframe(enabled) {
  wireframeEnabled = enabled;
  $('#wireframe').setAttribute('aria-pressed', String(enabled));
  currentModel?.traverse(child => {
    for (const material of Array.isArray(child.material) ? child.material : child.material ? [child.material] : []) {
      if ('wireframe' in material) {
        if (!savedWireframe.has(material)) savedWireframe.set(material, material.wireframe);
        material.wireframe = enabled || savedWireframe.get(material);
      }
    }
  });
  needsFrame = true;
}

function demoModel() {
  const group = new THREE.Group();
  const material = new THREE.MeshStandardMaterial({ color: 0xc3f36b, roughness: 0.25, metalness: 0.65 });
  const knot = new THREE.Mesh(new THREE.TorusKnotGeometry(0.85, 0.27, 180, 32), material);
  knot.rotation.set(0.4, 0, 0.3);
  group.add(knot);
  return { object: group, animations: [] };
}

async function loadModel(entry, manager, onProgress) {
  if (entry.demo) return demoModel();
  if (['GLB', 'GLTF'].includes(entry.format)) {
    const [{ GLTFLoader }, { DRACOLoader }, { KTX2Loader }, { MeshoptDecoder }] = await Promise.all([
      import('three/addons/loaders/GLTFLoader.js'), import('three/addons/loaders/DRACOLoader.js'),
      import('three/addons/loaders/KTX2Loader.js'), import('three/addons/libs/meshopt_decoder.module.js'),
    ]);
    dracoLoader ??= new DRACOLoader().setDecoderPath('/decoders/draco/');
    ktx2Loader ??= new KTX2Loader().setTranscoderPath('/decoders/basis/').detectSupport(renderer);
    const loader = new GLTFLoader(manager).setDRACOLoader(dracoLoader).setKTX2Loader(ktx2Loader).setMeshoptDecoder(MeshoptDecoder);
    const gltf = await loader.loadAsync(entry.url, onProgress);
    return { object: gltf.scene, animations: gltf.animations };
  }
  if (entry.format === 'OBJ') {
    const { OBJLoader } = await import('three/addons/loaders/OBJLoader.js');
    const loader = new OBJLoader(manager);
    if (entry.mtl) {
      const { MTLLoader } = await import('three/addons/loaders/MTLLoader.js');
      const materials = await new MTLLoader(manager).loadAsync(entry.mtl);
      materials.preload();
      loader.setMaterials(materials);
    }
    return { object: await loader.loadAsync(entry.url, onProgress), animations: [] };
  }
  if (entry.format === 'FBX') {
    const { FBXLoader } = await import('three/addons/loaders/FBXLoader.js');
    const object = await new FBXLoader(manager).loadAsync(entry.url, onProgress);
    return { object, animations: object.animations ?? [] };
  }
  if (entry.format === 'STL') {
    const { STLLoader } = await import('three/addons/loaders/STLLoader.js');
    const geometry = await new STLLoader(manager).loadAsync(entry.url, onProgress);
    const object = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: geometry.hasColors ? 0xffffff : 0xc3f36b, vertexColors: Boolean(geometry.hasColors), roughness: 0.4, metalness: 0.25 }));
    // STL commonly uses a Z-up coordinate system.
    object.rotation.x = -Math.PI / 2;
    return { object, animations: [] };
  }
  throw new Error('Unsupported model format');
}

async function selectModel(entry) {
  currentEntry = entry;
  const generation = ++loadGeneration;
  $('#model-title').textContent = entry.name;
  $('#model-description').textContent = entry.description;
  $('#model-category').textContent = entry.category;
  $('#format-label').textContent = entry.demo ? 'PREVIEW' : entry.format;
  document.title = `${entry.name} — ${$('#brand-name').textContent} 3D Portfolio`;
  document.querySelectorAll('.model-card').forEach(button => {
    const selected = button.dataset.model === entry.id;
    button.classList.toggle('selected', selected);
    button.setAttribute('aria-pressed', String(selected));
  });
  $('#share-status').textContent = '';
  if (!entry.demo) {
    const url = new URL(location.href);
    url.searchParams.set('model', entry.id);
    history.replaceState(null, '', url);
  }
  if (!renderer) return;
  if (currentModel) {
    mixer?.stopAllAction();
    mixer?.uncacheRoot(currentModel);
    scene.remove(currentModel);
    disposeModel(currentModel);
    currentModel = null;
    mixer = null;
    savedWireframe.clear();
    needsFrame = true;
  }
  showState(`Loading ${entry.name}…`);
  setModelToolsDisabled(true);
  const missingAssets = [];
  const manager = new THREE.LoadingManager();
  manager.onError = url => {
    missingAssets.push(url);
    if (generation === loadGeneration && currentModel) $('#model-description').textContent = `${entry.description} Some textures could not be loaded.`;
  };
  try {
    const result = await loadModel(entry, manager, progress => {
      if (generation === loadGeneration && progress.lengthComputable) showState(`Loading ${entry.name}… ${Math.round(progress.loaded / progress.total * 100)}%`);
    });
    if (generation !== loadGeneration) { disposeModel(result.object); return; }
    const model = result.object;
    if (entry.rotation) model.rotation.set(...entry.rotation.map(THREE.MathUtils.degToRad));
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const size = box.getSize(new THREE.Vector3());
    const maxSize = Math.max(size.x, size.y, size.z);
    if (!Number.isFinite(maxSize) || maxSize <= 0) {
      disposeModel(model);
      throw new Error('The model has no visible geometry');
    }
    const center = box.getCenter(new THREE.Vector3());
    const wrapper = new THREE.Group();
    wrapper.add(model);
    wrapper.scale.setScalar(2.5 / maxSize);
    model.position.sub(center);
    wrapper.position.y = size.y / 2 * wrapper.scale.x + 0.025;
    currentModel = wrapper;
    scene.add(wrapper);
    const fittedBox = new THREE.Box3().setFromObject(wrapper);
    modelBounds.copy(fittedBox);
    modelRadius = fittedBox.getBoundingSphere(new THREE.Sphere()).radius;
    fittedBox.getCenter(modelCenter);
    if (result.animations.length) {
      mixer = new THREE.AnimationMixer(model);
      result.animations.forEach(clip => mixer.clipAction(clip).play());
    }
    setWireframe(wireframeEnabled);
    resetView();
    $('#viewer-state').hidden = true;
    $('#model-description').textContent = entry.description + (missingAssets.length ? ' Some textures could not be loaded.' : '');
    setModelToolsDisabled(false);
  } catch (error) {
    if (generation !== loadGeneration) return;
    console.error('Model loading failed:', error);
    showState('This model could not be opened. Please try again or choose another model.', { error: true, busy: false, retry: true });
  }
}

function setModelToolsDisabled(disabled) {
  ['#rotate', '#wireframe', '#reset', '#zoom-in', '#zoom-out'].forEach(selector => { $(selector).disabled = disabled; });
}

function zoom(factor) {
  const offset = camera.position.clone().sub(controls.target);
  offset.setLength(THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance));
  camera.position.copy(controls.target).add(offset);
  controls.update();
  needsFrame = true;
}
$('#rotate').addEventListener('click', () => {
  rotationEnabled = !rotationEnabled;
  controls.autoRotate = rotationEnabled;
  $('#rotate').setAttribute('aria-pressed', String(rotationEnabled));
  needsFrame = true;
});
$('#wireframe').addEventListener('click', () => setWireframe(!wireframeEnabled));
$('#grid').addEventListener('click', () => { grid.visible = !grid.visible; $('#grid').setAttribute('aria-pressed', String(grid.visible)); needsFrame = true; });
$('#reset').addEventListener('click', resetView);
$('#zoom-in').addEventListener('click', () => zoom(0.8));
$('#zoom-out').addEventListener('click', () => zoom(1.25));
if (!document.fullscreenEnabled) $('#fullscreen').hidden = true;
$('#fullscreen').addEventListener('click', async () => {
  try { if (document.fullscreenElement) await document.exitFullscreen(); else await panel.requestFullscreen(); }
  catch { $('#share-status').textContent = 'Fullscreen is unavailable in this browser.'; }
});
document.addEventListener('fullscreenchange', () => { $('#fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Exit fullscreen' : 'Enter fullscreen'); needsFrame = true; });
$('#share').addEventListener('click', async () => {
  try {
    if (navigator.share) await navigator.share({ title: document.title, url: location.href });
    else if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(location.href); $('#share-status').textContent = 'Link copied. Ready to share.'; }
    else { $('#share-status').textContent = 'Copy the link from your browser’s address bar to share.'; }
  } catch (error) { if (error.name !== 'AbortError') $('#share-status').textContent = 'Copy the link from your browser’s address bar to share.'; }
});
$('#model-list').addEventListener('click', event => {
  const button = event.target.closest('[data-model]');
  if (button) selectModel(catalog.find(entry => entry.id === button.dataset.model));
});

async function init() {
  try { setupViewer(); }
  catch (error) {
    console.error('Viewer initialization failed:', error);
    showState('Your browser could not start the 3D viewer. Try a recent browser with graphics acceleration enabled.', { error: true, busy: false });
    renderer = null;
    document.querySelectorAll('.viewer-controls button, .zoom-controls button').forEach(button => { button.disabled = true; });
  }
  try {
    const response = await fetch('/models.json');
    if (!response.ok) throw new Error(`Collection unavailable (${response.status})`);
    const collection = await response.json();
    catalog = collection.models;
    $('#brand-name').textContent = collection.name;
    $('#footer-name').textContent = collection.name;
    $('#portfolio-description').textContent = collection.description;
    $('#model-count').textContent = String(catalog.length).padStart(2, '0');
    if (!catalog.length) {
      $('#collection-hint').textContent = 'The collection is coming soon';
      $('#model-list').innerHTML = '<div class="empty-collection"><span class="empty-icon">' + icon('cube') + '</span><h3>A space for 3D work.</h3><p>Portfolio models will appear here. For now, explore the viewer preview.</p><span class="preview-tag">INTERACTIVE PREVIEW</span></div>';
      await selectModel({ id: 'viewer-preview', name: 'Viewer preview', description: 'An example shape to try the viewer. This is a demo, not portfolio work.', category: 'INTERACTIVE DEMO', demo: true });
      return;
    }
    $('#model-list').innerHTML = catalog.map((entry, index) => `<button class="model-card" data-model="${escapeHtml(entry.id)}" aria-pressed="false">${entry.thumbnail ? `<img class="model-thumbnail" src="${escapeHtml(entry.thumbnail)}" alt="" width="52" height="52" loading="lazy" />` : `<span class="model-number">${String(index + 1).padStart(2, '0')}</span>`}<span class="model-card-info"><span class="model-card-title">${escapeHtml(entry.name)}</span><span class="model-card-meta">${escapeHtml(entry.category)} <span>·</span> ${escapeHtml(entry.format)}</span></span><span class="model-card-arrow">${icon('arrow')}</span></button>`).join('');
    const requested = new URLSearchParams(location.search).get('model');
    await selectModel(catalog.find(entry => entry.id === requested) ?? catalog[0]);
  } catch (error) {
    console.error('Collection loading failed:', error);
    $('#collection-hint').textContent = 'Collection unavailable';
    $('#model-list').innerHTML = '<p class="empty-note">The collection could not be loaded. Please reload the page.</p>';
    if (renderer) showState('The collection could not be loaded. Please reload this page.', { error: true, busy: false });
  }
}
init();
