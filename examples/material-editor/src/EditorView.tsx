import { useCallback, useRef } from 'react'
import { TSLNodeEditor } from 'tsl-node-editor'
import type { TSLNodeEditorGraph, TSLNodeEditorOutput } from 'tsl-node-editor'
import 'tsl-node-editor/style.css'
import { materialEditorPresets } from './presets'

const debugLog = (...args: unknown[]) => {
  console.debug('[material-editor][EditorView]', ...args)
}

interface EditorViewProps {
  graph: TSLNodeEditorGraph
  onChange?: (output: TSLNodeEditorOutput) => void
  onSave: (output: TSLNodeEditorOutput) => void
  onBack: () => void
}

export default function EditorView({ graph, onChange, onSave, onBack }: EditorViewProps) {
  const latestRef = useRef<TSLNodeEditorOutput | null>(null)

  const handleChange = useCallback((output: TSLNodeEditorOutput) => {
    debugLog('handleChange', {
      graphNodes: output.graph.nodes.length,
      graphConnections: output.graph.connections.length,
      materialCodeLength: output.materialCode.length,
    })
    latestRef.current = output
    onChange?.(output)
  }, [onChange])

  const handleSave = () => {
    debugLog('handleSave', {
      hasLatest: Boolean(latestRef.current),
      materialCodeLength: latestRef.current?.materialCode.length ?? 0,
    })
    if (latestRef.current) {
      onSave(latestRef.current)
    }
  }

  return (
    <div className="editor-container">
      <button className="back-btn" onClick={onBack}>
        Back
      </button>
      <button className="save-btn" onClick={handleSave}>
        Save &amp; Go Back
      </button>
      <TSLNodeEditor
        hideGithubLink
        disablePersistence
        initialGraph={graph}
        onChange={handleChange}
        presets={materialEditorPresets}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  )
}
