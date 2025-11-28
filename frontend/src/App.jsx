import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
  const [currentMode, setCurrentMode] = useState('adventure')
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [storyStarted, setStoryStarted] = useState(false)
  const [availableModes, setAvailableModes] = useState([])

  const messagesEndRef = useRef(null)

  // Rolagem automática para a última mensagem
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Carregar modos disponíveis
  useEffect(() => {
    fetchAvailableModes()
  }, [])

  const fetchAvailableModes = async () => {
    try {
      const API_URL = import.meta.env.VITE_API_URL
      const response = await fetch(`${API_URL}/api/modes`)
      const data = await response.json()
      
      if (data.success) {
        setAvailableModes(data.modes)
      }
    } catch (error) {
      console.error('Erro ao carregar modos:', error)
    }
  }

  // Iniciar nova história
  const startStory = async () => {
    if (!context.trim()) {
      alert('Por favor, escreva um contexto para sua história!')
      return
    }

    setLoading(true)
    try {
      const API_URL = import.meta.env.VITE_API_URL
      
      const response = await fetch(`${API_URL}/api/start-story`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          userId,
          context: context.trim(),
          mode: currentMode
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.history || [])
        setStoryStarted(true)
      } else {
        alert('Erro ao iniciar história: ' + data.error)
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro de conexão: ' + error.message)
    }
    setLoading(false)
  }

  // Enviar mensagem para continuar a história
  const sendMessage = async () => {
    if (!userInput.trim() || loading) return

    const userMessage = userInput.trim()
    setUserInput('')
    setLoading(true)

    // Adicionar mensagem do usuário imediatamente
    const userMessageObj = {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    
    setMessages(prev => [...prev, userMessageObj])

    try {
      const API_URL = import.meta.env.VITE_API_URL
      
      const response = await fetch(`${API_URL}/api/continue-story`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          userId,
          userMessage
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.history || [])
      } else {
        alert('Erro ao continuar história: ' + data.error)
        // Remover a mensagem do usuário se deu erro
        setMessages(prev => prev.filter(msg => msg !== userMessageObj))
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro de conexão: ' + error.message)
      // Remover a mensagem do usuário se deu erro
      setMessages(prev => prev.filter(msg => msg !== userMessageObj))
    }
    setLoading(false)
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (storyStarted) {
        sendMessage()
      } else {
        startStory()
      }
    }
  }

  const resetStory = () => {
    setStoryStarted(false)
    setMessages([])
    setContext('')
    setUserInput('')
  }

  return (
    <div className="app" style={{ 
      padding: '20px', 
      fontFamily: 'Arial, sans-serif',
      maxWidth: '800px',
      margin: '0 auto',
      height: '100vh',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <header style={{ 
        textAlign: 'center', 
        marginBottom: '20px',
        borderBottom: '2px solid #007bff',
        paddingBottom: '10px'
      }}>
        <h1 style={{ margin: 0, color: '#007bff' }}>📖 Chronicles of Choice</h1>
        <p style={{ margin: '5px 0 0 0', color: '#666' }}>
          Crie e viva histórias interativas com IA
        </p>
      </header>

      {!storyStarted ? (
        // Tela de Início - Configuração
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              🎮 Escolha o Modo de Jogo:
            </label>
            <select 
              value={currentMode} 
              onChange={(e) => setCurrentMode(e.target.value)}
              style={{ 
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '5px'
              }}
            >
              {availableModes.map(mode => (
                <option key={mode.id} value={mode.id}>
                  {mode.name}
                </option>
              ))}
            </select>
            {availableModes.find(m => m.id === currentMode) && (
              <p style={{ fontSize: '14px', color: '#666', marginTop: '5px' }}>
                {availableModes.find(m => m.id === currentMode).description}
              </p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
              ✍️ Contexto da História:
            </label>
            <textarea
              value={context}
              onChange={(e) => setContext(e.target.value)}
              placeholder={`Descreva o contexto inicial. Exemplo:
"Eu sou um cavaleiro exilado procurando redenção. Minha família foi traída pelo rei, e agora busco provar minha honra enquanto viajo pelas terras esquecidas."

Ou seja criativo! A IA se adaptará ao seu contexto.`}
              rows="6"
              style={{ 
                width: '100%',
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '5px',
                resize: 'vertical'
              }}
            />
          </div>

          <button 
            onClick={startStory}
            disabled={loading || !context.trim()}
            style={{ 
              padding: '12px 24px',
              fontSize: '18px',
              backgroundColor: loading ? '#ccc' : '#007bff',
              color: 'white',
              border: 'none',
              borderRadius: '5px',
              cursor: (loading || !context.trim()) ? 'not-allowed' : 'pointer',
              alignSelf: 'center'
            }}
          >
            {loading ? '🔄 Iniciando...' : '🚀 Começar História'}
          </button>
        </div>
      ) : (
        // Tela de Chat - História em Andamento
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header do Chat */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            padding: '10px 0',
            borderBottom: '1px solid #eee',
            marginBottom: '10px'
          }}>
            <div>
              <strong>Modo: {availableModes.find(m => m.id === currentMode)?.name}</strong>
            </div>
            <button 
              onClick={resetStory}
              style={{ 
                padding: '5px 10px',
                backgroundColor: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '3px',
                cursor: 'pointer',
                fontSize: '12px'
              }}
            >
              Nova História
            </button>
          </div>

          {/* Área de Mensagens */}
          <div style={{ 
            flex: 1,
            overflowY: 'auto',
            padding: '10px',
            border: '1px solid #ddd',
            borderRadius: '5px',
            marginBottom: '10px',
            backgroundColor: '#f9f9f9'
          }}>
            {messages.length === 0 ? (
              <div style={{ 
                textAlign: 'center', 
                color: '#666',
                padding: '20px'
              }}>
                <p>Iniciando sua história épica...</p>
              </div>
            ) : (
              messages.map((message, index) => (
                <div key={index} style={{ 
                  marginBottom: '15px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: message.role === 'user' ? 'flex-end' : 'flex-start'
                }}>
                  <div style={{
                    maxWidth: '80%',
                    padding: '10px 15px',
                    borderRadius: '15px',
                    backgroundColor: message.role === 'user' ? '#007bff' : '#e9ecef',
                    color: message.role === 'user' ? 'white' : 'black',
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                  }}>
                    <div style={{ 
                      whiteSpace: 'pre-wrap',
                      lineHeight: '1.4'
                    }}>
                      {message.content}
                    </div>
                    <div style={{
                      fontSize: '11px',
                      opacity: 0.7,
                      marginTop: '5px',
                      textAlign: 'right'
                    }}>
                      {message.role === 'user' ? 'Você' : 'Narrador'}
                    </div>
                  </div>
                </div>
              ))
            )}
            {loading && (
              <div style={{ 
                display: 'flex',
                justifyContent: 'flex-start',
                marginBottom: '15px'
              }}>
                <div style={{
                  padding: '10px 15px',
                  borderRadius: '15px',
                  backgroundColor: '#e9ecef',
                  color: '#666',
                  fontStyle: 'italic'
                }}>
                  🔄 Escrevendo...
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input de Mensagem */}
          <div style={{ display: 'flex', gap: '10px' }}>
            <textarea
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Descreva sua ação ou fale com os personagens... (Enter para enviar)"
              rows="2"
              style={{ 
                flex: 1,
                padding: '10px',
                fontSize: '16px',
                border: '1px solid #ccc',
                borderRadius: '5px',
                resize: 'vertical'
              }}
              disabled={loading}
            />
            <button 
              onClick={sendMessage}
              disabled={loading || !userInput.trim()}
              style={{ 
                padding: '10px 20px',
                fontSize: '16px',
                backgroundColor: (loading || !userInput.trim()) ? '#ccc' : '#28a745',
                color: 'white',
                border: 'none',
                borderRadius: '5px',
                cursor: (loading || !userInput.trim()) ? 'not-allowed' : 'pointer',
                alignSelf: 'flex-end'
              }}
            >
              {loading ? '🔄' : '📤'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default App