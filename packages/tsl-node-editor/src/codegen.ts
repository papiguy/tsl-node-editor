// Types

export type GraphNode = {
  id: string
  type: string
  label: string
  x: number
  y: number
  inputs: string[]
  outputs: string[]
  value?: number | string
  slider?: boolean
  textureKey?: string
  textureName?: string
  assetKey?: string
  assetName?: string
  meshIndex?: string
  materialIndex?: string
  textureIndex?: string
  updateMode?: UniformUpdateMode
  updateSource?: UniformUpdateSource
  functionId?: string
}

export type UniformUpdateMode = 'manual' | 'frame' | 'render' | 'object'
export type UniformUpdateSource =
  | 'value'
  | 'time'
  | 'objectPositionX'
  | 'objectPositionY'
  | 'objectPositionZ'
  | 'objectRotationX'
  | 'objectRotationY'
  | 'objectRotationZ'
  | 'objectScaleX'
  | 'objectScaleY'
  | 'objectScaleZ'
  | 'cameraPositionX'
  | 'cameraPositionY'
  | 'cameraPositionZ'

export type GraphConnection = {
  id: string
  from: { nodeId: string; pin: string }
  to: { nodeId: string; pin: string }
}

export type GraphGroup = {
  id: string
  label: string
  nodeIds: string[]
  collapsed?: boolean
}

export type FunctionPin = {
  name: string
  nodeId: string
}

export type FunctionDefinition = {
  id: string
  name: string
  nodes: GraphNode[]
  connections: GraphConnection[]
  inputs: FunctionPin[]
  outputs: FunctionPin[]
}

// UniformEntry uses Three.js's `uniform` at runtime; kept as `unknown` here
// to avoid importing Three.js into this pure-utility module.
export type UniformEntry = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  uniform: any
  mode: UniformUpdateMode
  source: UniformUpdateSource
  kind: 'number' | 'color'
}

export type NodeMap = Map<string, GraphNode>
export type ConnectionMap = Map<string, GraphConnection>
export type OutputPin = 'baseColor' | 'roughness' | 'metalness'
export type ExprKind = 'color' | 'number' | 'vec2' | 'vec3' | 'vec4' | 'mat2' | 'mat3' | 'mat4'
export type ExprResult = { expr: string; kind: ExprKind }

// Utility functions

export const buildNodeMap = (nodes: GraphNode[]): NodeMap =>
  new Map(nodes.map((node) => [node.id, node]))
export const buildConnectionMap = (connections: GraphConnection[]): ConnectionMap =>
  new Map(
    connections.map((connection) => [
      `${connection.to.nodeId}:${connection.to.pin}`,
      connection,
    ]),
  )

export const expandFunctions = (
  nodes: GraphNode[],
  connections: GraphConnection[],
  functions: Record<string, FunctionDefinition>,
) => {
  const functionNodes = nodes.filter((node) => node.type === 'function' && node.functionId)
  if (!functionNodes.length) {
    return { nodes, connections }
  }

  const expandedNodes = nodes.filter((node) => node.type !== 'function')
  const expandedConnections = connections.filter(
    (connection) =>
      !functionNodes.some(
        (node) =>
          node.id === connection.from.nodeId || node.id === connection.to.nodeId,
      ),
  )

  functionNodes.forEach((fnNode) => {
    const def = fnNode.functionId ? functions[fnNode.functionId] : null
    if (!def) return
    const prefix = `fn-${fnNode.id}-`
    const idMap = new Map(def.nodes.map((node) => [node.id, `${prefix}${node.id}`]))
    const inputMap = new Map(
      def.inputs.map((pin) => [pin.name, idMap.get(pin.nodeId) ?? '']),
    )
    const outputMap = new Map(
      def.outputs.map((pin) => [pin.name, idMap.get(pin.nodeId) ?? '']),
    )
    def.nodes.forEach((node) => {
      const id = idMap.get(node.id)
      if (!id) return
      expandedNodes.push({ ...node, id })
    })
    def.connections.forEach((connection) => {
      const fromId = idMap.get(connection.from.nodeId)
      const toId = idMap.get(connection.to.nodeId)
      if (!fromId || !toId) return
      expandedConnections.push({
        ...connection,
        id: `${prefix}${connection.id}`,
        from: { ...connection.from, nodeId: fromId },
        to: { ...connection.to, nodeId: toId },
      })
    })

    connections.forEach((connection) => {
      if (connection.to.nodeId === fnNode.id) {
        const targetId = inputMap.get(connection.to.pin)
        if (!targetId) return
        expandedConnections.push({
          id: `${prefix}in-${connection.id}`,
          from: connection.from,
          to: { nodeId: targetId, pin: 'value' },
        })
      }
      if (connection.from.nodeId === fnNode.id) {
        const sourceId = outputMap.get(connection.from.pin)
        if (!sourceId) return
        expandedConnections.push({
          id: `${prefix}out-${connection.id}`,
          from: { nodeId: sourceId, pin: 'value' },
          to: connection.to,
        })
      }
    })
  })

  return { nodes: expandedNodes, connections: expandedConnections }
}

export const DEFAULT_COLOR = '#4fb3c8'

export const FALLBACK_COLOR = 0x111316
export const FALLBACK_COLOR_HEX = '#111316'

export const getOutputConnection = (
  connectionMap: ConnectionMap,
  outputNode: GraphNode | undefined,
  pin: OutputPin,
) => (outputNode ? connectionMap.get(`${outputNode.id}:${pin}`) ?? null : null)

export const ATTRIBUTE_NODE_EXPR: Record<string, ExprResult> = {
  position: { expr: 'positionLocal', kind: 'vec3' },
  normal: { expr: 'normalLocal', kind: 'vec3' },
  tangent: { expr: 'tangentLocal', kind: 'vec3' },
  bitangent: { expr: 'bitangentLocal', kind: 'vec3' },
  uv: { expr: 'uv()', kind: 'vec2' },
  uv2: { expr: 'uv(1)', kind: 'vec2' },
  screenUV: { expr: 'screenUV', kind: 'vec2' },
  screenSize: { expr: 'screenSize', kind: 'vec2' },
  viewportUV: { expr: 'viewportUV', kind: 'vec2' },
  depth: { expr: 'depth', kind: 'number' },
  linearDepth: { expr: 'linearDepth', kind: 'number' },
  cameraPosition: { expr: 'cameraPosition', kind: 'vec3' },
  cameraNear: { expr: 'cameraNear', kind: 'number' },
  cameraFar: { expr: 'cameraFar', kind: 'number' },
  positionWorld: { expr: 'positionWorld', kind: 'vec3' },
  positionView: { expr: 'positionView', kind: 'vec3' },
  normalWorld: { expr: 'normalWorld', kind: 'vec3' },
  normalView: { expr: 'normalView', kind: 'vec3' },
  normalFlat: { expr: 'normalFlat', kind: 'vec3' },
  frontFacing: { expr: 'frontFacing', kind: 'number' },
  faceDirection: { expr: 'faceDirection', kind: 'number' },
  matcapUV: { expr: 'matcapUV', kind: 'vec2' },
  deltaTime: { expr: 'deltaTime', kind: 'number' },
  frameId: { expr: 'frameId', kind: 'number' },
  PI: { expr: 'PI', kind: 'number' },
  PI2: { expr: 'PI2', kind: 'number' },
}

export const ATTRIBUTE_NODE_KIND: Record<string, 'vec2' | 'vec3' | 'number'> = {
  position: 'vec3',
  normal: 'vec3',
  tangent: 'vec3',
  bitangent: 'vec3',
  uv: 'vec2',
  uv2: 'vec2',
  screenUV: 'vec2',
  screenSize: 'vec2',
  viewportUV: 'vec2',
  depth: 'number',
  linearDepth: 'number',
  cameraPosition: 'vec3',
  cameraNear: 'number',
  cameraFar: 'number',
  positionWorld: 'vec3',
  positionView: 'vec3',
  normalWorld: 'vec3',
  normalView: 'vec3',
  normalFlat: 'vec3',
  frontFacing: 'number',
  faceDirection: 'number',
  matcapUV: 'vec2',
  deltaTime: 'number',
  frameId: 'number',
  PI: 'number',
  PI2: 'number',
}

export const getAttributeExpr = (nodeType: string): ExprResult | null =>
  ATTRIBUTE_NODE_EXPR[nodeType] ?? null
export const getAttributeKind = (nodeType: string): 'vec2' | 'vec3' | 'number' | null =>
  ATTRIBUTE_NODE_KIND[nodeType] ?? null

export const parseNumber = (value: number | string | undefined) => {
  if (typeof value === 'number') return value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return 0
    const parsed = Number(trimmed)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

export const numberUpdateModes: { value: UniformUpdateMode; label: string }[] = [
  { value: 'manual', label: 'Manual' },
  { value: 'frame', label: 'Frame' },
  { value: 'object', label: 'Object' },
  { value: 'render', label: 'Render' },
]

export const numberUpdateSources: Record<
  UniformUpdateMode,
  { value: UniformUpdateSource; label: string }[]
> = {
  manual: [{ value: 'value', label: 'Value' }],
  frame: [{ value: 'time', label: 'Time (seconds)' }],
  object: [
    { value: 'objectPositionX', label: 'Object Position X' },
    { value: 'objectPositionY', label: 'Object Position Y' },
    { value: 'objectPositionZ', label: 'Object Position Z' },
    { value: 'objectRotationX', label: 'Object Rotation X' },
    { value: 'objectRotationY', label: 'Object Rotation Y' },
    { value: 'objectRotationZ', label: 'Object Rotation Z' },
    { value: 'objectScaleX', label: 'Object Scale X' },
    { value: 'objectScaleY', label: 'Object Scale Y' },
    { value: 'objectScaleZ', label: 'Object Scale Z' },
  ],
  render: [
    { value: 'cameraPositionX', label: 'Camera Position X' },
    { value: 'cameraPositionY', label: 'Camera Position Y' },
    { value: 'cameraPositionZ', label: 'Camera Position Z' },
  ],
}

export const getNumberUpdateMode = (node: GraphNode): UniformUpdateMode => {
  const mode = node.updateMode
  return numberUpdateModes.some((entry) => entry.value === mode)
    ? (mode as UniformUpdateMode)
    : 'manual'
}

export const getDefaultNumberUpdateSource = (mode: UniformUpdateMode): UniformUpdateSource =>
  numberUpdateSources[mode]?.[0]?.value ?? 'value'

export const getNumberUpdateSource = (
  node: GraphNode,
  mode: UniformUpdateMode,
): UniformUpdateSource => {
  const source = node.updateSource
  const options = numberUpdateSources[mode] ?? numberUpdateSources.manual
  return options.some((entry) => entry.value === source)
    ? (source as UniformUpdateSource)
    : getDefaultNumberUpdateSource(mode)
}

export const getObjectUpdateExpr = (source: UniformUpdateSource) => {
  switch (source) {
    case 'objectPositionX':
      return 'object.position.x'
    case 'objectPositionY':
      return 'object.position.y'
    case 'objectPositionZ':
      return 'object.position.z'
    case 'objectRotationX':
      return 'object.rotation.x'
    case 'objectRotationY':
      return 'object.rotation.y'
    case 'objectRotationZ':
      return 'object.rotation.z'
    case 'objectScaleX':
      return 'object.scale.x'
    case 'objectScaleY':
      return 'object.scale.y'
    case 'objectScaleZ':
      return 'object.scale.z'
    default:
      return '0'
  }
}

export const getCameraUpdateExpr = (source: UniformUpdateSource) => {
  switch (source) {
    case 'cameraPositionX':
      return 'camera.position.x'
    case 'cameraPositionY':
      return 'camera.position.y'
    case 'cameraPositionZ':
      return 'camera.position.z'
    default:
      return '0'
  }
}

export const appendNumberUniformUpdate = (
  decls: string[],
  uniformName: string,
  node: GraphNode,
) => {
  const mode = getNumberUpdateMode(node)
  if (mode === 'manual') return
  const source = getNumberUpdateSource(node, mode)
  if (mode === 'frame') {
    decls.push(`${uniformName}.onFrameUpdate(() => performance.now() / 1000);`)
    return
  }
  if (mode === 'object') {
    const expr = getObjectUpdateExpr(source)
    decls.push(
      `${uniformName}.onObjectUpdate(({ object }) => (object ? ${expr} : 0));`,
    )
    return
  }
  if (mode === 'render') {
    const expr = getCameraUpdateExpr(source)
    decls.push(
      `${uniformName}.onRenderUpdate(({ camera }) => (camera ? ${expr} : 0));`,
    )
  }
}

export type ValueKind =
  | 'number'
  | 'color'
  | 'vec2'
  | 'vec3'
  | 'vec4'
  | 'mat2'
  | 'mat3'
  | 'mat4'
  | 'unknown'

export const isVectorKind = (kind: string) =>
  kind === 'color' || kind === 'vec2' || kind === 'vec3' || kind === 'vec4'

export const isMatrixKind = (kind: string) =>
  kind === 'mat2' || kind === 'mat3' || kind === 'mat4'

export const getVectorKind = (kind: string): 'vec2' | 'vec3' | 'vec4' | null => {
  if (kind === 'vec2') return 'vec2'
  if (kind === 'vec3' || kind === 'color') return 'vec3'
  if (kind === 'vec4') return 'vec4'
  return null
}

export const resolveVectorOutputKind = (kinds: string[]): ValueKind => {
  if (kinds.some((kind) => isMatrixKind(kind))) return 'unknown'
  let vectorKind: 'vec2' | 'vec3' | 'vec4' | null = null
  let hasColor = false
  let hasNonColorVec3 = false
  for (const rawKind of kinds) {
    const kind = normalizeKind(rawKind)
    if (kind === 'color') {
      hasColor = true
    } else if (kind === 'vec3') {
      hasNonColorVec3 = true
    }
    const mapped = getVectorKind(kind)
    if (!mapped) continue
    if (!vectorKind) {
      vectorKind = mapped
    } else if (vectorKind !== mapped) {
      return 'unknown'
    }
  }
  if (hasColor && hasNonColorVec3) return 'unknown'
  if (!vectorKind) return 'number'
  if (hasColor && vectorKind === 'vec3') return 'color'
  return vectorKind
}

export const isAssignableType = (actual: string, expected: string) => {
  if (expected === 'any') return true
  if (expected === 'vector') return isVectorKind(actual)
  if (expected === 'vector3') return actual === 'vec3' || actual === 'color'
  if (expected === 'matrix') return isMatrixKind(actual)
  if (expected === 'mat2' && actual === 'mat2') return true
  if (expected === 'mat3' && actual === 'mat3') return true
  if (expected === 'mat4' && actual === 'mat4') return true
  if (actual === 'unknown') return true
  if (actual === expected) return true
  if (
    actual === 'number' &&
    (expected === 'color' ||
      expected === 'vec2' ||
      expected === 'vec3' ||
      expected === 'vec4')
  ) {
    return true
  }
  return false
}

export const normalizeKind = (value: string): ValueKind => {
  if (
    value === 'number' ||
    value === 'color' ||
    value === 'vec2' ||
    value === 'vec3' ||
    value === 'vec4' ||
    value === 'mat2' ||
    value === 'mat3' ||
    value === 'mat4' ||
    value === 'unknown'
  ) {
    return value
  }
  return 'unknown'
}

export const combineTypes = (left: string, right: string): ValueKind => {
  const leftKind = normalizeKind(left)
  const rightKind = normalizeKind(right)
  if (isMatrixKind(leftKind) || isMatrixKind(rightKind)) return 'unknown'
  if (leftKind === 'unknown' || rightKind === 'unknown') return 'unknown'
  if (leftKind === 'number') return rightKind
  if (rightKind === 'number') return leftKind
  if (leftKind === rightKind) return leftKind
  return 'unknown'
}

export const getMaterialKindFromOutput = (
  outputNode: GraphNode | undefined,
  nodeMap: NodeMap,
  connectionMap: ConnectionMap,
) => {
  if (!outputNode) return 'standard' as const
  const baseColorConn = connectionMap.get(`${outputNode.id}:baseColor`)
  if (!baseColorConn) return 'standard' as const
  const source = nodeMap.get(baseColorConn.from.nodeId)
  if (source?.type === 'basicMaterial') return 'basic' as const
  if (source?.type === 'physicalMaterial') return 'physical' as const
  if (source?.type === 'toonMaterial') return 'toon' as const
  if (source?.type === 'phongMaterial') return 'phong' as const
  if (source?.type === 'matcapMaterial') return 'matcap' as const
  if (source?.type === 'normalMaterial') return 'normal' as const
  return 'standard' as const
}

export const getMaterialNodesFromOutput = (
  outputNode: GraphNode | undefined,
  nodeMap: NodeMap,
  connectionMap: ConnectionMap,
) => {
  if (!outputNode) {
    return {
      standardMaterialNode: null as GraphNode | null,
      physicalMaterialNode: null as GraphNode | null,
      basicMaterialNode: null as GraphNode | null,
      toonMaterialNode: null as GraphNode | null,
      phongMaterialNode: null as GraphNode | null,
      matcapMaterialNode: null as GraphNode | null,
      normalMaterialNode: null as GraphNode | null,
    }
  }
  const baseColorConn = connectionMap.get(`${outputNode.id}:baseColor`)
  const source = baseColorConn ? nodeMap.get(baseColorConn.from.nodeId) : null
  return {
    standardMaterialNode: source?.type === 'material' ? source : null,
    physicalMaterialNode: source?.type === 'physicalMaterial' ? source : null,
    basicMaterialNode: source?.type === 'basicMaterial' ? source : null,
    toonMaterialNode: source?.type === 'toonMaterial' ? source : null,
    phongMaterialNode: source?.type === 'phongMaterial' ? source : null,
    matcapMaterialNode: source?.type === 'matcapMaterial' ? source : null,
    normalMaterialNode: source?.type === 'normalMaterial' ? source : null,
  }
}

export const buildExecutableTSL = (
  nodes: GraphNode[],
  connections: GraphConnection[],
  functions: Record<string, FunctionDefinition>,
): string => {
  const expanded = expandFunctions(nodes, connections, functions)
  const nodeMap = buildNodeMap(expanded.nodes)
  const connectionMap = buildConnectionMap(expanded.connections)
  const graphNodes = expanded.nodes

  const outputNode = graphNodes.find((node) => node.type === 'output')
  const vertexOutputNode = graphNodes.find((node) => node.type === 'vertexOutput')
  if (!outputNode) {
    return `return new MeshStandardNodeMaterial();`
  }

  const baseColorConn = getOutputConnection(connectionMap, outputNode, 'baseColor')
  if (!baseColorConn) {
    return `return new MeshStandardNodeMaterial();`
  }

  const materialKind = getMaterialKindFromOutput(outputNode, nodeMap, connectionMap)
  const materialClassMap: Record<string, string> = {
    basic: 'MeshBasicNodeMaterial',
    physical: 'MeshPhysicalNodeMaterial',
    toon: 'MeshToonNodeMaterial',
    phong: 'MeshPhongNodeMaterial',
    matcap: 'MeshMatcapNodeMaterial',
    normal: 'MeshNormalNodeMaterial',
  }
  const materialClass = materialClassMap[materialKind] ?? 'MeshStandardNodeMaterial'

  const tslImportNames = [
    'acesFilmicToneMapping',
    'abs',
    'acos',
    'agxToneMapping',
    'asin',
    'atan',
    'atan2',
    'blendBurn',
    'blendColor',
    'blendDodge',
    'blendOverlay',
    'blendScreen',
    'bumpMap',
    'cameraFar',
    'cameraNear',
    'cameraPosition',
    'cbrt',
    'cdl',
    'ceil',
    'checker',
    'clamp',
    'colorToDirection',
    'cos',
    'color',
    'cross',
    'cineonToneMapping',
    'dFdx',
    'dFdy',
    'degrees',
    'deltaTime',
    'depth',
    'difference',
    'directionToColor',
    'distance',
    'dot',
    'equal',
    'equirectUV',
    'exp',
    'exp2',
    'faceDirection',
    'faceforward',
    'float',
    'floor',
    'fract',
    'frameId',
    'frontFacing',
    'fwidth',
    'gain',
    'grayscale',
    'greaterThan',
    'greaterThanEqual',
    'hash',
    'hue',
    'interleavedGradientNoise',
    'inverse',
    'inverseSqrt',
    'length',
    'lengthSq',
    'lessThan',
    'lessThanEqual',
    'linearDepth',
    'linearToneMapping',
    'log',
    'log2',
    'luminance',
    'mat2',
    'mat3',
    'mat4',
    'matcapUV',
    'max',
    'min',
    'mix',
    'mod',
    'modelWorldMatrix',
    'modelViewMatrix',
    'modelNormalMatrix',
    'mx_aastep',
    'mx_cell_noise_float',
    'mx_contrast',
    'mx_fractal_noise_float',
    'mx_fractal_noise_vec2',
    'mx_fractal_noise_vec3',
    'mx_fractal_noise_vec4',
    'mx_heighttonormal',
    'mx_hsvtorgb',
    'mx_noise_float',
    'mx_noise_vec3',
    'mx_noise_vec4',
    'mx_ramp4',
    'mx_ramplr',
    'mx_ramptb',
    'mx_rgbtohsv',
    'mx_rotate2d',
    'mx_safepower',
    'mx_splitlr',
    'mx_splittb',
    'mx_worley_noise_float',
    'mx_worley_noise_vec2',
    'mx_worley_noise_vec3',
    'negate',
    'neutralToneMapping',
    'normalFlat',
    'normalView',
    'normalWorld',
    'normalize',
    'notEqual',
    'oneMinus',
    'oscSawtooth',
    'oscSine',
    'oscSquare',
    'oscTriangle',
    'parabola',
    'parallaxUV',
    'pcurve',
    'posterize',
    'positionView',
    'positionWorld',
    'pow',
    'pow2',
    'pow3',
    'pow4',
    'positionLocal',
    'premultiplyAlpha',
    'rangeFogFactor',
    'normalLocal',
    'tangentLocal',
    'bitangentLocal',
    'cameraProjectionMatrix',
    'densityFogFactor',
    'PI',
    'PI2',
    'radians',
    'rand',
    'reciprocal',
    'reinhardToneMapping',
    'reflect',
    'refract',
    'remap',
    'remapClamp',
    'rotateUV',
    'round',
    'saturate',
    'sRGBTransferEOTF',
    'sRGBTransferOETF',
    'saturation',
    'screenSize',
    'screenUV',
    'select',
    'shapeCircle',
    'sign',
    'sin',
    'sinc',
    'smoothstep',
    'smoothstepElement',
    'spherizeUV',
    'spritesheetUV',
    'sqrt',
    'step',
    'stepElement',
    'tan',
    'texture',
    'transpose',
    'triNoise3D',
    'trunc',
    'uniform',
    'uniformTexture',
    'unpremultiplyAlpha',
    'uv',
    'vec2',
    'vec3',
    'vec4',
    'vibrance',
    'viewportUV',
    'cameraViewMatrix',
  ]
  const tslImportPlaceholder = '__TSL_IMPORTS__'
  const decls: string[] = [
    `const { ${tslImportPlaceholder} } = TSL;`,
    `const material = new ${materialClass}();`,
  ]
  const cache = new Map<string, ExprResult>()
  let varIndex = 1

  const nextVar = (prefix: string) => `${prefix}_${varIndex++}`
  const asColor = (expr: string, kind: 'color' | 'number') =>
    kind === 'color' ? expr : `vec3(${expr}, ${expr}, ${expr})`
  const asVec2 = (expr: string, kind: 'vec2' | 'number') =>
    kind === 'vec2' ? expr : `vec2(${expr}, ${expr})`
  const asVec3 = (expr: string, kind: 'vec3' | 'number') =>
    kind === 'vec3' ? expr : `vec3(${expr}, ${expr}, ${expr})`
  const asVec4 = (expr: string, kind: 'vec4' | 'number') =>
    kind === 'vec4' ? expr : `vec4(${expr}, ${expr}, ${expr}, ${expr})`
  const toVec2Expr = (input: ExprResult | null) => {
    if (!input) return 'vec2(0.0, 0.0)'
    if (input.kind === 'vec2') return input.expr
    if (input.kind === 'vec3' || input.kind === 'color') {
      return `vec2(${input.expr}.x, ${input.expr}.y)`
    }
    if (input.kind === 'vec4') {
      return `vec2(${input.expr}.x, ${input.expr}.y)`
    }
    return asVec2(input.expr, 'number')
  }
  const toVec3Expr = (input: ExprResult | null) => {
    if (!input) return 'vec3(0.0, 0.0, 0.0)'
    if (input.kind === 'vec3' || input.kind === 'color') return input.expr
    if (input.kind === 'vec2') {
      return `vec3(${input.expr}.x, ${input.expr}.y, 0.0)`
    }
    if (input.kind === 'vec4') {
      return `vec3(${input.expr}.x, ${input.expr}.y, ${input.expr}.z)`
    }
    return asVec3(input.expr, 'number')
  }
  const toVec4Expr = (input: ExprResult | null) => {
    if (!input) return 'vec4(0.0, 0.0, 0.0, 1.0)'
    if (input.kind === 'vec4') return input.expr
    if (input.kind === 'vec3' || input.kind === 'color') {
      return `vec4(${input.expr}.x, ${input.expr}.y, ${input.expr}.z, 1.0)`
    }
    if (input.kind === 'vec2') {
      return `vec4(${input.expr}.x, ${input.expr}.y, 0.0, 1.0)`
    }
    return asVec4(input.expr, 'number')
  }

  const resolveExpr = (nodeId: string, outputPin?: string): ExprResult => {
    const key = `${nodeId}:${outputPin ?? ''}`
    const cached = cache.get(key)
    if (cached) return cached

    const node = nodeMap.get(nodeId)
    if (!node) {
      const fallback = { expr: 'float(0.0)', kind: 'number' as const }
      cache.set(key, fallback)
      return fallback
    }

    if (node.type === 'number') {
      const value = parseNumber(node.value)
      const name = nextVar('num')
      const mode = getNumberUpdateMode(node)
      if (mode === 'manual') {
        decls.push(`const ${name} = float(${value.toFixed(3)});`)
      } else {
        decls.push(`const ${name} = uniform(${value.toFixed(3)});`)
        appendNumberUniformUpdate(decls, name, node)
      }
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'time') {
      const out = { expr: 'timeUniform', kind: 'number' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'color') {
      const value = typeof node.value === 'string' ? node.value : DEFAULT_COLOR
      const name = nextVar('col')
      decls.push(`const ${name} = color('${value}');`)
      const out = { expr: name, kind: 'color' as const }
      cache.set(key, out)
      return out
    }

    const attributeExpr = getAttributeExpr(node.type)
    if (attributeExpr) {
      cache.set(key, attributeExpr)
      return attributeExpr
    }

    if (node.type === 'texture') {
      const name = nextVar('tex')
      decls.push(
        `const ${name} = texture(uniformTexture(textureFromNode('${node.id}')), uv());`,
      )
      const out = { expr: name, kind: 'color' as const }
      cache.set(key, out)
      return out
    }

    const getInput = (pin: string) => {
      const connection = connectionMap.get(`${node.id}:${pin}`)
      if (!connection) return null
      return resolveExpr(connection.from.nodeId, connection.from.pin)
    }
    if (node.type === 'checker') {
      const input = getInput('coord')
      const expr =
        input?.kind === 'vec2'
          ? input.expr
          : input?.kind === 'number'
            ? asVec2(input.expr, 'number')
            : 'uv()'
      const name = nextVar('num')
      decls.push(`const ${name} = checker(${expr});`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'functionInput' || node.type === 'functionOutput') {
      const input = getInput('value')
      const out = input ?? { expr: 'float(0.0)', kind: 'number' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'add' || node.type === 'multiply') {
      const left =
        getInput('a') ??
        {
          expr: node.type === 'add' ? 'float(0.0)' : 'float(1.0)',
          kind: 'number' as const,
        }
      const right =
        getInput('b') ??
        {
          expr: node.type === 'add' ? 'float(0.0)' : 'float(1.0)',
          kind: 'number' as const,
        }
      const op = node.type === 'add' ? 'add' : 'mul'
      const combined = combineTypes(left.kind, right.kind)
      if (combined === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      let leftExpr = left.expr
      let rightExpr = right.expr
      if (combined === 'color') {
        leftExpr = asColor(left.expr, left.kind === 'number' ? 'number' : 'color')
        rightExpr = asColor(right.expr, right.kind === 'number' ? 'number' : 'color')
      } else if (combined === 'vec2') {
        leftExpr = asVec2(left.expr, left.kind === 'number' ? 'number' : 'vec2')
        rightExpr = asVec2(right.expr, right.kind === 'number' ? 'number' : 'vec2')
      } else if (combined === 'vec3') {
        leftExpr = asVec3(left.expr, left.kind === 'number' ? 'number' : 'vec3')
        rightExpr = asVec3(right.expr, right.kind === 'number' ? 'number' : 'vec3')
      } else if (combined === 'vec4') {
        leftExpr = asVec4(left.expr, left.kind === 'number' ? 'number' : 'vec4')
        rightExpr = asVec4(right.expr, right.kind === 'number' ? 'number' : 'vec4')
      }
      const expr = `${leftExpr}.${op}(${rightExpr})`
      const name = nextVar(combined === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: combined }
      cache.set(key, out)
      return out
    }
    if (node.type === 'ifElse') {
      const inputCond = getInput('cond')
      const inputA = getInput('a')
      const inputB = getInput('b')
      const inputThreshold = getInput('threshold')
      const combined = combineTypes(inputA?.kind ?? 'number', inputB?.kind ?? 'number')
      if (combined === 'unknown' || isMatrixKind(combined)) {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const outputKind = combined as 'number' | 'color' | 'vec2' | 'vec3' | 'vec4'
      const toKindExpr = (
        entry: typeof inputA,
        kind: 'number' | 'color' | 'vec2' | 'vec3' | 'vec4',
        fallback: number,
      ) => {
        if (kind === 'number') {
          return entry?.kind === 'number' ? entry.expr : `float(${fallback.toFixed(1)})`
        }
        if (entry?.kind === kind) return entry.expr
        if (entry?.kind === 'number') {
          if (kind === 'color') return asColor(entry.expr, 'number')
          if (kind === 'vec2') return asVec2(entry.expr, 'number')
          if (kind === 'vec3') return asVec3(entry.expr, 'number')
          return asVec4(entry.expr, 'number')
        }
        if (kind === 'color') return `color(${fallback.toFixed(1)})`
        if (kind === 'vec2') return `vec2(${fallback.toFixed(1)}, ${fallback.toFixed(1)})`
        if (kind === 'vec3') return `vec3(${fallback.toFixed(1)}, ${fallback.toFixed(1)}, ${fallback.toFixed(1)})`
        return `vec4(${fallback.toFixed(1)}, ${fallback.toFixed(1)}, ${fallback.toFixed(1)}, ${fallback.toFixed(1)})`
      }
      const exprA = toKindExpr(inputA, outputKind, 1)
      const exprB = toKindExpr(inputB, outputKind, 0)
      const condExpr = (() => {
        if (!inputCond) return 'float(0.0)'
        if (outputKind === 'number') {
          if (inputCond.kind === 'number') return inputCond.expr
          if (isVectorKind(inputCond.kind)) return `length(${inputCond.expr})`
          return 'float(0.0)'
        }
        if (outputKind === 'vec2') return toVec2Expr(inputCond)
        if (outputKind === 'vec4') return toVec4Expr(inputCond)
        return toVec3Expr(inputCond)
      })()
      const thresholdExpr =
        inputThreshold?.kind === 'number' ? inputThreshold.expr : 'float(0.5)'
      const thresholdValue =
        outputKind === 'number'
          ? thresholdExpr
          : outputKind === 'vec2'
            ? `vec2(${thresholdExpr}, ${thresholdExpr})`
            : outputKind === 'vec4'
              ? `vec4(${thresholdExpr}, ${thresholdExpr}, ${thresholdExpr}, ${thresholdExpr})`
              : `vec3(${thresholdExpr}, ${thresholdExpr}, ${thresholdExpr})`
      const mask = `greaterThan(${condExpr}, ${thresholdValue})`
      const expr = `select(${mask}, ${exprA}, ${exprB})`
      const name = nextVar(outputKind === 'number' ? 'num' : outputKind === 'color' ? 'col' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: outputKind }
      cache.set(key, out)
      return out
    }

    if (node.type === 'sine') {
      const input = getInput('value')
      const valueExpr = input?.kind === 'number' ? input.expr : 'float(0.0)'
      const expr = `sin(${valueExpr})`
      const name = nextVar('num')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }
    if (
      node.type === 'tan' ||
      node.type === 'asin' ||
      node.type === 'acos' ||
      node.type === 'atan' ||
      node.type === 'radians' ||
      node.type === 'degrees'
    ) {
      const input = getInput('value')
      if (!input || (!isVectorKind(input.kind) && input.kind !== 'number')) {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const fn =
        node.type === 'tan'
          ? 'tan'
          : node.type === 'asin'
            ? 'asin'
            : node.type === 'acos'
              ? 'acos'
              : node.type === 'atan'
                ? 'atan'
                : node.type === 'radians'
                  ? 'radians'
                  : 'degrees'
      const expr = `${fn}(${input.expr})`
      const name = nextVar(input.kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: input.kind }
      cache.set(key, out)
      return out
    }
    if (node.type === 'atan2') {
      const inputY = getInput('y')
      const inputX = getInput('x')
      const kind = resolveVectorOutputKind([
        inputY?.kind ?? 'number',
        inputX?.kind ?? 'number',
      ])
      if (kind === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      let exprY = inputY?.expr ?? 'float(0.0)'
      let exprX = inputX?.expr ?? 'float(0.0)'
      if (kind === 'color') {
        exprY =
          inputY?.kind === 'color'
            ? inputY.expr
            : inputY?.kind === 'number'
              ? asColor(inputY.expr, 'number')
              : 'color(0.0)'
        exprX =
          inputX?.kind === 'color'
            ? inputX.expr
            : inputX?.kind === 'number'
              ? asColor(inputX.expr, 'number')
              : 'color(0.0)'
      } else if (kind === 'vec2') {
        exprY =
          inputY?.kind === 'vec2'
            ? inputY.expr
            : inputY?.kind === 'number'
              ? asVec2(inputY.expr, 'number')
              : 'vec2(0.0, 0.0)'
        exprX =
          inputX?.kind === 'vec2'
            ? inputX.expr
            : inputX?.kind === 'number'
              ? asVec2(inputX.expr, 'number')
              : 'vec2(0.0, 0.0)'
      } else if (kind === 'vec3') {
        exprY =
          inputY?.kind === 'vec3'
            ? inputY.expr
            : inputY?.kind === 'number'
              ? asVec3(inputY.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
        exprX =
          inputX?.kind === 'vec3'
            ? inputX.expr
            : inputX?.kind === 'number'
              ? asVec3(inputX.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
      } else if (kind === 'vec4') {
        exprY =
          inputY?.kind === 'vec4'
            ? inputY.expr
            : inputY?.kind === 'number'
              ? asVec4(inputY.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
        exprX =
          inputX?.kind === 'vec4'
            ? inputX.expr
            : inputX?.kind === 'number'
              ? asVec4(inputX.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
      }
      const expr = `atan2(${exprY}, ${exprX})`
      const name = nextVar(kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }
    if (node.type === 'vec2') {
      const inputX = getInput('x')
      const inputY = getInput('y')
      const exprX = inputX?.kind === 'number' ? inputX.expr : 'float(0.0)'
      const exprY = inputY?.kind === 'number' ? inputY.expr : 'float(0.0)'
      const expr = `vec2(${exprX}, ${exprY})`
      const name = nextVar('vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'vec2' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'mat2') {
      const c0 = getInput('c0')
      const c1 = getInput('c1')
      const expr = `mat2(${toVec2Expr(c0)}, ${toVec2Expr(c1)})`
      const name = nextVar('mat')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'mat2' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'vec3') {
      const inputX = getInput('x')
      const inputY = getInput('y')
      const inputZ = getInput('z')
      const exprX = inputX?.kind === 'number' ? inputX.expr : 'float(0.0)'
      const exprY = inputY?.kind === 'number' ? inputY.expr : 'float(0.0)'
      const exprZ = inputZ?.kind === 'number' ? inputZ.expr : 'float(0.0)'
      const expr = `vec3(${exprX}, ${exprY}, ${exprZ})`
      const name = nextVar('vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'vec3' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'mat3') {
      const c0 = getInput('c0')
      const c1 = getInput('c1')
      const c2 = getInput('c2')
      const expr = `mat3(${toVec3Expr(c0)}, ${toVec3Expr(c1)}, ${toVec3Expr(c2)})`
      const name = nextVar('mat')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'mat3' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'scale') {
      const valueInput = getInput('value')
      const scaleInput = getInput('scale')
      const valueExpr =
        valueInput?.kind === 'vec3'
          ? valueInput.expr
          : valueInput?.kind === 'number'
            ? asVec3(valueInput.expr, 'number')
            : 'vec3(0.0, 0.0, 0.0)'
      const scaleExpr =
        scaleInput?.kind === 'vec3'
          ? scaleInput.expr
          : scaleInput?.kind === 'number'
            ? asVec3(scaleInput.expr, 'number')
            : 'vec3(1.0, 1.0, 1.0)'
      const expr = `(${valueExpr} * ${scaleExpr})`
      const name = nextVar('vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'vec3' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'rotate') {
      const valueInput = getInput('value')
      const rotationInput = getInput('rotation')
      const valueExpr =
        valueInput?.kind === 'vec3'
          ? valueInput.expr
          : valueInput?.kind === 'number'
            ? asVec3(valueInput.expr, 'number')
            : 'vec3(0.0, 0.0, 0.0)'
      const rotationExpr =
        rotationInput?.kind === 'vec3'
          ? rotationInput.expr
          : rotationInput?.kind === 'number'
            ? asVec3(rotationInput.expr, 'number')
            : 'vec3(0.0, 0.0, 0.0)'
      const baseName = nextVar('vec')
      const rotName = nextVar('vec')
      const cx = nextVar('num')
      const sx = nextVar('num')
      const cy = nextVar('num')
      const sy = nextVar('num')
      const cz = nextVar('num')
      const sz = nextVar('num')
      const rotX = nextVar('vec')
      const rotY = nextVar('vec')
      const rotZ = nextVar('vec')
      decls.push(`const ${baseName} = ${valueExpr};`)
      decls.push(`const ${rotName} = ${rotationExpr};`)
      decls.push(`const ${cx} = cos(${rotName}.x);`)
      decls.push(`const ${sx} = sin(${rotName}.x);`)
      decls.push(`const ${cy} = cos(${rotName}.y);`)
      decls.push(`const ${sy} = sin(${rotName}.y);`)
      decls.push(`const ${cz} = cos(${rotName}.z);`)
      decls.push(`const ${sz} = sin(${rotName}.z);`)
      decls.push(
        `const ${rotX} = vec3(${baseName}.x, ${baseName}.y * ${cx} - ${baseName}.z * ${sx}, ${baseName}.y * ${sx} + ${baseName}.z * ${cx});`,
      )
      decls.push(
        `const ${rotY} = vec3(${rotX}.x * ${cy} + ${rotX}.z * ${sy}, ${rotX}.y, ${rotX}.z * ${cy} - ${rotX}.x * ${sy});`,
      )
      decls.push(
        `const ${rotZ} = vec3(${rotY}.x * ${cz} - ${rotY}.y * ${sz}, ${rotY}.x * ${sz} + ${rotY}.y * ${cz}, ${rotY}.z);`,
      )
      const out = { expr: rotZ, kind: 'vec3' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'vec4') {
      const inputX = getInput('x')
      const inputY = getInput('y')
      const inputZ = getInput('z')
      const inputW = getInput('w')
      const exprX = inputX?.kind === 'number' ? inputX.expr : 'float(0.0)'
      const exprY = inputY?.kind === 'number' ? inputY.expr : 'float(0.0)'
      const exprZ = inputZ?.kind === 'number' ? inputZ.expr : 'float(0.0)'
      const exprW = inputW?.kind === 'number' ? inputW.expr : 'float(1.0)'
      const expr = `vec4(${exprX}, ${exprY}, ${exprZ}, ${exprW})`
      const name = nextVar('vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'vec4' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'mat4') {
      const c0 = getInput('c0')
      const c1 = getInput('c1')
      const c2 = getInput('c2')
      const c3 = getInput('c3')
      const expr = `mat4(${toVec4Expr(c0)}, ${toVec4Expr(c1)}, ${toVec4Expr(c2)}, ${toVec4Expr(c3)})`
      const name = nextVar('mat')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'mat4' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'modelMatrix') {
      const out = { expr: 'modelWorldMatrix', kind: 'mat4' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'viewMatrix') {
      const out = { expr: 'cameraViewMatrix', kind: 'mat4' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'projectionMatrix') {
      const out = { expr: 'cameraProjectionMatrix', kind: 'mat4' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'modelViewMatrix') {
      const out = { expr: 'modelViewMatrix', kind: 'mat4' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'normalMatrix') {
      const out = { expr: 'modelNormalMatrix', kind: 'mat3' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'transpose' || node.type === 'inverse') {
      const input = getInput('value')
      if (!input || !isMatrixKind(input.kind)) {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const expr = `${node.type}(${input.expr})`
      const name = nextVar('mat')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: input.kind }
      cache.set(key, out)
      return out
    }
    if (node.type === 'splitVec2') {
      const input = getInput('value')
      const sourceExpr =
        input?.kind === 'vec2'
          ? input.expr
          : input?.kind === 'number'
            ? asVec2(input.expr, 'number')
            : 'vec2(0.0, 0.0)'
      const channel = outputPin === 'y' ? 'y' : 'x'
      const expr = `${sourceExpr}.${channel}`
      const name = nextVar('num')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'splitVec3') {
      const input = getInput('value')
      const sourceExpr =
        input?.kind === 'vec3'
          ? input.expr
          : input?.kind === 'number'
            ? asVec3(input.expr, 'number')
            : 'vec3(0.0, 0.0, 0.0)'
      const channel = outputPin === 'y' ? 'y' : outputPin === 'z' ? 'z' : 'x'
      const expr = `${sourceExpr}.${channel}`
      const name = nextVar('num')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'splitVec4') {
      const input = getInput('value')
      const sourceExpr =
        input?.kind === 'vec4'
          ? input.expr
          : input?.kind === 'number'
            ? asVec4(input.expr, 'number')
            : 'vec4(0.0, 0.0, 0.0, 1.0)'
      const channel =
        outputPin === 'y' ? 'y' : outputPin === 'z' ? 'z' : outputPin === 'w' ? 'w' : 'x'
      const expr = `${sourceExpr}.${channel}`
      const name = nextVar('num')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'cosine') {
      const input = getInput('value')
      const valueExpr = input?.kind === 'number' ? input.expr : 'float(0.0)'
      const expr = `cos(${valueExpr})`
      const name = nextVar('num')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'abs') {
      const input = getInput('value')
      const valueExpr = input?.kind === 'number' ? input.expr : 'float(0.0)'
      const expr = `abs(${valueExpr})`
      const name = nextVar('num')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'clamp') {
      const valueInput = getInput('value')
      const minInput = getInput('min')
      const maxInput = getInput('max')
      const valueExpr = valueInput?.kind === 'number' ? valueInput.expr : 'float(0.0)'
      const minExpr = minInput?.kind === 'number' ? minInput.expr : 'float(0.0)'
      const maxExpr = maxInput?.kind === 'number' ? maxInput.expr : 'float(1.0)'
      const expr = `clamp(${valueExpr}, ${minExpr}, ${maxExpr})`
      const name = nextVar('num')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'min' || node.type === 'max' || node.type === 'mod') {
      const inputA = getInput('a') ?? { expr: 'float(0.0)', kind: 'number' as const }
      const inputB = getInput('b') ?? { expr: 'float(0.0)', kind: 'number' as const }
      const combined = combineTypes(inputA.kind, inputB.kind)
      if (combined === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const fn = node.type === 'min' ? 'min' : node.type === 'max' ? 'max' : 'mod'
      if (combined === 'number') {
        const expr = `${fn}(${inputA.expr}, ${inputB.expr})`
        const name = nextVar('num')
        decls.push(`const ${name} = ${expr};`)
        const out = { expr: name, kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      let exprA = inputA.expr
      let exprB = inputB.expr
      if (combined === 'color') {
        exprA =
          inputA.kind === 'color'
            ? inputA.expr
            : inputA.kind === 'number'
              ? asColor(inputA.expr, 'number')
              : 'color(0.0)'
        exprB =
          inputB.kind === 'color'
            ? inputB.expr
            : inputB.kind === 'number'
              ? asColor(inputB.expr, 'number')
              : 'color(0.0)'
      } else if (combined === 'vec2') {
        exprA =
          inputA.kind === 'vec2'
            ? inputA.expr
            : inputA.kind === 'number'
              ? asVec2(inputA.expr, 'number')
              : 'vec2(0.0, 0.0)'
        exprB =
          inputB.kind === 'vec2'
            ? inputB.expr
            : inputB.kind === 'number'
              ? asVec2(inputB.expr, 'number')
              : 'vec2(0.0, 0.0)'
      } else if (combined === 'vec3') {
        exprA =
          inputA.kind === 'vec3'
            ? inputA.expr
            : inputA.kind === 'number'
              ? asVec3(inputA.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
        exprB =
          inputB.kind === 'vec3'
            ? inputB.expr
            : inputB.kind === 'number'
              ? asVec3(inputB.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
      } else if (combined === 'vec4') {
        exprA =
          inputA.kind === 'vec4'
            ? inputA.expr
            : inputA.kind === 'number'
              ? asVec4(inputA.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
        exprB =
          inputB.kind === 'vec4'
            ? inputB.expr
            : inputB.kind === 'number'
              ? asVec4(inputB.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
      }
      const expr = `${fn}(${exprA}, ${exprB})`
      const name = nextVar('vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: combined }
      cache.set(key, out)
      return out
    }
    if (node.type === 'step') {
      const edgeInput = getInput('edge')
      const xInput = getInput('x')
      const kind = resolveVectorOutputKind([
        edgeInput?.kind ?? 'number',
        xInput?.kind ?? 'number',
      ])
      if (kind === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      let exprEdge = edgeInput?.expr ?? 'float(0.0)'
      let exprX = xInput?.expr ?? 'float(0.0)'
      if (kind === 'color') {
        exprEdge =
          edgeInput?.kind === 'color'
            ? edgeInput.expr
            : edgeInput?.kind === 'number'
              ? asColor(edgeInput.expr, 'number')
              : 'color(0.0)'
        exprX =
          xInput?.kind === 'color'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asColor(xInput.expr, 'number')
              : 'color(0.0)'
      } else if (kind === 'vec2') {
        exprEdge =
          edgeInput?.kind === 'vec2'
            ? edgeInput.expr
            : edgeInput?.kind === 'number'
              ? asVec2(edgeInput.expr, 'number')
              : 'vec2(0.0, 0.0)'
        exprX =
          xInput?.kind === 'vec2'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asVec2(xInput.expr, 'number')
              : 'vec2(0.0, 0.0)'
      } else if (kind === 'vec3') {
        exprEdge =
          edgeInput?.kind === 'vec3'
            ? edgeInput.expr
            : edgeInput?.kind === 'number'
              ? asVec3(edgeInput.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
        exprX =
          xInput?.kind === 'vec3'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asVec3(xInput.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
      } else if (kind === 'vec4') {
        exprEdge =
          edgeInput?.kind === 'vec4'
            ? edgeInput.expr
            : edgeInput?.kind === 'number'
              ? asVec4(edgeInput.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
        exprX =
          xInput?.kind === 'vec4'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asVec4(xInput.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
      }
      const expr = `step(${exprEdge}, ${exprX})`
      const name = nextVar(kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }
    if (
      node.type === 'fract' ||
      node.type === 'floor' ||
      node.type === 'ceil' ||
      node.type === 'round' ||
      node.type === 'trunc' ||
      node.type === 'exp' ||
      node.type === 'log' ||
      node.type === 'sign' ||
      node.type === 'oneMinus' ||
      node.type === 'negate' ||
      node.type === 'exp2' ||
      node.type === 'log2' ||
      node.type === 'pow2' ||
      node.type === 'pow3' ||
      node.type === 'pow4' ||
      node.type === 'sqrt' ||
      node.type === 'saturate'
    ) {
      const input = getInput('value')
      if (!input || (!isVectorKind(input.kind) && input.kind !== 'number')) {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const fn =
        node.type === 'fract'
          ? 'fract'
          : node.type === 'floor'
            ? 'floor'
            : node.type === 'ceil'
              ? 'ceil'
              : node.type === 'round'
                ? 'round'
                : node.type === 'trunc'
                  ? 'trunc'
                  : node.type === 'exp'
                    ? 'exp'
                    : node.type === 'exp2'
                      ? 'exp2'
                      : node.type === 'log'
                        ? 'log'
                        : node.type === 'log2'
                          ? 'log2'
                          : node.type === 'sign'
                            ? 'sign'
                            : node.type === 'oneMinus'
                              ? 'oneMinus'
                              : node.type === 'pow2'
                                ? 'pow2'
                                : node.type === 'pow3'
                                  ? 'pow3'
                                  : node.type === 'pow4'
                                    ? 'pow4'
                                    : node.type === 'sqrt'
                                      ? 'sqrt'
                                      : node.type === 'saturate'
                                        ? 'saturate'
                                        : 'negate'
      const expr = `${fn}(${input.expr})`
      const name = nextVar(input.kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: input.kind }
      cache.set(key, out)
      return out
    }
    if (node.type === 'mix') {
      const inputA = getInput('a')
      const inputB = getInput('b')
      const inputT = getInput('t')
      const exprT = inputT?.kind === 'number' ? inputT.expr : 'float(0.5)'
      const typeA = inputA?.kind ?? 'number'
      const typeB = inputB?.kind ?? 'number'
      const combined = combineTypes(typeA, typeB)
      if (combined === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      let exprA = inputA?.expr ?? 'float(0.0)'
      let exprB = inputB?.expr ?? 'float(1.0)'
      if (combined === 'color') {
        exprA =
          inputA?.kind === 'color'
            ? inputA.expr
            : inputA?.kind === 'number'
              ? asColor(inputA.expr, 'number')
              : 'color(0.0)'
        exprB =
          inputB?.kind === 'color'
            ? inputB.expr
            : inputB?.kind === 'number'
              ? asColor(inputB.expr, 'number')
              : 'color(1.0)'
      } else if (combined === 'vec2') {
        exprA =
          inputA?.kind === 'vec2'
            ? inputA.expr
            : inputA?.kind === 'number'
              ? asVec2(inputA.expr, 'number')
              : 'vec2(0.0, 0.0)'
        exprB =
          inputB?.kind === 'vec2'
            ? inputB.expr
            : inputB?.kind === 'number'
              ? asVec2(inputB.expr, 'number')
              : 'vec2(1.0, 1.0)'
      } else if (combined === 'vec3') {
        exprA =
          inputA?.kind === 'vec3'
            ? inputA.expr
            : inputA?.kind === 'number'
              ? asVec3(inputA.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
        exprB =
          inputB?.kind === 'vec3'
            ? inputB.expr
            : inputB?.kind === 'number'
              ? asVec3(inputB.expr, 'number')
              : 'vec3(1.0, 1.0, 1.0)'
      } else if (combined === 'vec4') {
        exprA =
          inputA?.kind === 'vec4'
            ? inputA.expr
            : inputA?.kind === 'number'
              ? asVec4(inputA.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
        exprB =
          inputB?.kind === 'vec4'
            ? inputB.expr
            : inputB?.kind === 'number'
              ? asVec4(inputB.expr, 'number')
              : 'vec4(1.0, 1.0, 1.0, 1.0)'
      } else if (combined === 'number') {
        exprA = inputA?.kind === 'number' ? inputA.expr : 'float(0.0)'
        exprB = inputB?.kind === 'number' ? inputB.expr : 'float(1.0)'
      }
      const expr = `mix(${exprA}, ${exprB}, ${exprT})`
      const name = nextVar(combined === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: combined }
      cache.set(key, out)
      return out
    }
    if (node.type === 'smoothstep') {
      const edge0Input = getInput('edge0')
      const edge1Input = getInput('edge1')
      const xInput = getInput('x')
      const kind = resolveVectorOutputKind([
        edge0Input?.kind ?? 'number',
        edge1Input?.kind ?? 'number',
        xInput?.kind ?? 'number',
      ])
      if (kind === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      let exprEdge0 = edge0Input?.expr ?? 'float(0.0)'
      let exprEdge1 = edge1Input?.expr ?? 'float(1.0)'
      let exprX = xInput?.expr ?? 'float(0.0)'
      if (kind === 'color') {
        exprEdge0 =
          edge0Input?.kind === 'color'
            ? edge0Input.expr
            : edge0Input?.kind === 'number'
              ? asColor(edge0Input.expr, 'number')
              : 'color(0.0)'
        exprEdge1 =
          edge1Input?.kind === 'color'
            ? edge1Input.expr
            : edge1Input?.kind === 'number'
              ? asColor(edge1Input.expr, 'number')
              : 'color(1.0)'
        exprX =
          xInput?.kind === 'color'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asColor(xInput.expr, 'number')
              : 'color(0.0)'
      } else if (kind === 'vec2') {
        exprEdge0 =
          edge0Input?.kind === 'vec2'
            ? edge0Input.expr
            : edge0Input?.kind === 'number'
              ? asVec2(edge0Input.expr, 'number')
              : 'vec2(0.0, 0.0)'
        exprEdge1 =
          edge1Input?.kind === 'vec2'
            ? edge1Input.expr
            : edge1Input?.kind === 'number'
              ? asVec2(edge1Input.expr, 'number')
              : 'vec2(1.0, 1.0)'
        exprX =
          xInput?.kind === 'vec2'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asVec2(xInput.expr, 'number')
              : 'vec2(0.0, 0.0)'
      } else if (kind === 'vec3') {
        exprEdge0 =
          edge0Input?.kind === 'vec3'
            ? edge0Input.expr
            : edge0Input?.kind === 'number'
              ? asVec3(edge0Input.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
        exprEdge1 =
          edge1Input?.kind === 'vec3'
            ? edge1Input.expr
            : edge1Input?.kind === 'number'
              ? asVec3(edge1Input.expr, 'number')
              : 'vec3(1.0, 1.0, 1.0)'
        exprX =
          xInput?.kind === 'vec3'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asVec3(xInput.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
      } else if (kind === 'vec4') {
        exprEdge0 =
          edge0Input?.kind === 'vec4'
            ? edge0Input.expr
            : edge0Input?.kind === 'number'
              ? asVec4(edge0Input.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
        exprEdge1 =
          edge1Input?.kind === 'vec4'
            ? edge1Input.expr
            : edge1Input?.kind === 'number'
              ? asVec4(edge1Input.expr, 'number')
              : 'vec4(1.0, 1.0, 1.0, 1.0)'
        exprX =
          xInput?.kind === 'vec4'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asVec4(xInput.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
      }
      const expr = `smoothstep(${exprEdge0}, ${exprEdge1}, ${exprX})`
      const name = nextVar(kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }
    if (node.type === 'pow') {
      const baseInput = getInput('base')
      const expInput = getInput('exp')
      const kind = resolveVectorOutputKind([
        baseInput?.kind ?? 'number',
        expInput?.kind ?? 'number',
      ])
      if (kind === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      let exprBase = baseInput?.expr ?? 'float(0.0)'
      let exprExp = expInput?.expr ?? 'float(1.0)'
      if (kind === 'color') {
        exprBase =
          baseInput?.kind === 'color'
            ? baseInput.expr
            : baseInput?.kind === 'number'
              ? asColor(baseInput.expr, 'number')
              : 'color(0.0)'
        exprExp =
          expInput?.kind === 'color'
            ? expInput.expr
            : expInput?.kind === 'number'
              ? asColor(expInput.expr, 'number')
              : 'color(1.0)'
      } else if (kind === 'vec2') {
        exprBase =
          baseInput?.kind === 'vec2'
            ? baseInput.expr
            : baseInput?.kind === 'number'
              ? asVec2(baseInput.expr, 'number')
              : 'vec2(0.0, 0.0)'
        exprExp =
          expInput?.kind === 'vec2'
            ? expInput.expr
            : expInput?.kind === 'number'
              ? asVec2(expInput.expr, 'number')
              : 'vec2(1.0, 1.0)'
      } else if (kind === 'vec3') {
        exprBase =
          baseInput?.kind === 'vec3'
            ? baseInput.expr
            : baseInput?.kind === 'number'
              ? asVec3(baseInput.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
        exprExp =
          expInput?.kind === 'vec3'
            ? expInput.expr
            : expInput?.kind === 'number'
              ? asVec3(expInput.expr, 'number')
              : 'vec3(1.0, 1.0, 1.0)'
      } else if (kind === 'vec4') {
        exprBase =
          baseInput?.kind === 'vec4'
            ? baseInput.expr
            : baseInput?.kind === 'number'
              ? asVec4(baseInput.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
        exprExp =
          expInput?.kind === 'vec4'
            ? expInput.expr
            : expInput?.kind === 'number'
              ? asVec4(expInput.expr, 'number')
              : 'vec4(1.0, 1.0, 1.0, 1.0)'
      }
      const expr = `pow(${exprBase}, ${exprExp})`
      const name = nextVar(kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }
    if (node.type === 'length') {
      const input = getInput('value')
      const valueExpr =
        input && isVectorKind(input.kind) ? input.expr : 'vec3(0.0, 0.0, 0.0)'
      const expr = `length(${valueExpr})`
      const name = nextVar('num')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'smoothstepElement') {
      const lowInput = getInput('low')
      const highInput = getInput('high')
      const xInput = getInput('x')
      const kind = resolveVectorOutputKind([
        lowInput?.kind ?? 'number',
        highInput?.kind ?? 'number',
        xInput?.kind ?? 'number',
      ])
      if (kind === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      let exprX = xInput?.expr ?? 'float(0.0)'
      let exprLow = lowInput?.expr ?? 'float(0.0)'
      let exprHigh = highInput?.expr ?? 'float(1.0)'
      if (kind === 'color') {
        exprX =
          xInput?.kind === 'color'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asColor(xInput.expr, 'number')
              : 'color(0.0)'
        exprLow =
          lowInput?.kind === 'color'
            ? lowInput.expr
            : lowInput?.kind === 'number'
              ? asColor(lowInput.expr, 'number')
              : 'color(0.0)'
        exprHigh =
          highInput?.kind === 'color'
            ? highInput.expr
            : highInput?.kind === 'number'
              ? asColor(highInput.expr, 'number')
              : 'color(1.0)'
      } else if (kind === 'vec2') {
        exprX =
          xInput?.kind === 'vec2'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asVec2(xInput.expr, 'number')
              : 'vec2(0.0, 0.0)'
        exprLow =
          lowInput?.kind === 'vec2'
            ? lowInput.expr
            : lowInput?.kind === 'number'
              ? asVec2(lowInput.expr, 'number')
              : 'vec2(0.0, 0.0)'
        exprHigh =
          highInput?.kind === 'vec2'
            ? highInput.expr
            : highInput?.kind === 'number'
              ? asVec2(highInput.expr, 'number')
              : 'vec2(1.0, 1.0)'
      } else if (kind === 'vec3') {
        exprX =
          xInput?.kind === 'vec3'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asVec3(xInput.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
        exprLow =
          lowInput?.kind === 'vec3'
            ? lowInput.expr
            : lowInput?.kind === 'number'
              ? asVec3(lowInput.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
        exprHigh =
          highInput?.kind === 'vec3'
            ? highInput.expr
            : highInput?.kind === 'number'
              ? asVec3(highInput.expr, 'number')
              : 'vec3(1.0, 1.0, 1.0)'
      } else if (kind === 'vec4') {
        exprX =
          xInput?.kind === 'vec4'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asVec4(xInput.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
        exprLow =
          lowInput?.kind === 'vec4'
            ? lowInput.expr
            : lowInput?.kind === 'number'
              ? asVec4(lowInput.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
        exprHigh =
          highInput?.kind === 'vec4'
            ? highInput.expr
            : highInput?.kind === 'number'
              ? asVec4(highInput.expr, 'number')
              : 'vec4(1.0, 1.0, 1.0, 1.0)'
      }
      const expr = `smoothstepElement(${exprX}, ${exprLow}, ${exprHigh})`
      const name = nextVar(kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }
    if (node.type === 'stepElement') {
      const edgeInput = getInput('edge')
      const xInput = getInput('x')
      const kind = resolveVectorOutputKind([
        edgeInput?.kind ?? 'number',
        xInput?.kind ?? 'number',
      ])
      if (kind === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      let exprX = xInput?.expr ?? 'float(0.0)'
      let exprEdge = edgeInput?.expr ?? 'float(0.0)'
      if (kind === 'color') {
        exprX =
          xInput?.kind === 'color'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asColor(xInput.expr, 'number')
              : 'color(0.0)'
        exprEdge =
          edgeInput?.kind === 'color'
            ? edgeInput.expr
            : edgeInput?.kind === 'number'
              ? asColor(edgeInput.expr, 'number')
              : 'color(0.0)'
      } else if (kind === 'vec2') {
        exprX =
          xInput?.kind === 'vec2'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asVec2(xInput.expr, 'number')
              : 'vec2(0.0, 0.0)'
        exprEdge =
          edgeInput?.kind === 'vec2'
            ? edgeInput.expr
            : edgeInput?.kind === 'number'
              ? asVec2(edgeInput.expr, 'number')
              : 'vec2(0.0, 0.0)'
      } else if (kind === 'vec3') {
        exprX =
          xInput?.kind === 'vec3'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asVec3(xInput.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
        exprEdge =
          edgeInput?.kind === 'vec3'
            ? edgeInput.expr
            : edgeInput?.kind === 'number'
              ? asVec3(edgeInput.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
      } else if (kind === 'vec4') {
        exprX =
          xInput?.kind === 'vec4'
            ? xInput.expr
            : xInput?.kind === 'number'
              ? asVec4(xInput.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
        exprEdge =
          edgeInput?.kind === 'vec4'
            ? edgeInput.expr
            : edgeInput?.kind === 'number'
              ? asVec4(edgeInput.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
      }
      const expr = `stepElement(${exprX}, ${exprEdge})`
      const name = nextVar(kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }
    if (
      node.type === 'lessThan' ||
      node.type === 'lessThanEqual' ||
      node.type === 'greaterThan' ||
      node.type === 'greaterThanEqual' ||
      node.type === 'equal' ||
      node.type === 'notEqual'
    ) {
      const inputA = getInput('a')
      const inputB = getInput('b')
      const kind = resolveVectorOutputKind([
        inputA?.kind ?? 'number',
        inputB?.kind ?? 'number',
      ])
      if (kind === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const compareFn =
        node.type === 'lessThan'
          ? 'lessThan'
          : node.type === 'lessThanEqual'
            ? 'lessThanEqual'
            : node.type === 'greaterThan'
              ? 'greaterThan'
              : node.type === 'greaterThanEqual'
                ? 'greaterThanEqual'
                : node.type === 'equal'
                  ? 'equal'
                  : 'notEqual'
      let exprA = inputA?.expr ?? 'float(0.0)'
      let exprB = inputB?.expr ?? 'float(0.0)'
      if (kind === 'color') {
        exprA =
          inputA?.kind === 'color'
            ? inputA.expr
            : inputA?.kind === 'number'
              ? asColor(inputA.expr, 'number')
              : 'color(0.0)'
        exprB =
          inputB?.kind === 'color'
            ? inputB.expr
            : inputB?.kind === 'number'
              ? asColor(inputB.expr, 'number')
              : 'color(0.0)'
      } else if (kind === 'vec2') {
        exprA =
          inputA?.kind === 'vec2'
            ? inputA.expr
            : inputA?.kind === 'number'
              ? asVec2(inputA.expr, 'number')
              : 'vec2(0.0, 0.0)'
        exprB =
          inputB?.kind === 'vec2'
            ? inputB.expr
            : inputB?.kind === 'number'
              ? asVec2(inputB.expr, 'number')
              : 'vec2(0.0, 0.0)'
      } else if (kind === 'vec3') {
        exprA =
          inputA?.kind === 'vec3'
            ? inputA.expr
            : inputA?.kind === 'number'
              ? asVec3(inputA.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
        exprB =
          inputB?.kind === 'vec3'
            ? inputB.expr
            : inputB?.kind === 'number'
              ? asVec3(inputB.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
      } else if (kind === 'vec4') {
        exprA =
          inputA?.kind === 'vec4'
            ? inputA.expr
            : inputA?.kind === 'number'
              ? asVec4(inputA.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
        exprB =
          inputB?.kind === 'vec4'
            ? inputB.expr
            : inputB?.kind === 'number'
              ? asVec4(inputB.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
      }
      const oneExpr =
        kind === 'number'
          ? 'float(1.0)'
          : kind === 'color'
            ? 'color(1.0)'
            : kind === 'vec2'
              ? 'vec2(1.0, 1.0)'
              : kind === 'vec3'
                ? 'vec3(1.0, 1.0, 1.0)'
                : 'vec4(1.0, 1.0, 1.0, 1.0)'
      const zeroExpr =
        kind === 'number'
          ? 'float(0.0)'
          : kind === 'color'
            ? 'color(0.0)'
            : kind === 'vec2'
              ? 'vec2(0.0, 0.0)'
              : kind === 'vec3'
                ? 'vec3(0.0, 0.0, 0.0)'
                : 'vec4(0.0, 0.0, 0.0, 0.0)'
      const expr = `select(${compareFn}(${exprA}, ${exprB}), ${oneExpr}, ${zeroExpr})`
      const name = nextVar(kind === 'number' ? 'num' : kind === 'color' ? 'col' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }
    if (node.type === 'and' || node.type === 'or') {
      const inputA = getInput('a')
      const inputB = getInput('b')
      const kind = resolveVectorOutputKind([
        inputA?.kind ?? 'number',
        inputB?.kind ?? 'number',
      ])
      if (kind === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const halfExpr =
        kind === 'number'
          ? 'float(0.5)'
          : kind === 'color'
            ? 'color(0.5)'
            : kind === 'vec2'
              ? 'vec2(0.5, 0.5)'
              : kind === 'vec3'
                ? 'vec3(0.5, 0.5, 0.5)'
                : 'vec4(0.5, 0.5, 0.5, 0.5)'
      let exprA = inputA?.expr ?? 'float(0.0)'
      let exprB = inputB?.expr ?? 'float(0.0)'
      if (kind === 'color') {
        exprA =
          inputA?.kind === 'color'
            ? inputA.expr
            : inputA?.kind === 'number'
              ? asColor(inputA.expr, 'number')
              : 'color(0.0)'
        exprB =
          inputB?.kind === 'color'
            ? inputB.expr
            : inputB?.kind === 'number'
              ? asColor(inputB.expr, 'number')
              : 'color(0.0)'
      } else if (kind === 'vec2') {
        exprA =
          inputA?.kind === 'vec2'
            ? inputA.expr
            : inputA?.kind === 'number'
              ? asVec2(inputA.expr, 'number')
              : 'vec2(0.0, 0.0)'
        exprB =
          inputB?.kind === 'vec2'
            ? inputB.expr
            : inputB?.kind === 'number'
              ? asVec2(inputB.expr, 'number')
              : 'vec2(0.0, 0.0)'
      } else if (kind === 'vec3') {
        exprA =
          inputA?.kind === 'vec3'
            ? inputA.expr
            : inputA?.kind === 'number'
              ? asVec3(inputA.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
        exprB =
          inputB?.kind === 'vec3'
            ? inputB.expr
            : inputB?.kind === 'number'
              ? asVec3(inputB.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
      } else if (kind === 'vec4') {
        exprA =
          inputA?.kind === 'vec4'
            ? inputA.expr
            : inputA?.kind === 'number'
              ? asVec4(inputA.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
        exprB =
          inputB?.kind === 'vec4'
            ? inputB.expr
            : inputB?.kind === 'number'
              ? asVec4(inputB.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
      }
      const maskA = `step(${halfExpr}, ${exprA})`
      const maskB = `step(${halfExpr}, ${exprB})`
      const expr = node.type === 'and' ? `(${maskA} * ${maskB})` : `max(${maskA}, ${maskB})`
      const name = nextVar(kind === 'number' ? 'num' : kind === 'color' ? 'col' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }
    if (node.type === 'not') {
      const input = getInput('value')
      const kind = input?.kind ?? 'number'
      if (kind !== 'number' && !isVectorKind(kind)) {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const halfExpr =
        kind === 'number'
          ? 'float(0.5)'
          : kind === 'color'
            ? 'color(0.5)'
            : kind === 'vec2'
              ? 'vec2(0.5, 0.5)'
              : kind === 'vec3'
                ? 'vec3(0.5, 0.5, 0.5)'
                : 'vec4(0.5, 0.5, 0.5, 0.5)'
      let exprValue = input?.expr ?? 'float(0.0)'
      if (kind === 'color') {
        exprValue =
          input?.kind === 'color'
            ? input.expr
            : input?.kind === 'number'
              ? asColor(input.expr, 'number')
              : 'color(0.0)'
      } else if (kind === 'vec2') {
        exprValue =
          input?.kind === 'vec2'
            ? input.expr
            : input?.kind === 'number'
              ? asVec2(input.expr, 'number')
              : 'vec2(0.0, 0.0)'
      } else if (kind === 'vec3') {
        exprValue =
          input?.kind === 'vec3'
            ? input.expr
            : input?.kind === 'number'
              ? asVec3(input.expr, 'number')
              : 'vec3(0.0, 0.0, 0.0)'
      } else if (kind === 'vec4') {
        exprValue =
          input?.kind === 'vec4'
            ? input.expr
            : input?.kind === 'number'
              ? asVec4(input.expr, 'number')
              : 'vec4(0.0, 0.0, 0.0, 1.0)'
      }
      const mask = `step(${halfExpr}, ${exprValue})`
      const expr = `oneMinus(${mask})`
      const name = nextVar(kind === 'number' ? 'num' : kind === 'color' ? 'col' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = {
        expr: name,
        kind: kind === 'color' ? ('color' as const) : (kind as typeof kind),
      }
      cache.set(key, out)
      return out
    }
    if (node.type === 'remap' || node.type === 'remapClamp') {
      const input = getInput('value')
      const inLowInput = getInput('inLow')
      const inHighInput = getInput('inHigh')
      const outLowInput = getInput('outLow')
      const outHighInput = getInput('outHigh')
      const kind = input?.kind ?? 'number'
      const fn = node.type === 'remap' ? 'remap' : 'remapClamp'
      if (kind === 'number') {
        const valueExpr = input?.kind === 'number' ? input.expr : 'float(0.0)'
        const inLowExpr = inLowInput?.kind === 'number' ? inLowInput.expr : 'float(0.0)'
        const inHighExpr = inHighInput?.kind === 'number' ? inHighInput.expr : 'float(1.0)'
        const outLowExpr = outLowInput?.kind === 'number' ? outLowInput.expr : 'float(0.0)'
        const outHighExpr =
          outHighInput?.kind === 'number' ? outHighInput.expr : 'float(1.0)'
        const expr = `${fn}(${valueExpr}, ${inLowExpr}, ${inHighExpr}, ${outLowExpr}, ${outHighExpr})`
        const name = nextVar('num')
        decls.push(`const ${name} = ${expr};`)
        const out = { expr: name, kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      if (kind === 'vec2') {
        const valueExpr = input ? toVec2Expr(input) : 'vec2(0.0, 0.0)'
        const inLowExpr = inLowInput ? toVec2Expr(inLowInput) : 'vec2(0.0, 0.0)'
        const inHighExpr = inHighInput ? toVec2Expr(inHighInput) : 'vec2(1.0, 1.0)'
        const outLowExpr = outLowInput ? toVec2Expr(outLowInput) : 'vec2(0.0, 0.0)'
        const outHighExpr = outHighInput ? toVec2Expr(outHighInput) : 'vec2(1.0, 1.0)'
        const expr = `${fn}(${valueExpr}, ${inLowExpr}, ${inHighExpr}, ${outLowExpr}, ${outHighExpr})`
        const name = nextVar('vec')
        decls.push(`const ${name} = ${expr};`)
        const out = { expr: name, kind: 'vec2' as const }
        cache.set(key, out)
        return out
      }
      if (kind === 'vec3' || kind === 'color') {
        const valueExpr = input ? toVec3Expr(input) : 'vec3(0.0, 0.0, 0.0)'
        const inLowExpr = inLowInput ? toVec3Expr(inLowInput) : 'vec3(0.0, 0.0, 0.0)'
        const inHighExpr = inHighInput ? toVec3Expr(inHighInput) : 'vec3(1.0, 1.0, 1.0)'
        const outLowExpr = outLowInput ? toVec3Expr(outLowInput) : 'vec3(0.0, 0.0, 0.0)'
        const outHighExpr = outHighInput ? toVec3Expr(outHighInput) : 'vec3(1.0, 1.0, 1.0)'
        const expr = `${fn}(${valueExpr}, ${inLowExpr}, ${inHighExpr}, ${outLowExpr}, ${outHighExpr})`
        const name = nextVar('vec')
        decls.push(`const ${name} = ${expr};`)
        const out = {
          expr: name,
          kind: kind === 'color' ? ('color' as const) : ('vec3' as const),
        }
        cache.set(key, out)
        return out
      }
      if (kind === 'vec4') {
        const valueExpr = input ? toVec4Expr(input) : 'vec4(0.0, 0.0, 0.0, 1.0)'
        const inLowExpr = inLowInput ? toVec4Expr(inLowInput) : 'vec4(0.0, 0.0, 0.0, 1.0)'
        const inHighExpr = inHighInput ? toVec4Expr(inHighInput) : 'vec4(1.0, 1.0, 1.0, 1.0)'
        const outLowExpr = outLowInput ? toVec4Expr(outLowInput) : 'vec4(0.0, 0.0, 0.0, 1.0)'
        const outHighExpr = outHighInput ? toVec4Expr(outHighInput) : 'vec4(1.0, 1.0, 1.0, 1.0)'
        const expr = `${fn}(${valueExpr}, ${inLowExpr}, ${inHighExpr}, ${outLowExpr}, ${outHighExpr})`
        const name = nextVar('vec')
        decls.push(`const ${name} = ${expr};`)
        const out = { expr: name, kind: 'vec4' as const }
        cache.set(key, out)
        return out
      }
    }
    if (node.type === 'luminance') {
      const input = getInput('value')
      const sourceExpr = !input
        ? 'vec3(0.0, 0.0, 0.0)'
        : input.kind === 'vec3' || input.kind === 'color'
          ? input.expr
          : input.kind === 'vec2'
            ? `vec3(${input.expr}.x, ${input.expr}.y, 0.0)`
            : input.kind === 'vec4'
              ? `vec3(${input.expr}.x, ${input.expr}.y, ${input.expr}.z)`
              : input.kind === 'number'
                ? asVec3(input.expr, 'number')
                : 'vec3(0.0, 0.0, 0.0)'
      const expr = `luminance(${sourceExpr})`
      const name = nextVar('num')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }
    if (
      node.type === 'grayscale' ||
      node.type === 'saturation' ||
      node.type === 'posterize' ||
      node.type === 'sRGBTransferEOTF' ||
      node.type === 'sRGBTransferOETF' ||
      node.type === 'linearToneMapping' ||
      node.type === 'reinhardToneMapping' ||
      node.type === 'cineonToneMapping' ||
      node.type === 'acesFilmicToneMapping' ||
      node.type === 'agxToneMapping' ||
      node.type === 'neutralToneMapping'
    ) {
      const input = getInput('value')
      const sourceExpr = !input
        ? 'vec3(0.0, 0.0, 0.0)'
        : input.kind === 'vec3' || input.kind === 'color'
          ? input.expr
          : input.kind === 'vec2'
            ? `vec3(${input.expr}.x, ${input.expr}.y, 0.0)`
            : input.kind === 'vec4'
              ? `vec3(${input.expr}.x, ${input.expr}.y, ${input.expr}.z)`
              : input.kind === 'number'
                ? asVec3(input.expr, 'number')
                : 'vec3(0.0, 0.0, 0.0)'
      let expr = sourceExpr
      if (node.type === 'grayscale') {
        expr = `grayscale(${sourceExpr})`
      } else if (node.type === 'saturation') {
        const amountInput = getInput('amount')
        const amountExpr = amountInput?.kind === 'number' ? amountInput.expr : 'float(1.0)'
        expr = `saturation(${sourceExpr}, ${amountExpr})`
      } else if (node.type === 'posterize') {
        const stepsInput = getInput('steps')
        const stepsExpr = stepsInput?.kind === 'number' ? stepsInput.expr : 'float(4.0)'
        expr = `posterize(${sourceExpr}, ${stepsExpr})`
      } else if (node.type === 'sRGBTransferEOTF') {
        expr = `sRGBTransferEOTF(${sourceExpr})`
      } else if (node.type === 'sRGBTransferOETF') {
        expr = `sRGBTransferOETF(${sourceExpr})`
      } else if (node.type === 'linearToneMapping') {
        expr = `linearToneMapping(${sourceExpr}, float(1))`
      } else if (node.type === 'reinhardToneMapping') {
        expr = `reinhardToneMapping(${sourceExpr}, float(1))`
      } else if (node.type === 'cineonToneMapping') {
        expr = `cineonToneMapping(${sourceExpr}, float(1))`
      } else if (node.type === 'acesFilmicToneMapping') {
        expr = `acesFilmicToneMapping(${sourceExpr}, float(1))`
      } else if (node.type === 'agxToneMapping') {
        expr = `agxToneMapping(${sourceExpr}, float(1))`
      } else {
        expr = `neutralToneMapping(${sourceExpr}, float(1))`
      }
      const name = nextVar('col')
      decls.push(`const ${name} = ${expr};`)
      const kind = input?.kind === 'color' || !input ? ('color' as const) : ('vec3' as const)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }

    if (
      node.type === 'hash' ||
      node.type === 'rand' ||
      node.type === 'interleavedGradientNoise'
    ) {
      const input = getInput(node.type === 'hash' ? 'value' : 'uv')
      const inputExpr = input ? toVec2Expr(input) : 'uv()'
      const fn = node.type === 'hash' ? 'hash' : node.type === 'rand' ? 'rand' : 'interleavedGradientNoise'
      const name = nextVar('num')
      decls.push(`const ${name} = ${fn}(${inputExpr});`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }

    if (
      node.type === 'blendBurn' ||
      node.type === 'blendDodge' ||
      node.type === 'blendScreen' ||
      node.type === 'blendOverlay' ||
      node.type === 'blendColor'
    ) {
      const base = getInput('base')
      const blend = getInput('blend')
      const baseExpr = base ? toVec3Expr(base) : 'vec3(0.0, 0.0, 0.0)'
      const blendExpr = blend ? toVec3Expr(blend) : 'vec3(1.0, 1.0, 1.0)'
      const fn = node.type
      const name = nextVar('col')
      decls.push(`const ${name} = ${fn}(${baseExpr}, ${blendExpr});`)
      const kind = (base?.kind === 'color' || !base) ? ('color' as const) : ('vec3' as const)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }

    if (node.type === 'premultiplyAlpha' || node.type === 'unpremultiplyAlpha') {
      const input = getInput('value')
      if (!input || (!isVectorKind(input.kind) && input.kind !== 'number')) {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const expr = `${node.type}(${input.expr})`
      const name = nextVar(input.kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: input.kind }
      cache.set(key, out)
      return out
    }

    if (node.type === 'hue' || node.type === 'vibrance') {
      const input = getInput('value')
      const amountInput = getInput('amount')
      const sourceExpr = input ? toVec3Expr(input) : 'vec3(0.0, 0.0, 0.0)'
      const amountExpr = amountInput?.kind === 'number' ? amountInput.expr : 'float(1.0)'
      const fn = node.type
      const name = nextVar('col')
      decls.push(`const ${name} = ${fn}(${sourceExpr}, ${amountExpr});`)
      const kind = (input?.kind === 'color' || !input) ? ('color' as const) : ('vec3' as const)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }

    if (node.type === 'cdl') {
      const input = getInput('value')
      const power = getInput('power')
      const slope = getInput('slope')
      const offset = getInput('offset')
      const sourceExpr = input ? toVec3Expr(input) : 'vec3(0.0, 0.0, 0.0)'
      const powerExpr = power ? toVec3Expr(power) : 'vec3(1.0, 1.0, 1.0)'
      const slopeExpr = slope ? toVec3Expr(slope) : 'vec3(1.0, 1.0, 1.0)'
      const offsetExpr = offset ? toVec3Expr(offset) : 'vec3(0.0, 0.0, 0.0)'
      const name = nextVar('col')
      decls.push(`const ${name} = cdl(${sourceExpr}, ${powerExpr}, ${slopeExpr}, ${offsetExpr});`)
      const kind = (input?.kind === 'color' || !input) ? ('color' as const) : ('vec3' as const)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }

    if (node.type === 'mxContrast') {
      const input = getInput('value')
      const amount = getInput('amount')
      const pivot = getInput('pivot')
      const sourceExpr = input ? toVec3Expr(input) : 'vec3(0.0, 0.0, 0.0)'
      const amountExpr = amount?.kind === 'number' ? amount.expr : 'float(1.0)'
      const pivotExpr = pivot?.kind === 'number' ? pivot.expr : 'float(0.5)'
      const name = nextVar('col')
      decls.push(`const ${name} = mx_contrast(${sourceExpr}, ${amountExpr}, ${pivotExpr});`)
      const kind = (input?.kind === 'color' || !input) ? ('color' as const) : ('vec3' as const)
      const out = { expr: name, kind }
      cache.set(key, out)
      return out
    }

    if (node.type === 'mxHsvToRgb' || node.type === 'mxRgbToHsv') {
      const input = getInput('value')
      const sourceExpr = input ? toVec3Expr(input) : 'vec3(0.0, 0.0, 0.0)'
      const fn = node.type === 'mxHsvToRgb' ? 'mx_hsvtorgb' : 'mx_rgbtohsv'
      const name = nextVar('vec')
      decls.push(`const ${name} = ${fn}(${sourceExpr});`)
      const out = { expr: name, kind: 'vec3' as const }
      cache.set(key, out)
      return out
    }

    if (
      node.type === 'oscSine' ||
      node.type === 'oscSquare' ||
      node.type === 'oscTriangle' ||
      node.type === 'oscSawtooth'
    ) {
      const input = getInput('value')
      if (!input || (!isVectorKind(input.kind) && input.kind !== 'number')) {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const expr = `${node.type}(${input.expr})`
      const name = nextVar(input.kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: input.kind }
      cache.set(key, out)
      return out
    }

    if (node.type === 'parabola' || node.type === 'gain' || node.type === 'sinc') {
      const input = getInput('value')
      const kInput = getInput('k')
      if (!input || (!isVectorKind(input.kind) && input.kind !== 'number')) {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const kExpr = kInput?.kind === 'number' ? kInput.expr : 'float(1.0)'
      const expr = `${node.type}(${input.expr}, ${kExpr})`
      const name = nextVar(input.kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: input.kind }
      cache.set(key, out)
      return out
    }
    if (node.type === 'pcurve') {
      const input = getInput('value')
      const aInput = getInput('a')
      const bInput = getInput('b')
      if (!input || (!isVectorKind(input.kind) && input.kind !== 'number')) {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const aExpr = aInput?.kind === 'number' ? aInput.expr : 'float(1.0)'
      const bExpr = bInput?.kind === 'number' ? bInput.expr : 'float(1.0)'
      const expr = `pcurve(${input.expr}, ${aExpr}, ${bExpr})`
      const name = nextVar(input.kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: input.kind }
      cache.set(key, out)
      return out
    }

    if (node.type === 'mxCellNoiseFloat') {
      const texcoord = getInput('texcoord')
      const coordExpr = texcoord
        ? texcoord.kind === 'vec3' || texcoord.kind === 'color' || texcoord.kind === 'vec4'
          ? toVec3Expr(texcoord)
          : toVec2Expr(texcoord)
        : 'uv()'
      const name = nextVar('num')
      decls.push(`const ${name} = mx_cell_noise_float(${coordExpr});`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'equirectUV') {
      const input = getInput('direction')
      const dirExpr = input ? toVec3Expr(input) : 'normalWorld'
      const name = nextVar('vec')
      decls.push(`const ${name} = equirectUV(${dirExpr});`)
      const out = { expr: name, kind: 'vec2' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'parallaxUV') {
      const uvInput = getInput('uv')
      const scaleInput = getInput('scale')
      const uvExpr = toVec2Expr(uvInput ?? { expr: 'uv()', kind: 'vec2' })
      const scaleExpr = scaleInput?.kind === 'number' ? scaleInput.expr : 'float(0.1)'
      const name = nextVar('vec')
      decls.push(`const ${name} = parallaxUV(${uvExpr}, ${scaleExpr});`)
      const out = { expr: name, kind: 'vec2' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'mxRotate2d') {
      const input = getInput('value')
      const angle = getInput('angle')
      const valueExpr = input ? toVec2Expr(input) : 'uv()'
      const angleExpr = angle?.kind === 'number' ? angle.expr : 'float(0.0)'
      const name = nextVar('vec')
      decls.push(`const ${name} = mx_rotate2d(${valueExpr}, ${angleExpr});`)
      const out = { expr: name, kind: 'vec2' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'bumpMap') {
      const input = getInput('value')
      const scaleInput = getInput('scale')
      const valueExpr = input?.kind === 'number' ? input.expr : 'float(0.0)'
      const scaleExpr = scaleInput?.kind === 'number' ? scaleInput.expr : 'float(1.0)'
      const name = nextVar('vec')
      decls.push(`const ${name} = bumpMap(${valueExpr}, ${scaleExpr});`)
      const out = { expr: name, kind: 'vec3' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'mxHeightToNormal') {
      const input = getInput('value')
      const scaleInput = getInput('scale')
      const valueExpr = input?.kind === 'number' ? input.expr : 'float(0.0)'
      const scaleExpr = scaleInput?.kind === 'number' ? scaleInput.expr : 'float(1.0)'
      const name = nextVar('vec')
      decls.push(`const ${name} = mx_heighttonormal(${valueExpr}, ${scaleExpr});`)
      const out = { expr: name, kind: 'vec3' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'mxRampLR' || node.type === 'mxRampTB') {
      const inputA = getInput('a')
      const inputB = getInput('b')
      const coord = getInput('coord')
      const combined = combineTypes(inputA?.kind ?? 'number', inputB?.kind ?? 'number')
      if (combined === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      let exprA = inputA?.expr ?? 'float(0.0)'
      let exprB = inputB?.expr ?? 'float(1.0)'
      if (combined === 'color') {
        exprA = inputA?.kind === 'color' ? inputA.expr : inputA?.kind === 'number' ? asColor(inputA.expr, 'number') : 'color(0.0)'
        exprB = inputB?.kind === 'color' ? inputB.expr : inputB?.kind === 'number' ? asColor(inputB.expr, 'number') : 'color(1.0)'
      } else if (combined === 'vec3') {
        exprA = inputA?.kind === 'vec3' ? inputA.expr : inputA?.kind === 'number' ? asVec3(inputA.expr, 'number') : 'vec3(0.0, 0.0, 0.0)'
        exprB = inputB?.kind === 'vec3' ? inputB.expr : inputB?.kind === 'number' ? asVec3(inputB.expr, 'number') : 'vec3(1.0, 1.0, 1.0)'
      }
      const coordExpr = coord ? toVec2Expr(coord) : 'uv()'
      const fn = node.type === 'mxRampLR' ? 'mx_ramplr' : 'mx_ramptb'
      const name = nextVar(combined === 'number' ? 'num' : 'col')
      decls.push(`const ${name} = ${fn}(${exprA}, ${exprB}, ${coordExpr});`)
      const out = { expr: name, kind: combined }
      cache.set(key, out)
      return out
    }
    if (node.type === 'mxRamp4') {
      const tl = getInput('tl')
      const tr = getInput('tr')
      const bl = getInput('bl')
      const br = getInput('br')
      const coord = getInput('coord')
      const combined = combineTypes(
        combineTypes(tl?.kind ?? 'number', tr?.kind ?? 'number'),
        combineTypes(bl?.kind ?? 'number', br?.kind ?? 'number')
      )
      if (combined === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const toExpr = (input: ReturnType<typeof getInput>, fallback: string) => {
        if (!input) return fallback
        if (input.kind === combined) return input.expr
        if (input.kind === 'number' && combined === 'color') return asColor(input.expr, 'number')
        if (input.kind === 'number' && combined === 'vec3') return asVec3(input.expr, 'number')
        return input.expr
      }
      const tlExpr = toExpr(tl, 'float(0.0)')
      const trExpr = toExpr(tr, 'float(1.0)')
      const blExpr = toExpr(bl, 'float(0.0)')
      const brExpr = toExpr(br, 'float(1.0)')
      const coordExpr = coord ? toVec2Expr(coord) : 'uv()'
      const name = nextVar(combined === 'number' ? 'num' : 'col')
      decls.push(`const ${name} = mx_ramp4(${tlExpr}, ${trExpr}, ${blExpr}, ${brExpr}, ${coordExpr});`)
      const out = { expr: name, kind: combined }
      cache.set(key, out)
      return out
    }
    if (node.type === 'mxSplitLR' || node.type === 'mxSplitTB') {
      const inputA = getInput('a')
      const inputB = getInput('b')
      const centerInput = getInput('center')
      const coord = getInput('coord')
      const combined = combineTypes(inputA?.kind ?? 'number', inputB?.kind ?? 'number')
      if (combined === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      let exprA = inputA?.expr ?? 'float(0.0)'
      let exprB = inputB?.expr ?? 'float(1.0)'
      if (combined === 'color') {
        exprA = inputA?.kind === 'color' ? inputA.expr : inputA?.kind === 'number' ? asColor(inputA.expr, 'number') : 'color(0.0)'
        exprB = inputB?.kind === 'color' ? inputB.expr : inputB?.kind === 'number' ? asColor(inputB.expr, 'number') : 'color(1.0)'
      } else if (combined === 'vec3') {
        exprA = inputA?.kind === 'vec3' ? inputA.expr : inputA?.kind === 'number' ? asVec3(inputA.expr, 'number') : 'vec3(0.0, 0.0, 0.0)'
        exprB = inputB?.kind === 'vec3' ? inputB.expr : inputB?.kind === 'number' ? asVec3(inputB.expr, 'number') : 'vec3(1.0, 1.0, 1.0)'
      }
      const centerExpr = centerInput?.kind === 'number' ? centerInput.expr : 'float(0.5)'
      const coordExpr = coord ? toVec2Expr(coord) : 'uv()'
      const fn = node.type === 'mxSplitLR' ? 'mx_splitlr' : 'mx_splittb'
      const name = nextVar(combined === 'number' ? 'num' : 'col')
      decls.push(`const ${name} = ${fn}(${exprA}, ${exprB}, ${centerExpr}, ${coordExpr});`)
      const out = { expr: name, kind: combined }
      cache.set(key, out)
      return out
    }

    if (
      node.type === 'reciprocal' ||
      node.type === 'cbrt' ||
      node.type === 'inverseSqrt'
    ) {
      const input = getInput('value')
      if (!input || (!isVectorKind(input.kind) && input.kind !== 'number')) {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      const expr = `${node.type}(${input.expr})`
      const name = nextVar(input.kind === 'number' ? 'num' : 'vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: input.kind }
      cache.set(key, out)
      return out
    }

    if (node.type === 'lengthSq') {
      const input = getInput('value')
      const valueExpr = input && isVectorKind(input.kind) ? input.expr : 'vec3(0.0, 0.0, 0.0)'
      const name = nextVar('num')
      decls.push(`const ${name} = lengthSq(${valueExpr});`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'difference') {
      const inputA = getInput('a') ?? { expr: 'float(0.0)', kind: 'number' as const }
      const inputB = getInput('b') ?? { expr: 'float(0.0)', kind: 'number' as const }
      const combined = combineTypes(inputA.kind, inputB.kind)
      if (combined === 'unknown') {
        const out = { expr: 'float(0.0)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      if (combined === 'number') {
        const expr = `difference(${inputA.expr}, ${inputB.expr})`
        const name = nextVar('num')
        decls.push(`const ${name} = ${expr};`)
        const out = { expr: name, kind: 'number' as const }
        cache.set(key, out)
        return out
      }
      let exprA = inputA.expr
      let exprB = inputB.expr
      if (combined === 'color') {
        exprA = inputA.kind === 'color' ? inputA.expr : inputA.kind === 'number' ? asColor(inputA.expr, 'number') : 'color(0.0)'
        exprB = inputB.kind === 'color' ? inputB.expr : inputB.kind === 'number' ? asColor(inputB.expr, 'number') : 'color(0.0)'
      } else if (combined === 'vec2') {
        exprA = inputA.kind === 'vec2' ? inputA.expr : inputA.kind === 'number' ? asVec2(inputA.expr, 'number') : 'vec2(0.0, 0.0)'
        exprB = inputB.kind === 'vec2' ? inputB.expr : inputB.kind === 'number' ? asVec2(inputB.expr, 'number') : 'vec2(0.0, 0.0)'
      } else if (combined === 'vec3') {
        exprA = inputA.kind === 'vec3' ? inputA.expr : inputA.kind === 'number' ? asVec3(inputA.expr, 'number') : 'vec3(0.0, 0.0, 0.0)'
        exprB = inputB.kind === 'vec3' ? inputB.expr : inputB.kind === 'number' ? asVec3(inputB.expr, 'number') : 'vec3(0.0, 0.0, 0.0)'
      } else if (combined === 'vec4') {
        exprA = inputA.kind === 'vec4' ? inputA.expr : inputA.kind === 'number' ? asVec4(inputA.expr, 'number') : 'vec4(0.0, 0.0, 0.0, 1.0)'
        exprB = inputB.kind === 'vec4' ? inputB.expr : inputB.kind === 'number' ? asVec4(inputB.expr, 'number') : 'vec4(0.0, 0.0, 0.0, 1.0)'
      }
      const expr = `difference(${exprA}, ${exprB})`
      const name = nextVar('vec')
      decls.push(`const ${name} = ${expr};`)
      const out = { expr: name, kind: combined }
      cache.set(key, out)
      return out
    }

    if (node.type === 'mxAastep') {
      const threshold = getInput('threshold')
      const value = getInput('value')
      const thresholdExpr = threshold?.kind === 'number' ? threshold.expr : 'float(0.5)'
      const valueExpr = value?.kind === 'number' ? value.expr : 'float(0.0)'
      const name = nextVar('num')
      decls.push(`const ${name} = mx_aastep(${thresholdExpr}, ${valueExpr});`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'mxSafepower') {
      const value = getInput('value')
      const expInput = getInput('exp')
      const valueExpr = value?.kind === 'number' ? value.expr : 'float(0.0)'
      const expExpr = expInput?.kind === 'number' ? expInput.expr : 'float(1.0)'
      const name = nextVar('num')
      decls.push(`const ${name} = mx_safepower(${valueExpr}, ${expExpr});`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'shapeCircle') {
      const uvInput = getInput('uv')
      const radiusInput = getInput('radius')
      const uvExpr = toVec2Expr(uvInput ?? { expr: 'uv()', kind: 'vec2' })
      const radiusExpr = radiusInput?.kind === 'number' ? radiusInput.expr : 'float(0.5)'
      const name = nextVar('num')
      decls.push(`const ${name} = shapeCircle(${uvExpr}, ${radiusExpr});`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'directionToColor' || node.type === 'colorToDirection') {
      const input = getInput('value')
      const sourceExpr = input ? toVec3Expr(input) : 'vec3(0.0, 0.0, 0.0)'
      const fn = node.type
      const name = nextVar('vec')
      decls.push(`const ${name} = ${fn}(${sourceExpr});`)
      const out = { expr: name, kind: 'vec3' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'rangeFogFactor') {
      const nearInput = getInput('near')
      const farInput = getInput('far')
      const nearExpr = nearInput?.kind === 'number' ? nearInput.expr : 'float(0.0)'
      const farExpr = farInput?.kind === 'number' ? farInput.expr : 'float(100.0)'
      const name = nextVar('num')
      decls.push(`const ${name} = rangeFogFactor(${nearExpr}, ${farExpr});`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }
    if (node.type === 'densityFogFactor') {
      const densityInput = getInput('density')
      const densityExpr = densityInput?.kind === 'number' ? densityInput.expr : 'float(0.00025)'
      const name = nextVar('num')
      decls.push(`const ${name} = densityFogFactor(${densityExpr});`)
      const out = { expr: name, kind: 'number' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'material' || node.type === 'physicalMaterial') {
      const pin = outputPin ?? 'baseColor'
      const base = getInput('baseColor')
      const tex = getInput('baseColorTexture')
      if (pin === 'baseColor') {
        if (base && tex) {
          const expr = `${asColor(base.expr, base.kind === 'number' ? 'number' : 'color')}.mul(${asColor(
            tex.expr,
            tex.kind === 'number' ? 'number' : 'color',
          )})`
          const name = nextVar('col')
          decls.push(`const ${name} = ${expr};`)
          const out = { expr: name, kind: 'color' as const }
          cache.set(key, out)
          return out
        }
        if (base) {
          const out = {
            expr: asColor(base.expr, base.kind === 'number' ? 'number' : 'color'),
            kind: 'color' as const,
          }
          cache.set(key, out)
          return out
        }
        if (tex) {
          const out = {
            expr: asColor(tex.expr, tex.kind === 'number' ? 'number' : 'color'),
            kind: 'color' as const,
          }
          cache.set(key, out)
          return out
        }
      }
      if (pin === 'roughness' || pin === 'metalness') {
        const input = getInput(pin)
        const out = input ?? { expr: 'float(0.7)', kind: 'number' as const }
        cache.set(key, out)
        return out
      }
    }

    if (node.type === 'toonMaterial' || node.type === 'phongMaterial' || node.type === 'matcapMaterial') {
      const pin = outputPin ?? 'baseColor'
      if (pin === 'baseColor') {
        const base = getInput('baseColor')
        const tex = getInput('baseColorTexture')
        if (base && tex) {
          const expr = `${asColor(base.expr, base.kind === 'number' ? 'number' : 'color')}.mul(${asColor(
            tex.expr,
            tex.kind === 'number' ? 'number' : 'color',
          )})`
          const name = nextVar('col')
          decls.push(`const ${name} = ${expr};`)
          const out = { expr: name, kind: 'color' as const }
          cache.set(key, out)
          return out
        }
        if (base) {
          const out = {
            expr: asColor(base.expr, base.kind === 'number' ? 'number' : 'color'),
            kind: 'color' as const,
          }
          cache.set(key, out)
          return out
        }
        if (tex) {
          const out = {
            expr: asColor(tex.expr, tex.kind === 'number' ? 'number' : 'color'),
            kind: 'color' as const,
          }
          cache.set(key, out)
          return out
        }
      }
    }
    if (node.type === 'normalMaterial') {
      const out = { expr: `color(${FALLBACK_COLOR})`, kind: 'color' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'output') {
      const input = getInput('baseColor')
      const out =
        input?.kind === 'color'
          ? { expr: input.expr, kind: 'color' as const }
          : input?.kind === 'number'
            ? { expr: asColor(input.expr, 'number'), kind: 'color' as const }
            : { expr: `color(${FALLBACK_COLOR})`, kind: 'color' as const }
      cache.set(key, out)
      return out
    }

    if (node.type === 'vertexOutput') {
      const input = getInput('position')
      const out =
        input?.kind === 'vec3'
          ? { expr: input.expr, kind: 'vec3' as const }
          : input?.kind === 'number'
            ? { expr: asVec3(input.expr, 'number'), kind: 'vec3' as const }
            : { expr: 'vec3(0.0, 0.0, 0.0)', kind: 'vec3' as const }
      cache.set(key, out)
      return out
    }

    const fallback = { expr: 'float(0.0)', kind: 'number' as const }
    cache.set(key, fallback)
    return fallback
  }

  const baseColor = resolveExpr(baseColorConn.from.nodeId, baseColorConn.from.pin)
  const roughnessConn = getOutputConnection(connectionMap, outputNode, 'roughness')
  const metalnessConn = getOutputConnection(connectionMap, outputNode, 'metalness')
  const roughness = roughnessConn
    ? resolveExpr(roughnessConn.from.nodeId, roughnessConn.from.pin)
    : { expr: 'float(0.7)', kind: 'number' as const }
  const metalness = metalnessConn
    ? resolveExpr(metalnessConn.from.nodeId, metalnessConn.from.pin)
    : { expr: 'float(0.1)', kind: 'number' as const }

  const baseColorExpr =
    baseColor.kind === 'color'
      ? baseColor.expr
      : baseColor.kind === 'number'
        ? asColor(baseColor.expr, 'number')
        : `color(${FALLBACK_COLOR})`
  const { standardMaterialNode, physicalMaterialNode, basicMaterialNode, toonMaterialNode, phongMaterialNode, matcapMaterialNode, normalMaterialNode } =
    getMaterialNodesFromOutput(outputNode, nodeMap, connectionMap)
  const getStandardConn = (pin: string) => {
    const node = standardMaterialNode ?? physicalMaterialNode
    return node ? connectionMap.get(`${node.id}:${pin}`) : null
  }
  const getStandardNumberExpr = (pin: string) => {
    const conn = getStandardConn(pin)
    if (!conn) return null
    const resolved = resolveExpr(conn.from.nodeId, conn.from.pin)
    return resolved.kind === 'number' ? resolved.expr : null
  }
  const getStandardColorExpr = (pin: string) => {
    const conn = getStandardConn(pin)
    if (!conn) return null
    const resolved = resolveExpr(conn.from.nodeId, conn.from.pin)
    if (resolved.kind === 'color') return resolved.expr
    if (resolved.kind === 'number') return asColor(resolved.expr, 'number')
    return null
  }
  const getStandardNumberLiteral = (pin: string) => {
    const conn = getStandardConn(pin)
    if (!conn) return null
    const source = nodeMap.get(conn.from.nodeId)
    if (source?.type === 'number') {
      return parseNumber(source.value)
    }
    return null
  }
  const getStandardTextureId = (pin: string) => {
    const conn = getStandardConn(pin)
    if (!conn) return null
    const source = nodeMap.get(conn.from.nodeId)
    if (source?.type === 'texture') return source.id
    return null
  }
  const getBasicConn = (pin: string) =>
    basicMaterialNode ? connectionMap.get(`${basicMaterialNode.id}:${pin}`) : null
  const getBasicNumberExpr = (pin: string) => {
    const conn = getBasicConn(pin)
    if (!conn) return null
    const resolved = resolveExpr(conn.from.nodeId, conn.from.pin)
    return resolved.kind === 'number' ? resolved.expr : null
  }
  const getBasicNumberLiteral = (pin: string) => {
    const conn = getBasicConn(pin)
    if (!conn) return null
    const source = nodeMap.get(conn.from.nodeId)
    if (source?.type === 'number') {
      return parseNumber(source.value)
    }
    return null
  }
  const getBasicTextureId = (pin: string) => {
    const conn = getBasicConn(pin)
    if (!conn) return null
    const source = nodeMap.get(conn.from.nodeId)
    if (source?.type === 'texture') return source.id
    return null
  }
  if (materialKind !== 'normal') {
    decls.push(`material.colorNode = ${baseColorExpr};`)
  }
  if (materialKind === 'standard' || materialKind === 'physical') {
    decls.push(`material.roughnessNode = ${roughness.expr};`)
    decls.push(`material.metalnessNode = ${metalness.expr};`)
    if (standardMaterialNode || physicalMaterialNode) {
      const emissiveExpr = getStandardColorExpr('emissive')
      if (emissiveExpr) {
        decls.push(`material.emissiveNode = ${emissiveExpr};`)
      }
      const emissiveMapId = getStandardTextureId('emissiveMap')
      if (emissiveMapId) {
        decls.push(`material.emissiveMap = textureFromNode('${emissiveMapId}');`)
      }
      const emissiveIntensity = getStandardNumberLiteral('emissiveIntensity')
      if (emissiveIntensity !== null) {
        decls.push(`material.emissiveIntensity = ${emissiveIntensity.toFixed(3)};`)
      }
      const roughnessMapId = getStandardTextureId('roughnessMap')
      if (roughnessMapId) {
        decls.push(`material.roughnessMap = textureFromNode('${roughnessMapId}');`)
      }
      const metalnessMapId = getStandardTextureId('metalnessMap')
      if (metalnessMapId) {
        decls.push(`material.metalnessMap = textureFromNode('${metalnessMapId}');`)
      }
      const normalMapId = getStandardTextureId('normalMap')
      if (normalMapId) {
        decls.push(`material.normalMap = textureFromNode('${normalMapId}');`)
      }
      const normalScale = getStandardNumberLiteral('normalScale')
      if (normalScale !== null) {
        const value = normalScale.toFixed(3)
        decls.push(`material.normalScale = new Vector2(${value}, ${value});`)
      }
      const aoMapId = getStandardTextureId('aoMap')
      if (aoMapId) {
        decls.push(`material.aoMap = textureFromNode('${aoMapId}');`)
      }
      const aoMapIntensity = getStandardNumberLiteral('aoMapIntensity')
      if (aoMapIntensity !== null) {
        decls.push(`material.aoMapIntensity = ${aoMapIntensity.toFixed(3)};`)
      }
      const envMapId = getStandardTextureId('envMap')
      if (envMapId) {
        decls.push(`material.envMap = textureFromNode('${envMapId}');`)
      }
      const envMapIntensity = getStandardNumberLiteral('envMapIntensity')
      if (envMapIntensity !== null) {
        decls.push(`material.envMapIntensity = ${envMapIntensity.toFixed(3)};`)
      }
      const opacityExpr = getStandardNumberExpr('opacity')
      if (opacityExpr) {
        decls.push(`material.opacityNode = ${opacityExpr};`)
      }
      const alphaTestExpr = getStandardNumberExpr('alphaTest')
      if (alphaTestExpr) {
        decls.push(`material.alphaTestNode = ${alphaTestExpr};`)
      }
      const alphaHashLiteral = getStandardNumberLiteral('alphaHash')
      if (alphaHashLiteral !== null) {
        decls.push(`material.alphaHash = ${alphaHashLiteral > 0.5 ? 'true' : 'false'};`)
      } else if (getStandardConn('alphaHash')) {
        decls.push('material.alphaHash = true;')
      }
      const opacityLiteral = getStandardNumberLiteral('opacity')
      if (opacityLiteral !== null) {
        decls.push(`material.transparent = ${opacityLiteral < 1 ? 'true' : 'false'};`)
      }
      if (materialKind === 'physical') {
        const clearcoatExpr = getStandardNumberExpr('clearcoat')
        if (clearcoatExpr) {
          decls.push(`material.clearcoatNode = ${clearcoatExpr};`)
        }
        const clearcoatLiteral = getStandardNumberLiteral('clearcoat')
        if (clearcoatLiteral !== null) {
          decls.push(`material.clearcoat = ${clearcoatLiteral.toFixed(3)};`)
        }
        const clearcoatRoughnessExpr = getStandardNumberExpr('clearcoatRoughness')
        if (clearcoatRoughnessExpr) {
          decls.push(`material.clearcoatRoughnessNode = ${clearcoatRoughnessExpr};`)
        }
        const clearcoatRoughnessLiteral = getStandardNumberLiteral('clearcoatRoughness')
        if (clearcoatRoughnessLiteral !== null) {
          decls.push(
            `material.clearcoatRoughness = ${clearcoatRoughnessLiteral.toFixed(3)};`,
          )
        }
        const clearcoatNormalId = getStandardTextureId('clearcoatNormal')
        if (clearcoatNormalId) {
          decls.push(
            `material.clearcoatNormalMap = textureFromNode('${clearcoatNormalId}');`,
          )
        }
      }
    }
  }
  if (materialKind === 'basic') {
    const opacityExpr = getBasicNumberExpr('opacity')
    if (opacityExpr) {
      decls.push(`material.opacityNode = ${opacityExpr};`)
    }
    const alphaTestExpr = getBasicNumberExpr('alphaTest')
    if (alphaTestExpr) {
      decls.push(`material.alphaTestNode = ${alphaTestExpr};`)
    }
    const alphaHashLiteral = getBasicNumberLiteral('alphaHash')
    if (alphaHashLiteral !== null) {
      decls.push(`material.alphaHash = ${alphaHashLiteral > 0.5 ? 'true' : 'false'};`)
    } else if (getBasicConn('alphaHash')) {
      decls.push('material.alphaHash = true;')
    }
    const mapId = getBasicTextureId('map')
    if (mapId) {
      decls.push(`material.map = textureFromNode('${mapId}');`)
    }
    const alphaMapId = getBasicTextureId('alphaMap')
    if (alphaMapId) {
      decls.push(`material.alphaMap = textureFromNode('${alphaMapId}');`)
      decls.push('material.transparent = true;')
    }
    const aoMapId = getBasicTextureId('aoMap')
    if (aoMapId) {
      decls.push(`material.aoMap = textureFromNode('${aoMapId}');`)
    }
    const envMapId = getBasicTextureId('envMap')
    if (envMapId) {
      decls.push(`material.envMap = textureFromNode('${envMapId}');`)
    }
    const reflectivity =
      getBasicNumberLiteral('reflectivity') ?? getBasicNumberLiteral('envMapIntensity')
    if (reflectivity !== null) {
      decls.push(`material.reflectivity = ${reflectivity.toFixed(3)};`)
    }
  }
  if (materialKind === 'toon' || materialKind === 'phong' || materialKind === 'matcap' || materialKind === 'normal') {
    const matNode = toonMaterialNode ?? phongMaterialNode ?? matcapMaterialNode ?? normalMaterialNode
    const getMatConn = (pin: string) =>
      matNode ? connectionMap.get(`${matNode.id}:${pin}`) : null
    const getMatNumberExpr = (pin: string) => {
      const conn = getMatConn(pin)
      if (!conn) return null
      const resolved = resolveExpr(conn.from.nodeId, conn.from.pin)
      return resolved.kind === 'number' ? resolved.expr : null
    }
    const getMatNumberLiteral = (pin: string) => {
      const conn = getMatConn(pin)
      if (!conn) return null
      const source = nodeMap.get(conn.from.nodeId)
      if (source?.type === 'number') {
        return parseNumber(source.value)
      }
      return null
    }
    const getMatColorExpr = (pin: string) => {
      const conn = getMatConn(pin)
      if (!conn) return null
      const resolved = resolveExpr(conn.from.nodeId, conn.from.pin)
      if (resolved.kind === 'color') return resolved.expr
      if (resolved.kind === 'number') return asColor(resolved.expr, 'number')
      return null
    }
    const getMatTextureId = (pin: string) => {
      const conn = getMatConn(pin)
      if (!conn) return null
      const source = nodeMap.get(conn.from.nodeId)
      if (source?.type === 'texture') return source.id
      return null
    }
    if (materialKind === 'toon' || materialKind === 'phong') {
      const emissiveConn = getMatConn('emissive')
      if (emissiveConn) {
        const emissiveSource = nodeMap.get(emissiveConn.from.nodeId)
        if (emissiveSource?.type === 'color') {
          decls.push(`material.emissive.set('${String(emissiveSource.value ?? '#000000')}');`)
        }
      }
      const emissiveMapId = getMatTextureId('emissiveMap')
      if (emissiveMapId) {
        decls.push(`material.emissiveMap = textureFromNode('${emissiveMapId}');`)
      }
      const emissiveIntensity = getMatNumberLiteral('emissiveIntensity')
      if (emissiveIntensity !== null) {
        decls.push(`material.emissiveIntensity = ${emissiveIntensity.toFixed(3)};`)
      }
    }
    if (materialKind === 'phong') {
      const specularExpr = getMatColorExpr('specular')
      if (specularExpr) {
        decls.push(`material.specularNode = ${specularExpr};`)
      }
      const shininessExpr = getMatNumberExpr('shininess')
      if (shininessExpr) {
        decls.push(`material.shininessNode = ${shininessExpr};`)
      }
    }
    const normalMapId = getMatTextureId('normalMap')
    if (normalMapId) {
      decls.push(`material.normalMap = textureFromNode('${normalMapId}');`)
    }
    const normalScale = getMatNumberLiteral('normalScale')
    if (normalScale !== null) {
      const value = normalScale.toFixed(3)
      decls.push(`material.normalScale = new Vector2(${value}, ${value});`)
    }
    const opacityExpr = getMatNumberExpr('opacity')
    if (opacityExpr) {
      decls.push(`material.opacityNode = ${opacityExpr};`)
    }
    const alphaTestExpr = getMatNumberExpr('alphaTest')
    if (alphaTestExpr) {
      decls.push(`material.alphaTestNode = ${alphaTestExpr};`)
    }
    const alphaHashLiteral = getMatNumberLiteral('alphaHash')
    if (alphaHashLiteral !== null) {
      decls.push(`material.alphaHash = ${alphaHashLiteral > 0.5 ? 'true' : 'false'};`)
    } else if (getMatConn('alphaHash')) {
      decls.push('material.alphaHash = true;')
    }
    const opacityLiteral = getMatNumberLiteral('opacity')
    if (opacityLiteral !== null) {
      decls.push(`material.transparent = ${opacityLiteral < 1 ? 'true' : 'false'};`)
    }
  }
  if (vertexOutputNode) {
    const positionConn = connectionMap.get(`${vertexOutputNode.id}:position`)
    if (positionConn) {
      const positionValue = resolveExpr(
        positionConn.from.nodeId,
        positionConn.from.pin,
      )
      const positionExpr =
        positionValue.kind === 'vec3'
          ? positionValue.expr
          : positionValue.kind === 'number'
            ? asVec3(positionValue.expr, 'number')
            : 'vec3(0.0, 0.0, 0.0)'
      decls.push(`material.positionNode = positionLocal.add(${positionExpr});`)
    } else {
      decls.push('material.positionNode = positionLocal;')
    }
  }

  decls.push('return material;')
  const code = decls.join('\n')
  const usedImports = tslImportNames.filter((name) => {
    const regex = new RegExp(`\\b${name}\\b`, 'g')
    return regex.test(code)
  })
  const importLine = usedImports.length
    ? `const { ${usedImports.join(', ')} } = TSL;`
    : ''
  return code
    .replace(`const { ${tslImportPlaceholder} } = TSL;`, importLine)
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}
