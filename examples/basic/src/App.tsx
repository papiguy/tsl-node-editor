import { TSLNodeEditor, EXAMPLE_GRAPH_PRESET } from 'tsl-node-editor'
import 'tsl-node-editor/style.css'

function App() {
  return <TSLNodeEditor disablePersistence initialGraph={EXAMPLE_GRAPH_PRESET.graph} />
}

export default App
