import { useState, useEffect, useRef } from 'react'
import { initializeApp } from 'firebase/app'
import { 
  getAuth, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth'
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc,
  doc,
  query, 
  where, 
  orderBy, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore'
import './App.css'

// Firebase config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
}

// Initialize Firebase
const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

function App() {
  const [user, setUser] = useState(null)
  const [currentMode, setCurrentMode] = useState('adventure')
  const [context, setContext] = useState('')
  const [messages, setMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [storyStarted, setStoryStarted] = useState(false)
  const [availableModes, setAvailableModes] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [currentStoryId, setCurrentStoryId] = useState(null)
  const [savedStories, setSavedStories] = useState([])
  const [activeView, setActiveView] = useState('new') // 'new', 'chat', 'history'

  const messagesEndRef = useRef(null)
  const appRef = useRef(null)

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
        // Load user's saved stories
        loadSavedStories(user.uid)
      } else {
        setUser(null)
        setSavedStories([])
      }
    })
    return () => unsubscribe()
  }, [])

  // Load saved stories from Firestore
  const loadSavedStories = (userId) => {
    const storiesQuery = query(
      collection(db, 'stories'),
      where('userId', '==', userId),
      orderBy('updatedAt', 'desc')
    )

    const unsubscribe = onSnapshot(storiesQuery, (snapshot) => {
      const stories = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setSavedStories(stories)
    })

    return unsubscribe
  }

  // Google Sign In
  const signInWithGoogle = async () => {
    try {
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({
        prompt: 'select_account'
      })
      await signInWithPopup(auth, provider)
    } catch (error) {
      console.error('Error signing in:', error)
      alert('Erro ao fazer login: ' + error.message)
    }
  }

  // Sign Out
  const handleSignOut = async () => {
    try {
      await signOut(auth)
      setShowUserMenu(false)
      resetAppState()
    } catch (error) {
      console.error('Error signing out:', error)
    }
  }

  // Save story to Firestore
  const saveStoryToFirestore = async (storyData) => {
    if (!user) return null

    try {
      const docRef = await addDoc(collection(db, 'stories'), {
        ...storyData,
        userId: user.uid,
        userEmail: user.email,
        userName: user.displayName,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
      return docRef.id
    } catch (error) {
      console.error('Error saving story:', error)
      return null
    }
  }

  // Update story in Firestore
  const updateStoryInFirestore = async (storyId, updates) => {
    if (!user) return

    try {
      const storyRef = doc(db, 'stories', storyId)
      await updateDoc(storyRef, {
        ...updates,
        updatedAt: serverTimestamp()
      })
    } catch (error) {
      console.error('Error updating story:', error)
    }
  }

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
          userId: user?.uid || 'guest',
          context: context.trim(),
          mode: currentMode
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        const initialMessages = data.history || []
        setMessages(initialMessages)
        setStoryStarted(true)
        setActiveView('chat')

        // Save to Firestore if user is logged in
        if (user) {
          const storyId = await saveStoryToFirestore({
            title: context.substring(0, 50) + (context.length > 50 ? '...' : ''),
            context: context.trim(),
            mode: currentMode,
            messages: initialMessages,
            modeName: availableModes.find(m => m.id === currentMode)?.name || 'Aventura'
          })
          setCurrentStoryId(storyId)
        }
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
    
    const updatedMessages = [...messages, userMessageObj]
    setMessages(updatedMessages)

    try {
      const API_URL = import.meta.env.VITE_API_URL
      
      const response = await fetch(`${API_URL}/api/continue-story`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          userId: user?.uid || 'guest',
          userMessage
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        const finalMessages = data.history || updatedMessages
        setMessages(finalMessages)

        // Update story in Firestore
        if (user && currentStoryId) {
          await updateStoryInFirestore(currentStoryId, {
            messages: finalMessages,
            lastMessage: userMessage.substring(0, 100)
          })
        }
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
      if (storyStarted && activeView === 'chat') {
        sendMessage()
      } else if (activeView === 'new') {
        startStory()
      }
    }
  }

  const resetStory = () => {
    setStoryStarted(false)
    setMessages([])
    setContext('')
    setUserInput('')
    setCurrentStoryId(null)
    setActiveView('new')
  }

  const loadStory = (story) => {
    setMessages(story.messages || [])
    setCurrentMode(story.mode || 'adventure')
    setContext(story.context || '')
    setCurrentStoryId(story.id)
    setStoryStarted(true)
    setActiveView('chat')
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

  const resetAppState = () => {
    setStoryStarted(false)
    setMessages([])
    setContext('')
    setUserInput('')
    setCurrentStoryId(null)
    setActiveView('new')
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Loading screen if not authenticated
  if (!user) {
    return (
      <div className="auth-container" ref={appRef}>
        <div className="auth-card">
          <div className="auth-header">
            <div className="logo">📖</div>
            <h1>Chronicles of Choice</h1>
            <p>Crie e salve histórias épicas com IA</p>
          </div>
          
          <div className="auth-features">
            <div className="feature">
              <span className="feature-icon">🎮</span>
              <h3>Modos Diversos</h3>
              <p>Aventura, Romance, Horror e mais</p>
            </div>
            <div className="feature">
              <span className="feature-icon">💾</span>
              <h3>Salve Automaticamente</h3>
              <p>Suas histórias são salvas na nuvem</p>
            </div>
            <div className="feature">
              <span className="feature-icon">🚀</span>
              <h3>IA Avançada</h3>
              <p>Narrativas inteligentes e coerentes</p>
            </div>
          </div>

          <button className="google-signin-btn" onClick={signInWithGoogle}>
            <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
            Entrar com Google
          </button>

          <div className="auth-footer">
            <p>
              <strong>💡 Importante:</strong> Você precisa fazer login para salvar suas histórias
            </p>
          </div>
        </div>
      </div>
    )
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
          {/* Navigation */}
          <div className="nav-buttons">
            <button 
              className={`nav-btn ${activeView === 'new' ? 'active' : ''}`}
              onClick={() => setActiveView('new')}
            >
              Nova História
            </button>
            <button 
              className={`nav-btn ${activeView === 'history' ? 'active' : ''}`}
              onClick={() => setActiveView('history')}
            >
              Minhas Histórias ({savedStories.length})
            </button>
          </div>

          {activeView === 'chat' && (
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
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName} />
              ) : (
                <span>👤</span>
              )}
            </button>

            {showUserMenu && (
              <div className="user-dropdown">
                <div className="user-info">
                  <strong>{user.displayName || 'Usuário'}</strong>
                  <span>{user.email}</span>
                </div>
                <div className="user-stats">
                  <small>{savedStories.length} histórias salvas</small>
                </div>
                <button className="menu-item" onClick={handleSignOut}>
                  🚪 Sair
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="main-content">
        {/* New Story View */}
        {activeView === 'new' && (
          <div className="start-screen">
            <div className="welcome-section">
              <h2>Olá, {user.displayName}! 👋</h2>
              <p>Pronto para criar uma nova história épica?</p>
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
        )}

        {/* History View */}
        {activeView === 'history' && (
          <div className="history-screen">
            <div className="history-header">
              <h2>📚 Minhas Histórias</h2>
              <p>Continue de onde parou ou relembre aventuras passadas</p>
            </div>

            {savedStories.length === 0 ? (
              <div className="empty-history">
                <div className="empty-icon">📖</div>
                <h3>Nenhuma história salva ainda</h3>
                <p>Crie sua primeira história para vê-la aqui!</p>
                <button 
                  className="new-story-btn"
                  onClick={() => setActiveView('new')}
                >
                  🚀 Criar Primeira História
                </button>
              </div>
            ) : (
              <div className="stories-grid">
                {savedStories.map(story => (
                  <div 
                    key={story.id} 
                    className="story-card"
                    onClick={() => loadStory(story)}
                  >
                    <div className="story-header">
                      <h3>{story.title || 'História Sem Título'}</h3>
                      <span className="story-mode">{story.modeName}</span>
                    </div>
                    <div className="story-context">
                      {story.context.substring(0, 150)}
                      {story.context.length > 150 ? '...' : ''}
                    </div>
                    <div className="story-meta">
                      <span className="message-count">
                        {story.messages?.length || 0} mensagens
                      </span>
                      <span className="story-date">
                        {formatDate(story.updatedAt)}
                      </span>
                    </div>
                    <div className="story-actions">
                      <button className="action-btn">
                        Continuar →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat View */}
        {activeView === 'chat' && (
          <div className="chat-interface">
            <div className="chat-header">
              <div className="chat-info">
                <span className="mode-tag">
                  {availableModes.find(m => m.id === currentMode)?.name}
                </span>
                <span className="message-count">{messages.length} mensagens</span>
                {currentStoryId && (
                  <span className="saved-badge">💾 Salvo</span>
                )}
              </div>
              <div className="chat-actions">
                <button className="header-btn" onClick={() => setActiveView('history')}>
                  📚 Histórias
                </button>
                <button className="new-story-btn" onClick={resetStory}>
                  📝 Nova História
                </button>
              </div>
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
                          {message.timestamp ? formatDate(message.timestamp) : 'Agora'}
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
                {currentStoryId && ' • História sendo salva automaticamente'}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App