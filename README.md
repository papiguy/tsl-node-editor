# TSL Node Editor

A visual node-graph editor for building [Three.js Shading Language (TSL)](https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language) materials with real-time WebGPU preview and glTF export. Built with React 19, TypeScript, Three.js r182, and Vite 7.

**[Live Demo](https://takahirox.github.io/tsl-node-editor/)**

## Features

- Visual node graph for composing TSL materials
- Real-time WebGPU preview with multiple geometry options
- Multiple material types: Standard, Physical, Basic, Toon, Phong, Matcap, and Normal
- TSL code generation with live code viewer
- Export to TSL code, material code, full app code (JS/TS), and glTF
- Reusable function nodes for sub-graph composition
- Graph persistence via IndexedDB with named save slots
- Undo/redo history
- GLTF geometry, material, and texture import nodes
- KTX2 texture support via Basis Universal transcoder
- 185+ node types including math, noise, oscillators, gradients, fog, color manipulation, and more
- Customizable presets for quick starting points

## Requirements

- Node.js 18+
- Browser with WebGPU support (Chrome 113+ / Edge 113+)

## Getting Started

```bash
npm install
npm run dev
```

This starts the example app dev server. Open the URL shown in your terminal.

## Monorepo Structure

```
tsl-node-editor/
├── packages/tsl-node-editor/   # Library package (embeddable React component)
│   ├── src/
│   │   ├── TSLNodeEditor.tsx   # Main editor component
│   │   ├── TSLNodeEditor.css   # Editor styles
│   │   ├── viewer.ts           # Standalone WebGPU viewer (iframe, no React)
│   │   ├── tslGltfExporter.ts  # TSL node serialization for glTF
│   │   └── index.ts            # Public exports
│   ├── public/basis/           # KTX2 Basis Universal transcoder assets
│   ├── vite.config.ts          # Vite library mode build config
│   └── package.json
├── examples/
│   ├── basic/                  # Minimal example using the library
│   └── material-editor/        # Advanced example with scene + editor overlay
├── package.json                # npm workspace root
└── eslint.config.js
```

## Using as a Library

### Install

```bash
npm install tsl-node-editor
```

Peer dependencies: `react@^19`, `react-dom@^19`, `three@^0.182`

### Basic Usage

```tsx
import { TSLNodeEditor } from 'tsl-node-editor'
import 'tsl-node-editor/style.css'

function App() {
  return <TSLNodeEditor />
}
```

### With Options

```tsx
import { TSLNodeEditor, EXAMPLE_GRAPH_PRESET } from 'tsl-node-editor'
import 'tsl-node-editor/style.css'

<TSLNodeEditor
  className="my-editor"
  style={{ height: '100vh' }}
  viewerUrl="/viewer.html"
  basisPath="/basis/"
  initialGraph={EXAMPLE_GRAPH_PRESET.graph}
  disablePersistence
  onChange={({ tslCode, materialCode, appCode, graph }) => {
    console.log(tslCode)
  }}
/>
```

### Props

| Prop | Type | Description |
|------|------|-------------|
| `className` | `string` | CSS class for the root element |
| `style` | `React.CSSProperties` | Inline styles for the root element |
| `viewerUrl` | `string` | URL for the glTF viewer iframe |
| `basisPath` | `string` | Path to KTX2 Basis transcoder assets (default: `"/basis/"`) |
| `onChange` | `(output: TSLNodeEditorOutput) => void` | Callback fired when the graph changes |
| `initialGraph` | `TSLNodeEditorGraph` | Initial graph state to load |
| `disablePersistence` | `boolean` | Disable IndexedDB save/load |
| `hideGithubLink` | `boolean` | Hide the GitHub link in the UI |
| `presets` | `TSLNodeEditorPreset[]` | Custom preset graphs available in the UI |

### Exports

| Export | Kind | Description |
|--------|------|-------------|
| `TSLNodeEditor` | Component | The main editor component |
| `EXAMPLE_GRAPH_PRESET` | Constant | Built-in example graph (animated torus) |
| `createDefaultNodeSerializer` | Function | glTF export helper for TSL node serialization |
| `TSLNodeEditorProps` | Type | Props for the editor component |
| `TSLNodeEditorOutput` | Type | Shape of the `onChange` callback argument (`tslCode`, `materialCode`, `appCode`, `graph`) |
| `TSLNodeEditorGraph` | Type | Serializable graph state (nodes, connections, groups, functions) |
| `TSLNodeEditorPreset` | Type | Preset definition (name + graph or URL) |

### Viewer Setup

Consuming apps must serve two additional assets:

1. **`viewer.html`** — A standalone HTML page that loads the library's viewer module. This renders the WebGPU preview in an iframe.
2. **`public/basis/`** — Basis Universal transcoder files (`basis_transcoder.js` and `basis_transcoder.wasm`) for KTX2 texture support.

See `examples/basic/` for a complete working setup.

## Development Commands

```bash
# From root (workspace)
npm run dev           # Start example dev server
npm run build         # Build library, then examples
npm run lint          # ESLint across all packages
npm run preview       # Preview example production build

# Per-package
npm run build -w packages/tsl-node-editor   # Build library only
npm run build -w examples/basic             # Build example only
npm run dev -w examples/basic               # Dev server for basic example
```

## Notes

- This is an experimental project and has not been thoroughly tested.
- Development follows a vibe-coding approach. Pull requests are not accepted.
- Issue reports and feature requests are welcome at [GitHub Issues](https://github.com/takahirox/tsl-node-editor/issues).

## License

MIT
