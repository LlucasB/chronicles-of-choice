import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [user, setUser] = useState({ displayName: 'Jogador', email: 'convidado@exemplo.com' })
  const [userId] = useState(() => `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`)
  const [currentMode, setCurrentMode] = useState('adventure')
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [storyStarted, setStoryStarted] = useState(false)
  const [availableModes, setAvailableModes] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)

  const messagesEndRef = useRef(null)
  const appRef = useRef(null)

  // Simular login - remover quando adicionar Firebase
  useEffect(() => {
    // Usuário convidado por padrão
    setUser({ displayName: 'Jogador', email: 'convidado@exemplo.com' })
  }, [])

  // Fullscreen functionality
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      appRef.current?.requestFullscreen?.()
      setIsFullscreen(true)
    } else {
      document.exitFullscreen?.()
      setIsFullscreen(false)
    }
  }

  // Close fullscreen on ESC
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement)
    }

    document.addEventListener('fullscreenchange', handleFullscreenChange)
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange)
  }, [])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

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
          userId: userId,
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

  const sendMessage = async () => {
    if (!userInput.trim() || loading) return

    const userMessage = userInput.trim()
    setUserInput('')
    setLoading(true)

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
          userId: userId,
          userMessage
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setMessages(data.history || [])
      } else {
        alert('Erro ao continuar história: ' + data.error)
        setMessages(prev => prev.filter(msg => msg !== userMessageObj))
      }
    } catch (error) {
      console.error('Erro:', error)
      alert('Erro de conexão: ' + error.message)
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

  const exportStory = () => {
    const storyText = messages.map(msg => 
      `${msg.role === 'user' ? '👤 Você' : '📖 Narrador'}: ${msg.content}`
    ).join('\n\n')
    
    const blob = new Blob([storyText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `historia-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    alert('História exportada com sucesso!')
  }

  // Simular login/logout
  const handleLogin = () => {
    setUser({ 
      displayName: 'Jogador Conectado', 
      email: 'usuario@exemplo.com' 
    })
    setShowUserMenu(false)
  }

  const handleLogout = () => {
    setUser({ 
      displayName: 'Jogador', 
      email: 'convidado@exemplo.com' 
    })
    setShowUserMenu(false)
  }

  return (
    <div className={`app ${isFullscreen ? 'fullscreen' : ''}`} ref={appRef}>
      {/* Header */}
      <header className="app-header">
        <div className="header-left">
          <div className="logo">📖</div>
          <h1>Chronicles of Choice</h1>
        </div>

        <div className="header-right">
          {storyStarted && (
            <button className="header-btn" onClick={exportStory} title="Exportar História">
              💾 Exportar
            </button>
          )}
          
          <button 
            className="header-btn" 
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Sair da Tela Cheia' : 'Tela Cheia'}
          >
            {isFullscreen ? '⤵️' : '⤴️'}
          </button>

          <div className="user-menu">
            <button 
              className="user-avatar"
              onClick={() => setShowUserMenu(!showUserMenu)}
            >
              <span>👤</span>
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-info">
                  <strong>{user.displayName}</strong>
                  <span>{user.email}</span>
                </div>
                {user.email === 'convidado@exemplo.com' ? (
                  <button className="menu-item" onClick={handleLogin}>
                    🔐 Fazer Login
                  </button>
                ) : (
                  <button className="menu-item" onClick={handleLogout}>
                    🚪 Sair
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {!storyStarted ? (
          // Start Screen
          <div className="start-screen">
            <div className="welcome-section">
              <h2>Olá, {user.displayName}! 👋</h2>
              <p>Pronto para criar uma história épica?</p>
              {user.email === 'convidado@exemplo.com' && (
                <div className="guest-notice">
                  <p>💡 <strong>Dica:</strong> Faça login para salvar seu progresso!</p>
                </div>
              )}
            </div>

            <div className="setup-panel">
              {/* Mode Selection */}
              <section className="mode-section">
                <h3>🎮 Escolha o Modo</h3>
                <div className="mode-grid">
                  {availableModes.map(mode => (
                    <div
                      key={mode.id}
                      className={`mode-card ${currentMode === mode.id ? 'selected' : ''}`}
                      onClick={() => setCurrentMode(mode.id)}
                    >
                      <div className="mode-icon">
                        {mode.id === 'adventure' && '⚔️'}
                        {mode.id === 'romance' && '💖'}
                        {mode.id === 'horror' && '👻'}
                        {mode.id === 'fantasy' && '🐉'}
                      </div>
                      <h4>{mode.name}</h4>
                      <p>{mode.description}</p>
                    </div>
                  ))}
                </div>
              </section>

              {/* Context Input */}
              <section className="context-section">
                <h3>✨ Contexto da História</h3>
                <div className="context-input-wrapper">
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    placeholder={`Exemplo: "Sou um cavaleiro em busca do dragão lendário que aterroriza o reino. Minha espada está afiada e meu coração cheio de coragem."

Seja criativo! Descreva seu personagem, mundo ou situação inicial.`}
                    rows="5"
                    className="context-textarea"
                  />
                  <div className="textarea-footer">
                    <span>{context.length}/1000 caracteres</span>
                  </div>
                </div>
              </section>

              {/* Action Button */}
              <div className="action-section">
                <button
                  onClick={startStory}
                  disabled={loading || !context.trim()}
                  className="start-button"
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Iniciando...
                    </>
                  ) : (
                    '🚀 Começar Jornada'
                  )}
                </button>
              </div>
            </div>
          </div>
        ) : (
          // Chat Interface
          <div className="chat-interface">
            <div className="chat-header">
              <div className="chat-info">
                <span className="mode-tag">
                  {availableModes.find(m => m.id === currentMode)?.name}
                </span>
                <span className="message-count">{messages.length} mensagens</span>
              </div>
              <button className="new-story-btn" onClick={resetStory}>
                📝 Nova História
              </button>
            </div>

            {/* Messages */}
            <div className="messages-container">
              {messages.length === 0 ? (
                <div className="empty-chat">
                  <div className="empty-icon">💬</div>
                  <h3>Sua aventura começa aqui</h3>
                  <p>Envie sua primeira mensagem para iniciar a história</p>
                </div>
              ) : (
                messages.map((message, index) => (
                  <div
                    key={index}
                    className={`message ${message.role}`}
                  >
                    <div className="message-avatar">
                      {message.role === 'user' ? '👤' : '🤖'}
                    </div>
                    <div className="message-content">
                      <div className="message-bubble">
                        <p>{message.content}</p>
                        <span className="message-time">
                          {new Date(message.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
              
              {loading && (
                <div className="message assistant">
                  <div className="message-avatar">🤖</div>
                  <div className="message-content">
                    <div className="message-bubble">
                      <div className="typing-indicator">
                        <span></span>
                        <span></span>
                        <span></span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="input-section">
              <div className="input-container">
                <textarea
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Descreva sua ação ou fale com os personagens..."
                  rows="2"
                  disabled={loading}
                  className="message-input"
                />
                <button
                  onClick={sendMessage}
                  disabled={loading || !userInput.trim()}
                  className="send-button"
                >
                  {loading ? <div className="spinner-small"></div> : '📤'}
                </button>
              </div>
              <div className="input-hint">
                Pressione Enter para enviar • Shift+Enter para nova linha
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App