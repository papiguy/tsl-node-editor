import { useState, useEffect, useRef, useCallback } from 'react'
import {
  AmbientLight,
  BoxGeometry,
  Color,
  DirectionalLight,
  Mesh,
  PerspectiveCamera,
  Scene,
  Vector2,
  WebGPURenderer,
  MeshBasicNodeMaterial,
  MeshStandardNodeMaterial,
  MeshPhysicalNodeMaterial,
} from 'three/webgpu'
import { Raycaster, SRGBColorSpace, NoToneMapping } from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import WebGPU from 'three/addons/capabilities/WebGPU.js'
import * as TSL from 'three/tsl'
import { materialEditorDefaultMaterialCode } from './presets'

const debugLog = (...args: unknown[]) => {
  console.debug('[material-editor][SceneView]', ...args)
}

interface SceneViewProps {
  materialCode: string | null
  onEditMaterial: () => void
}

export default function SceneView({ materialCode, onEditMaterial }: SceneViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const meshRef = useRef<Mesh | null>(null)
  const rendererRef = useRef<WebGPURenderer | null>(null)
  const frameRef = useRef(0)
  const renderDebugFramesRef = useRef(0)
  const uniformsRef = useRef<{ time: { value: number } } | null>(null)
  const materialCodeRef = useRef<string | null>(materialCode)
  const [showButton, setShowButton] = useState(false)

  const applyMaterial = useCallback((code: string) => {
    const mesh = meshRef.current
    if (!mesh) {
      debugLog('applyMaterial skipped: mesh missing', {
        materialCodeLength: code.length,
      })
      return
    }

    try {
      debugLog('applyMaterial start', {
        materialCodeLength: code.length,
        matchesDefaultMaterialCode: code === materialEditorDefaultMaterialCode,
        materialCodePreview: code.slice(0, 160),
        existingMaterialType: mesh.material?.constructor?.name ?? 'unknown',
        geometryAttributes:
          'attributes' in mesh.geometry
            ? Object.keys(mesh.geometry.attributes).reduce<Record<string, number>>(
                (acc, key) => {
                  const attr = mesh.geometry.getAttribute(key)
                  acc[key] = attr?.count ?? 0
                  return acc
                },
                {},
              )
            : {},
      })

      console.debug('[material-editor][SceneView] materialCode full\n' + code)

      // Strip ES module imports and `export` keywords so the code can run as
      // a plain function body with injected runtime bindings.
      const stripped = code
        .replace(/^import\s+.*$/gm, '')
        .replace(/^export\s+/gm, '')
        .trim()

      debugLog('applyMaterial stripped', {
        strippedLength: stripped.length,
        strippedPreview: stripped.slice(0, 160),
      })

      const runtime = {
        TSL,
        MeshBasicNodeMaterial,
        MeshStandardNodeMaterial,
        MeshPhysicalNodeMaterial,
        Vector2,
      }

      const fn = new Function(
        'runtime',
        [
          'const { TSL, MeshBasicNodeMaterial, MeshStandardNodeMaterial, MeshPhysicalNodeMaterial, Vector2 } = runtime;',
          stripped,
          'return makeNodeMaterial();',
        ].join('\n'),
      ) as (r: typeof runtime) => { material: MeshStandardNodeMaterial; uniforms: { time: { value: number } } }

      const result = fn(runtime)
      debugLog('applyMaterial result', {
        materialType: result?.material?.constructor?.name ?? 'missing',
        hasUniforms: Boolean(result?.uniforms),
        hasTimeUniform: Boolean(result?.uniforms?.time),
        colorNodeType:
          result?.material && 'colorNode' in result.material
            ? (result.material.colorNode as { constructor?: { name?: string } } | undefined)
                ?.constructor?.name ?? typeof result.material.colorNode
            : 'missing',
        colorNodeDeclaredType:
          (result?.material.colorNode as { nodeType?: string } | undefined)?.nodeType ?? 'unknown',
        roughnessNodeType:
          (result?.material.roughnessNode as { constructor?: { name?: string } } | undefined)
            ?.constructor?.name ?? typeof result?.material.roughnessNode,
        roughnessNodeDeclaredType:
          (result?.material.roughnessNode as { nodeType?: string } | undefined)?.nodeType ??
          'unknown',
        metalnessNodeType:
          (result?.material.metalnessNode as { constructor?: { name?: string } } | undefined)
            ?.constructor?.name ?? typeof result?.material.metalnessNode,
        metalnessNodeDeclaredType:
          (result?.material.metalnessNode as { nodeType?: string } | undefined)?.nodeType ??
          'unknown',
      })
      result.material.needsUpdate = true
      mesh.material = result.material
      uniformsRef.current = result.uniforms
      renderDebugFramesRef.current = 3
      debugLog('applyMaterial assigned', {
        assignedMaterialType: mesh.material?.constructor?.name ?? 'unknown',
      })
    } catch (e) {
      console.error('[material-editor][SceneView] Failed to apply material:', e)
    }
  }, [])

  useEffect(() => {
    materialCodeRef.current = materialCode
    debugLog('materialCode prop changed', {
      materialCodeLength: materialCode?.length ?? 0,
    })
    if (materialCode) {
      applyMaterial(materialCode)
    }
  }, [materialCode, applyMaterial])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    if (!WebGPU.isAvailable()) {
      debugLog('WebGPU not available')
      container.textContent = 'WebGPU not available'
      return
    }

    let running = true

    const renderer = new WebGPURenderer({ antialias: true })
    renderer.setPixelRatio(window.devicePixelRatio || 1)
    renderer.outputColorSpace = SRGBColorSpace
    renderer.toneMapping = NoToneMapping
    rendererRef.current = renderer
    container.appendChild(renderer.domElement)

    const scene = new Scene()
    scene.background = new Color(0x1a1d23)

    const camera = new PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 100)
    camera.position.set(2, 1.5, 3)

    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.target.set(0, 0, 0)

    const ambient = new AmbientLight(0xffffff, 0.6)
    scene.add(ambient)
    const directional = new DirectionalLight(0xffffff, 1.2)
    directional.position.set(3, 5, 4)
    scene.add(directional)

    const geometry = new BoxGeometry(1, 1, 1)
    const material = new MeshStandardNodeMaterial()
    material.colorNode = TSL.color(0x4488ff)
    const mesh = new Mesh(geometry, material)
    scene.add(mesh)
    meshRef.current = mesh
    debugLog('scene initialized', {
      initialMaterialType: material.constructor.name,
      initialMaterialCodeLength: materialCodeRef.current?.length ?? 0,
    })
    if (materialCodeRef.current) {
      applyMaterial(materialCodeRef.current)
    }

    const raycaster = new Raycaster()
    const pointer = new Vector2()

    const onClick = (e: MouseEvent) => {
      const rect = renderer.domElement.getBoundingClientRect()
      pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
      pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
      raycaster.setFromCamera(pointer, camera)
      const intersects = raycaster.intersectObject(mesh)
      if (intersects.length > 0) {
        setShowButton(true)
      }
    }
    renderer.domElement.addEventListener('click', onClick)

    const resize = () => {
      const w = container.clientWidth
      const h = container.clientHeight
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    resize()
    window.addEventListener('resize', resize)

    const clock = { start: performance.now() }
    const animate = () => {
      if (!running) return
      frameRef.current = requestAnimationFrame(animate)
      controls.update()

      if (uniformsRef.current) {
        uniformsRef.current.time.value = (performance.now() - clock.start) / 1000
      }

      if (renderDebugFramesRef.current > 0) {
        renderDebugFramesRef.current -= 1
        debugLog('render frame', {
          remainingDebugFrames: renderDebugFramesRef.current,
          materialType: mesh.material?.constructor?.name ?? 'unknown',
          colorNodeType:
            'colorNode' in mesh.material
              ? ((mesh.material.colorNode as { constructor?: { name?: string } } | undefined)
                  ?.constructor?.name ?? typeof mesh.material.colorNode)
              : 'missing',
          colorNodeDeclaredType:
            'colorNode' in mesh.material
              ? ((mesh.material.colorNode as { nodeType?: string } | undefined)?.nodeType ??
                'unknown')
              : 'missing',
        })
      }

      renderer.render(scene, camera)
    }

    renderer.init().then(() => {
      if (running) animate()
    })

    return () => {
      running = false
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener('resize', resize)
      renderer.domElement.removeEventListener('click', onClick)
      meshRef.current = null
      uniformsRef.current = null
      renderer.dispose()
      container.removeChild(renderer.domElement)
    }
  }, [])

  return (
    <div className="scene-container">
      <div ref={containerRef} className="scene-canvas" />
      {showButton && (
        <button className="edit-material-btn" onClick={onEditMaterial}>
          Edit Material
        </button>
      )}
      {!showButton && (
        <div className="scene-hint">Click the cube to edit its material</div>
      )}
    </div>
  )
}
