import type { TSLNodeEditorPreset } from 'tsl-node-editor'
import { EXAMPLE_GRAPH_PRESET } from 'tsl-node-editor'

const solidColorPreset: TSLNodeEditorPreset = {
  name: 'Solid Color',
  description: 'Simple colored material',
  graph: {
    nodes: [
      { id: 'color-1', type: 'color', label: 'Color', x: 60, y: 120, inputs: [], outputs: ['color'], value: '#4fb3c8' },
      { id: 'output-1', type: 'output', label: 'Fragment Output', x: 400, y: 120, inputs: ['baseColor', 'roughness', 'metalness'], outputs: [] },
    ],
    connections: [
      { id: 'conn-1', from: { nodeId: 'color-1', pin: 'color' }, to: { nodeId: 'output-1', pin: 'baseColor' } },
    ],
    groups: [],
    functions: {},
  },
}

const checkerboardPreset: TSLNodeEditorPreset = {
  name: 'Checkerboard',
  description: 'UV-based checker pattern',
  graph: {
    nodes: [
      { id: 'uv-1', type: 'uv', label: 'UV', x: 60, y: 120, inputs: [], outputs: ['value'] },
      { id: 'checker-1', type: 'checker', label: 'Checker', x: 320, y: 120, inputs: ['coord'], outputs: ['value'] },
      { id: 'output-1', type: 'output', label: 'Fragment Output', x: 580, y: 120, inputs: ['baseColor', 'roughness', 'metalness'], outputs: [] },
    ],
    connections: [
      { id: 'conn-1', from: { nodeId: 'uv-1', pin: 'value' }, to: { nodeId: 'checker-1', pin: 'coord' } },
      { id: 'conn-2', from: { nodeId: 'checker-1', pin: 'value' }, to: { nodeId: 'output-1', pin: 'baseColor' } },
    ],
    groups: [],
    functions: {},
  },
}

export const materialEditorDefaultGraph = checkerboardPreset.graph

export const materialEditorDefaultMaterialCode = [
  "import { TSL } from 'three/tsl';",
  "import { MeshStandardNodeMaterial } from 'three/webgpu';",
  '',
  'export const textureIds = [];',
  '',
  'export const makeNodeMaterial = (options = {}) => {',
  '  const timeUniform = options.timeUniform ?? TSL.uniform(0);',
  '  const textureFromNode = (_id) => null;',
  '',
  '  const material = (() => {',
  '    const { checker, float, uv, vec3 } = TSL;',
  '    const material = new MeshStandardNodeMaterial();',
  '    const num_1 = checker(uv());',
  '    material.colorNode = vec3(num_1, num_1, num_1);',
  '    material.roughnessNode = float(0.7);',
  '    material.metalnessNode = float(0.1);',
  '    return material;',
  '  })();',
  '  return { material, uniforms: { time: timeUniform } };',
  '};',
].join('\n')

const toonPreset: TSLNodeEditorPreset = {
  name: 'Toon Shading',
  description: 'Cel-shaded toon material with emissive glow',
  graph: {
    nodes: [
      { id: 'color-1', type: 'color', label: 'Color', x: 60, y: 80, inputs: [], outputs: ['color'], value: '#e06040' },
      { id: 'emissive-1', type: 'color', label: 'Color', x: 60, y: 220, inputs: [], outputs: ['color'], value: '#301010' },
      { id: 'toon-1', type: 'toonMaterial', label: 'ToonMaterial', x: 340, y: 120, inputs: ['baseColor', 'baseColorTexture', 'emissive', 'emissiveMap', 'emissiveIntensity', 'normalMap', 'normalScale', 'opacity', 'alphaTest', 'alphaHash'], outputs: ['baseColor'] },
      { id: 'output-1', type: 'output', label: 'Fragment Output', x: 640, y: 120, inputs: ['baseColor', 'roughness', 'metalness'], outputs: [] },
    ],
    connections: [
      { id: 'conn-1', from: { nodeId: 'color-1', pin: 'color' }, to: { nodeId: 'toon-1', pin: 'baseColor' } },
      { id: 'conn-2', from: { nodeId: 'emissive-1', pin: 'color' }, to: { nodeId: 'toon-1', pin: 'emissive' } },
      { id: 'conn-3', from: { nodeId: 'toon-1', pin: 'baseColor' }, to: { nodeId: 'output-1', pin: 'baseColor' } },
    ],
    groups: [],
    functions: {},
  },
}

const phongPreset: TSLNodeEditorPreset = {
  name: 'Phong Specular',
  description: 'Phong material with specular highlights',
  graph: {
    nodes: [
      { id: 'color-1', type: 'color', label: 'Color', x: 60, y: 80, inputs: [], outputs: ['color'], value: '#3080d0' },
      { id: 'specular-1', type: 'color', label: 'Color', x: 60, y: 220, inputs: [], outputs: ['color'], value: '#ffffff' },
      { id: 'shininess-1', type: 'number', label: 'Number', x: 60, y: 360, inputs: [], outputs: ['value'], value: 30 },
      { id: 'phong-1', type: 'phongMaterial', label: 'PhongMaterial', x: 340, y: 120, inputs: ['baseColor', 'baseColorTexture', 'specular', 'shininess', 'emissive', 'emissiveMap', 'emissiveIntensity', 'normalMap', 'normalScale', 'opacity', 'alphaTest', 'alphaHash'], outputs: ['baseColor'] },
      { id: 'output-1', type: 'output', label: 'Fragment Output', x: 640, y: 120, inputs: ['baseColor', 'roughness', 'metalness'], outputs: [] },
    ],
    connections: [
      { id: 'conn-1', from: { nodeId: 'color-1', pin: 'color' }, to: { nodeId: 'phong-1', pin: 'baseColor' } },
      { id: 'conn-2', from: { nodeId: 'specular-1', pin: 'color' }, to: { nodeId: 'phong-1', pin: 'specular' } },
      { id: 'conn-3', from: { nodeId: 'shininess-1', pin: 'value' }, to: { nodeId: 'phong-1', pin: 'shininess' } },
      { id: 'conn-4', from: { nodeId: 'phong-1', pin: 'baseColor' }, to: { nodeId: 'output-1', pin: 'baseColor' } },
    ],
    groups: [],
    functions: {},
  },
}

const matcapPreset: TSLNodeEditorPreset = {
  name: 'Matcap',
  description: 'Matcap material with color',
  graph: {
    nodes: [
      { id: 'color-1', type: 'color', label: 'Color', x: 60, y: 120, inputs: [], outputs: ['color'], value: '#c0a080' },
      { id: 'matcap-1', type: 'matcapMaterial', label: 'MatcapMaterial', x: 340, y: 120, inputs: ['baseColor', 'baseColorTexture', 'normalMap', 'normalScale', 'opacity', 'alphaTest', 'alphaHash'], outputs: ['baseColor'] },
      { id: 'output-1', type: 'output', label: 'Fragment Output', x: 640, y: 120, inputs: ['baseColor', 'roughness', 'metalness'], outputs: [] },
    ],
    connections: [
      { id: 'conn-1', from: { nodeId: 'color-1', pin: 'color' }, to: { nodeId: 'matcap-1', pin: 'baseColor' } },
      { id: 'conn-2', from: { nodeId: 'matcap-1', pin: 'baseColor' }, to: { nodeId: 'output-1', pin: 'baseColor' } },
    ],
    groups: [],
    functions: {},
  },
}

const normalPreset: TSLNodeEditorPreset = {
  name: 'Normal Debug',
  description: 'Normal material for debug visualization',
  graph: {
    nodes: [
      { id: 'normal-1', type: 'normalMaterial', label: 'NormalMaterial', x: 200, y: 120, inputs: ['normalMap', 'normalScale', 'opacity', 'alphaTest', 'alphaHash'], outputs: ['baseColor'] },
      { id: 'output-1', type: 'output', label: 'Fragment Output', x: 500, y: 120, inputs: ['baseColor', 'roughness', 'metalness'], outputs: [] },
    ],
    connections: [
      { id: 'conn-1', from: { nodeId: 'normal-1', pin: 'baseColor' }, to: { nodeId: 'output-1', pin: 'baseColor' } },
    ],
    groups: [],
    functions: {},
  },
}

export const materialEditorPresets: TSLNodeEditorPreset[] = [
  solidColorPreset,
  checkerboardPreset,
  toonPreset,
  phongPreset,
  matcapPreset,
  normalPreset,
  EXAMPLE_GRAPH_PRESET,
]
