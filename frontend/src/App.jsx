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
  const [showWelcome, setShowWelcome] = useState(true)

  const messagesEndRef = useRef(null)
  const fileInputRef = useRef(null)

  // Efeitos de áudio (seriam importados, mas vamos usar emoji por enquanto)
  const playSound = (type) => {
    // Em uma versão futura, adicionar sons
    console.log(`🔊 Playing sound: ${type}`);
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ 
      behavior: "smooth",
      block: "end"
    })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    fetchAvailableModes()
    
    // Esconder welcome após 3 segundos
    const timer = setTimeout(() => {
      setShowWelcome(false)
    }, 3000)
    
    return () => clearTimeout(timer)
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
      showNotification('Por favor, escreva um contexto para sua história!', 'warning')
      return
    }

    setLoading(true)
    playSound('start')
    
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
        showNotification('História iniciada com sucesso!', 'success')
      } else {
        showNotification('Erro ao iniciar história: ' + data.error, 'error')
      }
    } catch (error) {
      console.error('Erro:', error)
      showNotification('Erro de conexão: ' + error.message, 'error')
    }
    setLoading(false)
  }

  const sendMessage = async () => {
    if (!userInput.trim() || loading) return

    const userMessage = userInput.trim()
    setUserInput('')
    setLoading(true)
    playSound('send')

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
        playSound('receive')
      } else {
        showNotification('Erro ao continuar história: ' + data.error, 'error')
        setMessages(prev => prev.filter(msg => msg !== userMessageObj))
      }
    } catch (error) {
      console.error('Erro:', error)
      showNotification('Erro de conexão: ' + error.message, 'error')
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
    playSound('reset')
    showNotification('História reiniciada!', 'info')
  }

  const showNotification = (message, type = 'info') => {
    // Em uma versão futura, implementar sistema de notificações bonito
    console.log(`📢 ${type.toUpperCase()}: ${message}`);
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
    
    showNotification('História exportada com sucesso!', 'success')
  }

  const ModeCard = ({ mode, isSelected, onClick }) => (
    <div 
      className={`mode-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onClick(mode.id)}
    >
      <div className="mode-icon">
        {mode.id === 'adventure' && '⚔️'}
        {mode.id === 'romance' && '💖'}
        {mode.id === 'horror' && '👻'}
        {mode.id === 'fantasy' && '🐉'}
      </div>
      <h3>{mode.name}</h3>
      <p>{mode.description}</p>
      <div className="selection-indicator">
        {isSelected && '✓'}
      </div>
    </div>
  )

  return (
    <div className="app">
      {/* Welcome Animation */}
      {showWelcome && (
        <div className="welcome-overlay">
          <div className="welcome-content">
            <div className="logo-animation">
              <div className="logo">📖</div>
              <h1>Chronicles of Choice</h1>
            </div>
            <div className="loading-bar">
              <div className="loading-progress"></div>
            </div>
          </div>
        </div>
      )}

      {/* Background Elements */}
      <div className="background-effects">
        <div className="floating-shapes">
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
        </div>
      </div>

      <div className="app-container">
        {/* Header */}
        <header className="app-header">
          <div className="header-content">
            <div className="logo-section">
              <div className="logo">📖</div>
              <h1>Chronicles of Choice</h1>
            </div>
            <div className="header-actions">
              {storyStarted && (
                <>
                  <button className="icon-button" onClick={exportStory} title="Exportar História">
                    💾
                  </button>
                  <button className="icon-button" onClick={resetStory} title="Nova História">
                    🔄
                  </button>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="main-content">
          {!storyStarted ? (
            // Start Screen
            <div className="start-screen">
              <div className="hero-section">
                <h2>Crie Histórias Épicas com IA</h2>
                <p>Entre em mundos fantásticos onde suas escolhas moldam o destino</p>
              </div>

              <div className="setup-panel">
                {/* Mode Selection */}
                <section className="mode-section">
                  <h3>🎮 Escolha seu Modo de Aventura</h3>
                  <div className="mode-grid">
                    {availableModes.map(mode => (
                      <ModeCard
                        key={mode.id}
                        mode={mode}
                        isSelected={currentMode === mode.id}
                        onClick={setCurrentMode}
                      />
                    ))}
                  </div>
                </section>

                {/* Context Input */}
                <section className="context-section">
                  <h3>✨ Crie seu Contexto</h3>
                  <div className="context-input-container">
                    <textarea
                      value={context}
                      onChange={(e) => setContext(e.target.value)}
                      placeholder={`🎭 Descreva seu personagem e mundo...

Exemplos:
• "Sou um ladino elfo em busca do Cristal Perdido de Eldoria"
• "Uma estudante universitária descobre poderes mágicos em uma biblioteca antiga"
• "Um androide ganha consciência em uma sociedade distópica"

Seja criativo! A IA se adaptará à sua visão.`}
                      rows="6"
                      className="context-textarea"
                    />
                    <div className="textarea-footer">
                      <span className="char-count">{context.length}/500</span>
                    </div>
                  </div>
                </section>

                {/* Action Button */}
                <div className="action-section">
                  <button 
                    onClick={startStory}
                    disabled={loading || !context.trim()}
                    className={`start-button ${loading ? 'loading' : ''}`}
                  >
                    {loading ? (
                      <>
                        <div className="button-spinner"></div>
                        Iniciando Aventura...
                      </>
                    ) : (
                      <>
                        🚀 Iniciar Jornada Épica
                      </>
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
                  <span className="mode-badge">
                    {availableModes.find(m => m.id === currentMode)?.name}
                  </span>
                  <span className="message-count">
                    {messages.length} mensagens
                  </span>
                </div>
                <div className="chat-actions">
                  <button className="action-btn secondary" onClick={exportStory}>
                    💾 Exportar
                  </button>
                  <button className="action-btn primary" onClick={resetStory}>
                    🎮 Nova História
                  </button>
                </div>
              </div>

              {/* Messages Container */}
              <div className="messages-container">
                {messages.length === 0 ? (
                  <div className="empty-state">
                    <div className="empty-icon">📖</div>
                    <h3>Sua História Começa Aqui</h3>
                    <p>Escreva sua primeira mensagem para dar início à aventura!</p>
                  </div>
                ) : (
                  messages.map((message, index) => (
                    <div 
                      key={index} 
                      className={`message ${message.role} ${index === messages.length - 1 ? 'last' : ''}`}
                    >
                      <div className="message-avatar">
                        {message.role === 'user' ? '👤' : '🤖'}
                      </div>
                      <div className="message-content">
                        <div className="message-bubble">
                          <div className="message-text">
                            {message.content}
                          </div>
                          <div className="message-time">
                            {new Date(message.timestamp).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                
                {/* Loading Message */}
                {loading && (
                  <div className="message assistant loading">
                    <div className="message-avatar">
                      🤖
                    </div>
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
                
                <div ref={messagesEndRef} className="scroll-anchor" />
              </div>

              {/* Input Area */}
              <div className="input-area">
                <div className="input-container">
                  <textarea
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="🎭 Descreva sua ação, fale com personagens ou tome uma decisão importante..."
                    rows="2"
                    disabled={loading}
                    className="message-input"
                  />
                  <button 
                    onClick={sendMessage}
                    disabled={loading || !userInput.trim()}
                    className="send-button"
                  >
                    {loading ? (
                      <div className="send-spinner"></div>
                    ) : (
                      '📤'
                    )}
                  </button>
                </div>
                <div className="input-hint">
                  Pressione Enter para enviar • Shift+Enter para nova linha
                </div>
              </div>
            </div>
          )}
        </main>

        {/* Footer */}
        <footer className="app-footer">
          <p>Criado com 💖 usando Mistral AI • Sua imaginação é o limite</p>
        </footer>
      </div>
    </div>
  )
}

export default App