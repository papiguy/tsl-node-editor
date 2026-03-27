import { APPLE_GLASS_PRESET, TSLNodeEditor, EXAMPLE_GRAPH_PRESET } from 'tsl-node-editor'
import 'tsl-node-editor/style.css'

function App() {
  return (
    <TSLNodeEditor
      disablePersistence
      initialGraph={APPLE_GLASS_PRESET.graph}
      presets={[APPLE_GLASS_PRESET, EXAMPLE_GRAPH_PRESET]}
    />
  )
}

export default App
