import { useCallback, useState } from 'react'
import type { TSLNodeEditorGraph, TSLNodeEditorOutput } from 'tsl-node-editor'
import SceneView from './SceneView.tsx'
import EditorView from './EditorView.tsx'
import { materialEditorDefaultGraph, materialEditorDefaultMaterialCode } from './presets'
import './app.css'

const debugLog = (...args: unknown[]) => {
  console.debug('[material-editor][App]', ...args)
}

function App() {
  const [view, setView] = useState<'scene' | 'editor'>('scene')
  const [graph, setGraph] = useState<TSLNodeEditorGraph>(materialEditorDefaultGraph)
  const [materialCode, setMaterialCode] = useState<string | null>(materialEditorDefaultMaterialCode)
  const [previewMaterialCode, setPreviewMaterialCode] = useState<string | null>(
    materialEditorDefaultMaterialCode,
  )

  const openEditor = useCallback(() => {
    debugLog('openEditor', {
      savedMaterialCodeLength: materialCode?.length ?? 0,
    })
    setPreviewMaterialCode(materialCode)
    setView('editor')
  }, [materialCode])

  const handleEditorChange = useCallback((output: TSLNodeEditorOutput) => {
    debugLog('handleEditorChange', {
      graphNodes: output.graph.nodes.length,
      graphConnections: output.graph.connections.length,
      materialCodeLength: output.materialCode.length,
    })
    setPreviewMaterialCode(output.materialCode)
  }, [])

  const handleSave = useCallback((output: TSLNodeEditorOutput) => {
    debugLog('handleSave', {
      graphNodes: output.graph.nodes.length,
      graphConnections: output.graph.connections.length,
      materialCodeLength: output.materialCode.length,
    })
    setGraph(output.graph)
    setMaterialCode(output.materialCode)
    setPreviewMaterialCode(output.materialCode)
    setView('scene')
  }, [])

  const handleBack = useCallback(() => {
    debugLog('handleBack', {
      restoreSavedMaterialCodeLength: materialCode?.length ?? 0,
    })
    setPreviewMaterialCode(materialCode)
    setView('scene')
  }, [materialCode])

  return (
    <div className="app-shell">
      <SceneView
        materialCode={previewMaterialCode}
        onEditMaterial={openEditor}
      />
      {view === 'editor' ? (
        <div className="editor-overlay">
          <EditorView
            graph={graph}
            onChange={handleEditorChange}
            onSave={handleSave}
            onBack={handleBack}
          />
        </div>
      ) : null}
    </div>
  )
}

export default App
