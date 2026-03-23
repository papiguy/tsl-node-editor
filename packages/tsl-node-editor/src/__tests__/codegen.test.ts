import { describe, it, expect } from 'vitest'
import {
  buildNodeMap,
  buildConnectionMap,
  expandFunctions,
  combineTypes,
  resolveVectorOutputKind,
  isVectorKind,
  isMatrixKind,
  normalizeKind,
  parseNumber,
  buildExecutableTSL,
  type GraphNode,
  type GraphConnection,
  type FunctionDefinition,
} from '../codegen'

// ---------------------------------------------------------------------------
// Helper: create a minimal GraphNode
// ---------------------------------------------------------------------------
const node = (
  id: string,
  type: string,
  inputs: string[],
  outputs: string[],
  value?: string | number,
): GraphNode => ({
  id,
  type,
  label: type,
  x: 0,
  y: 0,
  inputs,
  outputs,
  value,
})

// ---------------------------------------------------------------------------
// Helper: create a GraphConnection
// ---------------------------------------------------------------------------
const conn = (
  id: string,
  fromNodeId: string,
  fromPin: string,
  toNodeId: string,
  toPin: string,
): GraphConnection => ({
  id,
  from: { nodeId: fromNodeId, pin: fromPin },
  to: { nodeId: toNodeId, pin: toPin },
})

// =========================================================================
// A. Utility function tests
// =========================================================================
describe('Utility functions', () => {
  describe('buildNodeMap', () => {
    it('creates a Map from a node array, lookup by id works', () => {
      const n1 = node('a', 'number', [], ['value'], 5)
      const n2 = node('b', 'color', [], ['color'], '#ff0000')
      const map = buildNodeMap([n1, n2])

      expect(map.size).toBe(2)
      expect(map.get('a')).toBe(n1)
      expect(map.get('b')).toBe(n2)
      expect(map.get('nonexistent')).toBeUndefined()
    })

    it('returns empty map for empty array', () => {
      const map = buildNodeMap([])
      expect(map.size).toBe(0)
    })
  })

  describe('buildConnectionMap', () => {
    it('creates a Map indexed by "targetNodeId:targetPin"', () => {
      const c1 = conn('c1', 'a', 'value', 'b', 'input')
      const c2 = conn('c2', 'x', 'color', 'y', 'baseColor')
      const map = buildConnectionMap([c1, c2])

      expect(map.size).toBe(2)
      expect(map.get('b:input')).toBe(c1)
      expect(map.get('y:baseColor')).toBe(c2)
      expect(map.get('a:value')).toBeUndefined()
    })
  })

  describe('expandFunctions', () => {
    it('returns nodes and connections unchanged when no function nodes exist', () => {
      const nodes = [node('a', 'number', [], ['value'], 1)]
      const connections = [conn('c1', 'a', 'value', 'b', 'input')]
      const result = expandFunctions(nodes, connections, {})

      expect(result.nodes).toBe(nodes)
      expect(result.connections).toBe(connections)
    })

    it('inlines function definition nodes into the graph', () => {
      const fnDef: FunctionDefinition = {
        id: 'fn1',
        name: 'myFunc',
        nodes: [
          node('inner1', 'functionInput', [], ['value']),
          node('inner2', 'number', [], ['value'], 42),
          node('inner3', 'functionOutput', ['value'], []),
        ],
        connections: [
          conn('fc1', 'inner2', 'value', 'inner3', 'value'),
        ],
        inputs: [{ name: 'a', nodeId: 'inner1' }],
        outputs: [{ name: 'out', nodeId: 'inner3' }],
      }

      const nodes = [
        node('n1', 'number', [], ['value'], 10),
        { ...node('fnCall', 'function', ['a'], ['out']), functionId: 'fn1' },
        node('out', 'output', ['baseColor'], []),
      ]
      const connections = [
        conn('c1', 'n1', 'value', 'fnCall', 'a'),
        conn('c2', 'fnCall', 'out', 'out', 'baseColor'),
      ]

      const result = expandFunctions(nodes, connections, { fn1: fnDef })

      // function node itself should be removed
      expect(result.nodes.find((n) => n.type === 'function')).toBeUndefined()
      // inner nodes should be present with prefixed ids
      expect(result.nodes.find((n) => n.id === 'fn-fnCall-inner2')).toBeDefined()
      // Expanded connections should wire through the inlined nodes
      expect(result.connections.length).toBeGreaterThan(0)
    })
  })

  describe('combineTypes', () => {
    it('number + number = number', () => {
      expect(combineTypes('number', 'number')).toBe('number')
    })

    it('number + color = color', () => {
      expect(combineTypes('number', 'color')).toBe('color')
    })

    it('number + vec2 = vec2', () => {
      expect(combineTypes('number', 'vec2')).toBe('vec2')
    })

    it('vec3 + vec3 = vec3', () => {
      expect(combineTypes('vec3', 'vec3')).toBe('vec3')
    })

    it('vec2 + vec3 = unknown', () => {
      expect(combineTypes('vec2', 'vec3')).toBe('unknown')
    })

    it('mat3 + number = unknown', () => {
      expect(combineTypes('mat3', 'number')).toBe('unknown')
    })

    it('color + number = color', () => {
      expect(combineTypes('color', 'number')).toBe('color')
    })

    it('vec4 + vec4 = vec4', () => {
      expect(combineTypes('vec4', 'vec4')).toBe('vec4')
    })
  })

  describe('resolveVectorOutputKind', () => {
    it('all numbers returns number', () => {
      expect(resolveVectorOutputKind(['number', 'number'])).toBe('number')
    })

    it('number and color returns color', () => {
      expect(resolveVectorOutputKind(['number', 'color'])).toBe('color')
    })

    it('number and vec2 returns vec2', () => {
      expect(resolveVectorOutputKind(['number', 'vec2'])).toBe('vec2')
    })

    it('vec3 and vec3 returns vec3', () => {
      expect(resolveVectorOutputKind(['vec3', 'vec3'])).toBe('vec3')
    })

    it('vec2 and vec3 returns unknown', () => {
      expect(resolveVectorOutputKind(['vec2', 'vec3'])).toBe('unknown')
    })

    it('mat3 in inputs returns unknown', () => {
      expect(resolveVectorOutputKind(['mat3', 'number'])).toBe('unknown')
    })

    it('color and vec3 returns unknown (ambiguous)', () => {
      expect(resolveVectorOutputKind(['color', 'vec3'])).toBe('unknown')
    })

    it('color and color returns color', () => {
      expect(resolveVectorOutputKind(['color', 'color'])).toBe('color')
    })
  })

  describe('isVectorKind', () => {
    it('returns true for color', () => {
      expect(isVectorKind('color')).toBe(true)
    })

    it('returns true for vec2', () => {
      expect(isVectorKind('vec2')).toBe(true)
    })

    it('returns true for vec3', () => {
      expect(isVectorKind('vec3')).toBe(true)
    })

    it('returns true for vec4', () => {
      expect(isVectorKind('vec4')).toBe(true)
    })

    it('returns false for number', () => {
      expect(isVectorKind('number')).toBe(false)
    })

    it('returns false for mat3', () => {
      expect(isVectorKind('mat3')).toBe(false)
    })

    it('returns false for mat4', () => {
      expect(isVectorKind('mat4')).toBe(false)
    })
  })

  describe('isMatrixKind', () => {
    it('returns true for mat2', () => {
      expect(isMatrixKind('mat2')).toBe(true)
    })

    it('returns true for mat3', () => {
      expect(isMatrixKind('mat3')).toBe(true)
    })

    it('returns true for mat4', () => {
      expect(isMatrixKind('mat4')).toBe(true)
    })

    it('returns false for number', () => {
      expect(isMatrixKind('number')).toBe(false)
    })

    it('returns false for vec3', () => {
      expect(isMatrixKind('vec3')).toBe(false)
    })

    it('returns false for color', () => {
      expect(isMatrixKind('color')).toBe(false)
    })
  })

  describe('normalizeKind', () => {
    it('passes through valid kinds unchanged', () => {
      expect(normalizeKind('number')).toBe('number')
      expect(normalizeKind('color')).toBe('color')
      expect(normalizeKind('vec2')).toBe('vec2')
      expect(normalizeKind('vec3')).toBe('vec3')
      expect(normalizeKind('vec4')).toBe('vec4')
      expect(normalizeKind('mat2')).toBe('mat2')
      expect(normalizeKind('mat3')).toBe('mat3')
      expect(normalizeKind('mat4')).toBe('mat4')
      expect(normalizeKind('unknown')).toBe('unknown')
    })

    it('returns unknown for invalid kinds', () => {
      expect(normalizeKind('bogus')).toBe('unknown')
      expect(normalizeKind('')).toBe('unknown')
      expect(normalizeKind('int')).toBe('unknown')
    })
  })

  describe('parseNumber', () => {
    it('parses string "5" to 5', () => {
      expect(parseNumber('5')).toBe(5)
    })

    it('returns number 3 as-is', () => {
      expect(parseNumber(3)).toBe(3)
    })

    it('returns 0 for empty string', () => {
      expect(parseNumber('')).toBe(0)
    })

    it('returns 0 for undefined', () => {
      expect(parseNumber(undefined)).toBe(0)
    })

    it('returns 0 for NaN-producing string', () => {
      expect(parseNumber('abc')).toBe(0)
    })

    it('parses negative numbers', () => {
      expect(parseNumber('-3.5')).toBe(-3.5)
    })

    it('parses decimal strings', () => {
      expect(parseNumber('0.75')).toBe(0.75)
    })

    it('returns 0 for whitespace-only string', () => {
      expect(parseNumber('   ')).toBe(0)
    })
  })
})

// =========================================================================
// B. Basic code generation tests (buildExecutableTSL)
// =========================================================================
describe('buildExecutableTSL — basic code generation', () => {
  it('empty graph (no nodes) returns default MeshStandardNodeMaterial', () => {
    const result = buildExecutableTSL([], [], {})
    expect(result).toContain('return new MeshStandardNodeMaterial();')
  })

  it('output node only, no baseColor connection returns default material', () => {
    const nodes = [node('out', 'output', ['baseColor', 'roughness', 'metalness'], [])]
    const result = buildExecutableTSL(nodes, [], {})
    expect(result).toContain('return new MeshStandardNodeMaterial();')
  })

  it('color node connected to output baseColor', () => {
    const nodes = [
      node('c1', 'color', [], ['color'], '#ff0000'),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [conn('c-1', 'c1', 'color', 'out', 'baseColor')]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain("color('#ff0000')")
    expect(result).toContain('material.colorNode')
  })

  it('number node connected to multiply then to output', () => {
    const nodes = [
      node('n1', 'number', [], ['value'], 5),
      node('n2', 'number', [], ['value'], 2),
      node('mul', 'multiply', ['a', 'b'], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'n1', 'value', 'mul', 'a'),
      conn('c2', 'n2', 'value', 'mul', 'b'),
      conn('c3', 'mul', 'value', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('float(5.000)')
    expect(result).toContain('float(2.000)')
    expect(result).toContain('.mul(')
  })

  it('time node connected to output', () => {
    const nodes = [
      node('t1', 'time', [], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [conn('c1', 't1', 'value', 'out', 'baseColor')]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('timeUniform')
  })

  it('position attribute node connected to vertex output contains positionLocal', () => {
    const nodes = [
      node('col', 'color', [], ['color'], '#ffffff'),
      node('p1', 'position', [], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
      node('vout', 'vertexOutput', ['position'], []),
    ]
    const connections = [
      conn('c1', 'col', 'color', 'out', 'baseColor'),
      conn('c2', 'p1', 'value', 'vout', 'position'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('positionLocal')
  })
})

// =========================================================================
// C. Math operation tests
// =========================================================================
describe('buildExecutableTSL — math operations', () => {
  it('add two numbers produces .add()', () => {
    const nodes = [
      node('n1', 'number', [], ['value'], 1),
      node('n2', 'number', [], ['value'], 2),
      node('add', 'add', ['a', 'b'], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'n1', 'value', 'add', 'a'),
      conn('c2', 'n2', 'value', 'add', 'b'),
      conn('c3', 'add', 'value', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('.add(')
  })

  it('multiply two numbers produces .mul()', () => {
    const nodes = [
      node('n1', 'number', [], ['value'], 3),
      node('n2', 'number', [], ['value'], 4),
      node('mul', 'multiply', ['a', 'b'], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'n1', 'value', 'mul', 'a'),
      conn('c2', 'n2', 'value', 'mul', 'b'),
      conn('c3', 'mul', 'value', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('.mul(')
  })

  it('sine of number produces sin()', () => {
    const nodes = [
      node('n1', 'number', [], ['value'], 1),
      node('s1', 'sine', ['value'], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'n1', 'value', 's1', 'value'),
      conn('c2', 's1', 'value', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('sin(')
  })

  it('clamp(value, min, max) produces clamp()', () => {
    const nodes = [
      node('v', 'number', [], ['value'], 0.5),
      node('lo', 'number', [], ['value'], 0),
      node('hi', 'number', [], ['value'], 1),
      node('cl', 'clamp', ['value', 'min', 'max'], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'v', 'value', 'cl', 'value'),
      conn('c2', 'lo', 'value', 'cl', 'min'),
      conn('c3', 'hi', 'value', 'cl', 'max'),
      conn('c4', 'cl', 'value', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('clamp(')
  })

  it('mix(a, b, t) produces mix()', () => {
    const nodes = [
      node('a', 'number', [], ['value'], 0),
      node('b', 'number', [], ['value'], 1),
      node('t', 'number', [], ['value'], 0.5),
      node('m', 'mix', ['a', 'b', 't'], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'a', 'value', 'm', 'a'),
      conn('c2', 'b', 'value', 'm', 'b'),
      conn('c3', 't', 'value', 'm', 't'),
      conn('c4', 'm', 'value', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('mix(')
  })
})

// =========================================================================
// D. Vector construction/decomposition tests
// =========================================================================
describe('buildExecutableTSL — vector construction/decomposition', () => {
  it('vec2(x, y) construction contains vec2(', () => {
    const nodes = [
      node('x', 'number', [], ['value'], 1),
      node('y', 'number', [], ['value'], 2),
      node('v2', 'vec2', ['x', 'y'], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'x', 'value', 'v2', 'x'),
      conn('c2', 'y', 'value', 'v2', 'y'),
      conn('c3', 'v2', 'value', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('vec2(')
  })

  it('vec3(x, y, z) construction contains vec3(', () => {
    const nodes = [
      node('x', 'number', [], ['value'], 1),
      node('y', 'number', [], ['value'], 2),
      node('z', 'number', [], ['value'], 3),
      node('v3', 'vec3', ['x', 'y', 'z'], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'x', 'value', 'v3', 'x'),
      conn('c2', 'y', 'value', 'v3', 'y'),
      conn('c3', 'z', 'value', 'v3', 'z'),
      conn('c4', 'v3', 'value', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    // The vec3 constructor call for the node itself
    expect(result).toContain('vec3(')
  })

  it('splitVec3 output x contains .x, output y contains .y', () => {
    const nodes = [
      node('pos', 'position', [], ['value']),
      node('split', 'splitVec3', ['value'], ['x', 'y', 'z']),
      // Connect x output to an add node, then to output — to force both pins to resolve
      node('addN', 'add', ['a', 'b'], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'pos', 'value', 'split', 'value'),
      conn('c2', 'split', 'x', 'addN', 'a'),
      conn('c3', 'split', 'y', 'addN', 'b'),
      conn('c4', 'addN', 'value', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('.x')
    expect(result).toContain('.y')
  })
})

// =========================================================================
// E. Type coercion tests
// =========================================================================
describe('Type coercion', () => {
  it('number + color (add) promotes number with vec3()', () => {
    const nodes = [
      node('n1', 'number', [], ['value'], 0.5),
      node('c1', 'color', [], ['color'], '#00ff00'),
      node('add', 'add', ['a', 'b'], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c-1', 'n1', 'value', 'add', 'a'),
      conn('c-2', 'c1', 'color', 'add', 'b'),
      conn('c-3', 'add', 'value', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    // number is promoted to vec3(n, n, n) for color addition
    expect(result).toContain('vec3(')
  })

  it('combineTypes number + color = color', () => {
    expect(combineTypes('number', 'color')).toBe('color')
  })

  it('combineTypes vec2 + vec3 = unknown', () => {
    expect(combineTypes('vec2', 'vec3')).toBe('unknown')
  })
})

// =========================================================================
// F. Material output tests
// =========================================================================
describe('buildExecutableTSL — material outputs', () => {
  it('standard material with roughness and metalness connections', () => {
    const nodes = [
      node('col', 'color', [], ['color'], '#aabbcc'),
      node('rough', 'number', [], ['value'], 0.4),
      node('metal', 'number', [], ['value'], 0.8),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'col', 'color', 'out', 'baseColor'),
      conn('c2', 'rough', 'value', 'out', 'roughness'),
      conn('c3', 'metal', 'value', 'out', 'metalness'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('roughnessNode')
    expect(result).toContain('metalnessNode')
    expect(result).toContain('MeshStandardNodeMaterial')
  })

  it('basic material node produces MeshBasicNodeMaterial', () => {
    const nodes = [
      node('col', 'color', [], ['color'], '#ffffff'),
      node('basic', 'basicMaterial', ['baseColor'], ['baseColor']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'col', 'color', 'basic', 'baseColor'),
      conn('c2', 'basic', 'baseColor', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('MeshBasicNodeMaterial')
  })

  it('physical material node produces MeshPhysicalNodeMaterial', () => {
    const nodes = [
      node('col', 'color', [], ['color'], '#ffffff'),
      node('phys', 'physicalMaterial', ['baseColor'], ['baseColor']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'col', 'color', 'phys', 'baseColor'),
      conn('c2', 'phys', 'baseColor', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('MeshPhysicalNodeMaterial')
  })

  it('vertex output with position connection contains positionNode', () => {
    const nodes = [
      node('col', 'color', [], ['color'], '#ffffff'),
      node('pos', 'position', [], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
      node('vout', 'vertexOutput', ['position'], []),
    ]
    const connections = [
      conn('c1', 'col', 'color', 'out', 'baseColor'),
      conn('c2', 'pos', 'value', 'vout', 'position'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('positionNode')
  })
})

// =========================================================================
// G. Complex graph test
// =========================================================================
describe('buildExecutableTSL — complex graph', () => {
  it('chain: number -> sin -> multiply(with color) -> output generates valid code', () => {
    const nodes = [
      node('n1', 'number', [], ['value'], 3.14),
      node('s1', 'sine', ['value'], ['value']),
      node('c1', 'color', [], ['color'], '#ff8800'),
      node('mul', 'multiply', ['a', 'b'], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c-1', 'n1', 'value', 's1', 'value'),
      conn('c-2', 's1', 'value', 'mul', 'a'),
      conn('c-3', 'c1', 'color', 'mul', 'b'),
      conn('c-4', 'mul', 'value', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    // The chain should produce all of these elements
    expect(result).toContain('float(3.140)')
    expect(result).toContain('sin(')
    expect(result).toContain("color('#ff8800')")
    expect(result).toContain('.mul(')
    expect(result).toContain('material.colorNode')
    expect(result).toContain('return material;')
  })
})

// =========================================================================
// H. Edge cases
// =========================================================================
describe('buildExecutableTSL — edge cases', () => {
  it('unknown node type falls through to float(0.0) fallback', () => {
    const nodes = [
      node('unk', 'totallyUnknownType', [], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [
      conn('c1', 'unk', 'value', 'out', 'baseColor'),
    ]
    const result = buildExecutableTSL(nodes, connections, {})

    // The fallback for unknown nodes is float(0.0), which gets promoted to
    // a color for the colorNode assignment
    expect(result).toContain('material.colorNode')
    expect(result).toContain('return material;')
  })

  it('disconnected output defaults to standard material', () => {
    const nodes = [
      node('n1', 'number', [], ['value'], 5),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    // n1 exists but is not connected to output
    const result = buildExecutableTSL(nodes, [], {})

    expect(result).toContain('return new MeshStandardNodeMaterial();')
  })

  it('number node with no value defaults to 0', () => {
    const nodes = [
      node('n1', 'number', [], ['value']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [conn('c1', 'n1', 'value', 'out', 'baseColor')]
    const result = buildExecutableTSL(nodes, connections, {})

    expect(result).toContain('float(0.000)')
  })

  it('color node with no value uses default color', () => {
    const nodes = [
      node('c1', 'color', [], ['color']),
      node('out', 'output', ['baseColor', 'roughness', 'metalness'], []),
    ]
    const connections = [conn('c-1', 'c1', 'color', 'out', 'baseColor')]
    const result = buildExecutableTSL(nodes, connections, {})

    // DEFAULT_COLOR is '#4fb3c8'
    expect(result).toContain("color('#4fb3c8')")
  })
})
