import { useState } from 'react'
import './App.css'

function App() {
  const [prompt, setPrompt] = useState('')
  const [story, setStory] = useState('')
  const [loading, setLoading] = useState(false)

  const generateStory = async () => {
    console.log('🎯 Botão clicado!')
    setLoading(true)
    
    try {
      // ✅ CORREÇÃO: Use import.meta.env.VITE_API_URL corretamente
      const API_URL = import.meta.env.VITE_API_URL
      console.log('🔗 API URL:', API_URL)
      console.log('📤 Enviando prompt:', prompt)

      // ✅ CORREÇÃO: Adicione /api/ na rota
      const response = await fetch(`${API_URL}/api/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt })
      })
      
      console.log('📥 Status da resposta:', response.status)
      
      // ✅ CORREÇÃO: Melhor tratamento de erro
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
      
      const data = await response.json()
      console.log('📦 Dados recebidos:', data)
      
      if (data.success) {
        setStory(data.story)
        console.log('✅ História gerada com sucesso!')
      } else {
        console.error('❌ Erro na API:', data.error)
        alert('Erro ao gerar história: ' + data.error)
      }
    } catch (error) {
      console.error('💥 Erro fatal:', error)
      alert('Erro de conexão: ' + error.message)
    }
    setLoading(false)
  }

  return (
    <div className="app" style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>📖 Chronicles of Choice</h1>
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto' }}>
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Comece sua história... Exemplo: 'Eu sou um cavaleiro em uma missão para salvar o reino'"
          rows="4"
          style={{ 
            width: '100%', 
            padding: '10px',
            fontSize: '16px',
            border: '1px solid #ccc',
            borderRadius: '5px',
            marginBottom: '10px'
          }}
        />
        <button 
          onClick={generateStory} 
          disabled={loading}
          style={{ 
            padding: '10px 20px', 
            fontSize: '16px',
            backgroundColor: loading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? '🔄 Gerando...' : '🚀 Gerar História'}
        </button>
        
        {story && (
          <div className="story-output" style={{ 
            marginTop: '20px', 
            padding: '15px', 
            backgroundColor: '#f8f9fa',
            border: '1px solid #dee2e6',
            borderRadius: '5px'
          }}>
            <h3>📜 Sua História:</h3>
            <p style={{ 
              whiteSpace: 'pre-wrap',
              lineHeight: '1.6',
              fontSize: '16px'
            }}>{story}</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App