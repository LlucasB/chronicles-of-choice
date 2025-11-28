import { useState } from 'react'
import './App.css'

function App() {
  const [prompt, setPrompt] = useState('')
  const [story, setStory] = useState('')
  const [loading, setLoading] = useState(false)

  const generateStory = async () => {
    setLoading(true)
    try {
      // No deploy, vai usar a URL do backend no Render
      const API_URL = import.meta.env.VITE_API_URL || '/api'
      
      const response = await fetch(`${API_URL}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      })
      
      const data = await response.json()
      if (data.success) {
        setStory(data.story)
      }
    } catch (error) {
      console.error('Error:', error)
    }
    setLoading(false)
  }

  return (
    <div className="app">
      <h1>📖 Chronicles of Choice</h1>
      <div className="container">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Comece sua história..."
          rows="4"
        />
        <button onClick={generateStory} disabled={loading}>
          {loading ? 'Gerando...' : 'Gerar História'}
        </button>
        {story && (
          <div className="story-output">
            <h3>Sua História:</h3>
            <p>{story}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App