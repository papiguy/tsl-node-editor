# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TSL Node Editor — a visual node-graph editor for building Three.js Shading Language (TSL) materials with real-time WebGPU preview and glTF export. Built with React 19, TypeScript, Three.js r182 (WebGPU), and Vite 7.

Live demo: https://takahirox.github.io/tsl-node-editor/

**This is an experimental vibe-coded project.** No test suite exists. No PR workflow — issue reports and feature requests only.

## Monorepo Structure

```
tsl-node-editor/
├── packages/tsl-node-editor/   # Library package (embeddable component)
│   ├── src/
│   │   ├── TSLNodeEditor.tsx   # Main editor component (~18k lines)
│   │   ├── TSLNodeEditor.css   # Editor styles
│   │   ├── viewer.ts           # Standalone WebGPU viewer (no React)
│   │   ├── tslGltfExporter.ts  # TSL node serialization for glTF
│   │   └── index.ts            # Public exports
│   ├── public/basis/            # KTX2 transcoder assets
│   ├── vite.config.ts           # Library mode build
│   └── package.json             # peerDeps: react, react-dom, three
├── examples/basic/              # Demo app using the library
│   ├── src/App.tsx              # <TSLNodeEditor /> usage example
│   └── vite.config.ts           # Multi-entry (main + viewer)
├── package.json                 # npm workspace root
└── eslint.config.js
```

## Commands

```bash
# From root (workspace)
npm run dev       # Start example dev server
npm run build     # Build library, then example
npm run lint      # ESLint across all packages
npm run preview   # Preview example production build

# Per-package
npm run build -w packages/tsl-node-editor   # Build library only
npm run build -w examples/basic             # Build example only
npm run dev -w examples/basic               # Dev server for example
```

## Library Usage

```tsx
import { TSLNodeEditor } from 'tsl-node-editor'
import 'tsl-node-editor/style.css'

// Zero-config usage
<TSLNodeEditor />

// With options
<TSLNodeEditor
  className="my-editor"
  style={{ height: '100vh' }}
  viewerUrl="/viewer.html"
  basisPath="/basis/"
  onChange={({ tslCode, materialCode, appCode }) => {
    console.log(tslCode)
  }}
/>
```

**Props:** `className`, `style`, `viewerUrl` (iframe src for glTF viewer), `basisPath` (KTX2 transcoder path, default `/basis/`), `onChange` (callback receiving `TSLNodeEditorOutput` with `tslCode`, `materialCode`, `appCode`).

**Exports:** `TSLNodeEditor` (component), `TSLNodeEditorProps`, `TSLNodeEditorOutput` (types), `createDefaultNodeSerializer` (glTF export helper).

Consuming apps must also serve `viewer.html` (using the library's exported viewer module) and `public/basis/` transcoder assets.

## Architecture

### TSLNodeEditor.tsx — The Monolith (~18k lines)

Nearly all editor logic lives in a single component. Key systems:

- **Node graph state** — `nodes: GraphNode[]`, `connections: GraphConnection[]`, `groups: GraphGroup[]` managed via `useState`. Connections keyed as `"nodeId:pinName"` in `ConnectionMap`.
- **TSL code generation** — `buildExpr()` / `buildTslNode()` walk the graph recursively from output nodes. Expression kinds (`ExprKind`: color, number, vec2-4, mat2-4) tracked for type checking. 185+ node types across categories: math, noise, oscillators, gradients, fog, color manipulation, normal mapping, and more.
- **Material pipeline** — Output node type determines material: `MeshStandardNodeMaterial`, `MeshPhysicalNodeMaterial`, `MeshBasicNodeMaterial`, `MeshToonNodeMaterial`, `MeshPhongNodeMaterial`, `MeshMatcapNodeMaterial`, or `MeshNormalNodeMaterial`.
- **WebGPU preview** — `WebGPURenderer` renders a scene with the generated material. Uniforms update per-frame for animation.
- **Function system** — `FunctionDefinition` allows reusable sub-graphs. `expandFunctions()` inlines them during code generation.
- **Persistence** — IndexedDB (`dbName: 'tsl-node-editor'`) stores named graph slots.
- **History** — Undo/redo stack for node/connection/group state.
- **Export** — TSL code, material code, full app code (JS/TS), and glTF (via `@takahirox/gltf-three-materials-tsl-exporter`).

### Core Types (top of TSLNodeEditor.tsx)

| Type | Purpose |
|------|---------|
| `GraphNode` | Node instance with position, type, I/O pins, optional values |
| `GraphConnection` | Directed edge between `{nodeId, pin}` pairs |
| `GraphGroup` | Visual grouping of nodes (collapsible) |
| `FunctionDefinition` | Reusable sub-graph with named input/output pins |
| `ExprKind` / `ExprResult` | Type tracking for TSL expression generation |
| `UniformEntry` | Uniform with update mode (manual/frame/render/object) and source |

### viewer.ts

Standalone WebGPU viewer loaded in iframe. Communicates via `postMessage`. Handles texture loading (including KTX2), geometry selection, per-frame uniform updates. No React dependency.

### tslGltfExporter.ts

`createDefaultNodeSerializer()` maps Three.js TSL node types to `{op, args, links}` export format.

## Key Patterns

- **Connection lookup**: `Map<"nodeId:pinName", GraphConnection>` for O(1) input lookups during graph traversal.
- **Three.js WebGPU imports**: `from 'three/webgpu'` for renderer/materials, `from 'three/tsl'` for TSL functions, `from 'three'` for standard types.
- **Expression kind propagation**: Every node operation returns an `ExprKind` for type validation and coercion.
- **Library build**: Vite library mode. React and Three.js are externalized as peer dependencies.

## Deployment

GitHub Actions (`.github/workflows/deploy.yml`) — push to `main` triggers: `npm ci` → build library → build example → deploy `examples/basic/dist/` to GitHub Pages. Node 20.19.0.
