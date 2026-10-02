# SOLO — 3D portfolio

A simple, responsive portfolio that lets visitors choose a model, rotate and zoom it, view its wireframe, use fullscreen, and share a link to that model. Built with Vite and Three.js, ready for Vercel.

The collection includes five models: **Titan Aegis**, **ARX-4 Kestrel — Final**, **Silver Interceptor**, **ARX-4 Kestrel — Modular**, and **Aster Walker**. Each has a preview image and an interactive GLB file. Titan Aegis and the final Kestrel were exported from their Blender source files for the browser, with studio/backdrop objects excluded. The source Blender files were left unchanged.

## Add your models

1. Export your model as **GLB** for the easiest upload. In Blender, use **File → Export → glTF 2.0**, and choose **glTF Binary (.glb)**. Enable export of materials/textures as needed. A `.blend` project cannot be displayed directly by a browser.
2. Put your files in `public/models/`. Each model can have its own subfolder. GLB, glTF, OBJ, FBX, and STL are supported. Keep glTF `.bin` files, OBJ `.mtl` files, and textures beside their models, preserving the relative folders used by the export. GLB can bundle the mesh, materials, and textures into one file.
3. Commit and push the files to GitHub. During the Vercel build, the collection is generated automatically from this folder. No hand-edited model list is necessary.

Example:

```text
public/models/
  character.glb
  helmet.glb
  sculpture/
    sculpture.obj
    sculpture.mtl
    textures/
      basecolor.png
```

Keep web exports reasonably small for mobile visitors. GitHub rejects individual files over 100 MiB; aim for much smaller web models and resize textures when practical. This project serves actual files from `public/models/`; do not commit Git LFS pointer files there without arranging for your deployment to fetch the real assets.

## Change the name or model descriptions

Edit `portfolio.config.json`. Model overrides use paths relative to `public/models/`:

```json
{
  "name": "Your Name",
  "description": "My collection of characters, props, and environments.",
  "models": {
    "character.glb": {
      "name": "Character study",
      "category": "Character",
      "description": "A stylized character modeled and textured in Blender.",
      "thumbnail": "/previews/character.png"
    },
    "sculpture/sculpture.obj": {
      "name": "Sculpture",
      "mtl": "sculpture/sculpture.mtl",
      "rotation": [0, 0, 0]
    }
  }
}
```

Rotation values are degrees around X, Y, and Z. Use them to correct a model's orientation. STL defaults to Z-up; other formats keep their exported orientation. If an OBJ folder has one MTL file, it is detected automatically; use `mtl` for an explicit choice when there are several. GLB is preferred for reliable materials and animations across browsers. FBX support depends on the export version and available textures.

## Run locally

Install Node.js 22.12 or newer, then:

```sh
npm ci
npm run dev
```

After adding or renaming models while the server is running, use `npm run sync-models` and reload the page. Production builds always regenerate the collection.

```sh
npm run build
npm run preview
```

## Deploy to Vercel

1. Open [Vercel New Project](https://vercel.com/new).
2. Import `xxsoloxxleveling-sketch/3d-Model-Demo-` from GitHub.
3. Choose **Vite**, keep the root directory as the repository root, and deploy. `vercel.json` already sets the build command to `npm run build` and the output folder to `dist`. No environment variables or backend are needed.
4. Share the resulting `.vercel.app` address. Later pushes to the production branch redeploy the site automatically.

Vercel setup reference: [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

The **Share this view** button shares the current model's URL. Visitors use drag to orbit, scroll/pinch to zoom, right-drag or two-finger drag to pan, or the on-screen zoom buttons. Keyboard users can focus the canvas and use arrow keys to pan. Automatic rotation starts disabled and animations honor the device's reduced-motion preference. Compression decoders are bundled locally, so viewing does not rely on a third-party decoder CDN.
