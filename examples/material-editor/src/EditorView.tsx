import { useCallback, useEffect, useRef, useState } from 'react'
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
  const saveTimeoutRef = useRef<number | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const handleChange = useCallback((output: TSLNodeEditorOutput) => {
    debugLog('handleChange', {
      graphNodes: output.graph.nodes.length,
      graphConnections: output.graph.connections.length,
      materialCodeLength: output.materialCode.length,
    })
    latestRef.current = output
    setIsSaving(false)
    onChange?.(output)
  }, [onChange])

  const handleSave = useCallback(() => {
    if (saveTimeoutRef.current !== null) {
      window.clearTimeout(saveTimeoutRef.current)
    }
    setIsSaving(true)
    // Let any pending editor state commit flush through the child's onChange effect
    // before reading the latest exported material payload.
    saveTimeoutRef.current = window.setTimeout(() => {
      saveTimeoutRef.current = null
      debugLog('handleSave', {
        hasLatest: Boolean(latestRef.current),
        materialCodeLength: latestRef.current?.materialCode.length ?? 0,
      })
      if (latestRef.current) {
        setIsSaving(false)
        onSave(latestRef.current)
        return
      }
      setIsSaving(false)
    }, 0)
  }, [onSave])

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current !== null) {
        window.clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div className="editor-container">
      <button className="back-btn" onClick={onBack}>
        Back
      </button>
      <button className="save-btn" onClick={handleSave} disabled={isSaving}>
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
