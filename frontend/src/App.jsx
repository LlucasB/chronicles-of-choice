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

// Sistema de fontes para o chat
const CHAT_FONTS = {
  default: { name: 'Padrão', family: 'Inter, sans-serif' },
  serif: { name: 'Elegante', family: 'Georgia, serif' },
  monospace: { name: 'Code', family: 'Monaco, monospace' },
  comic: { name: 'Divertida', family: 'Comic Sans MS, cursive' },
  fantasy: { name: 'Fantasia', family: 'Papyrus, fantasy' }
}

function App() {
  const [user, setUser] = useState(null)
  const [currentMode, setCurrentMode] = useState('adventure')
  const [selectedGenres, setSelectedGenres] = useState(['fantasy'])
  const [title, setTitle] = useState('')
  const [context, setContext] = useState('')
  const [characters, setCharacters] = useState([])
  const [newCharacter, setNewCharacter] = useState('')
  const [isAdult, setIsAdult] = useState(false)
  const [messages, setMessages] = useState([])
  const [userInput, setUserInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [storyStarted, setStoryStarted] = useState(false)
  const [availableModes, setAvailableModes] = useState([])
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [currentStoryId, setCurrentStoryId] = useState(null)
  const [savedStories, setSavedStories] = useState([])
  const [activeView, setActiveView] = useState('new')
  const [firebaseError, setFirebaseError] = useState(null)
  const [selectedFont, setSelectedFont] = useState('default')
  const [showCharacterModal, setShowCharacterModal] = useState(false)

  const messagesEndRef = useRef(null)
  const appRef = useRef(null)

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUser(user)
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
      setFirebaseError('Erro ao fazer login: ' + error.message)
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
      setFirebaseError('Erro ao fazer logout: ' + error.message)
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
      setFirebaseError('Erro ao salvar história: ' + error.message)
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
      setFirebaseError('Erro ao atualizar história: ' + error.message)
    }
  }

  // Character management
  const addCharacter = () => {
    if (newCharacter.trim() && !characters.includes(newCharacter.trim())) {
      setCharacters([...characters, {
        name: newCharacter.trim(),
        description: '',
        traits: []
      }])
      setNewCharacter('')
    }
  }

  const removeCharacter = (index) => {
    setCharacters(characters.filter((_, i) => i !== index))
  }

  const updateCharacter = (index, field, value) => {
    const updatedCharacters = [...characters]
    updatedCharacters[index] = {
      ...updatedCharacters[index],
      [field]: value
    }
    setCharacters(updatedCharacters)
  }

  // Genre management
  const toggleGenre = (genre) => {
    if (selectedGenres.includes(genre)) {
      setSelectedGenres(selectedGenres.filter(g => g !== genre))
    } else {
      setSelectedGenres([...selectedGenres, genre])
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
    if (!context.trim() || !title.trim()) {
      alert('Por favor, preencha o título e contexto da história!')
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
          title: title.trim(),
          context: context.trim(),
          mode: currentMode,
          genres: selectedGenres,
          characters: characters,
          isAdult: isAdult
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        const initialMessages = data.history || []
        setMessages(initialMessages)
        setStoryStarted(true)
        setActiveView('chat')

        if (user) {
          const storyId = await saveStoryToFirestore({
            title: title.trim(),
            context: context.trim(),
            mode: currentMode,
            genres: selectedGenres,
            characters: characters,
            isAdult: isAdult,
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
    setTitle('')
    setContext('')
    setCharacters([])
    setUserInput('')
    setCurrentStoryId(null)
    setActiveView('new')
    setSelectedGenres(['fantasy'])
    setIsAdult(false)
  }

  const loadStory = (story) => {
    setMessages(story.messages || [])
    setCurrentMode(story.mode || 'adventure')
    setTitle(story.title || '')
    setContext(story.context || '')
    setCharacters(story.characters || [])
    setSelectedGenres(story.genres || ['fantasy'])
    setIsAdult(story.isAdult || false)
    setCurrentStoryId(story.id)
    setStoryStarted(true)
    setActiveView('chat')
  }

  const exportStory = () => {
    const storyText = `Título: ${title}\n\n` +
      messages.map(msg => 
        `${msg.role === 'user' ? '👤 Você' : '📖 Narrador'}: ${msg.content}`
      ).join('\n\n')
    
    const blob = new Blob([storyText], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${title || 'historia'}-${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    alert('História exportada com sucesso!')
  }

  const resetAppState = () => {
    setStoryStarted(false)
    setMessages([])
    setTitle('')
    setContext('')
    setCharacters([])
    setUserInput('')
    setCurrentStoryId(null)
    setActiveView('new')
    setSelectedGenres(['fantasy'])
    setIsAdult(false)
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Available genres
  const availableGenres = [
    { id: 'fantasy', name: '🧙‍♂️ Fantasia', icon: '🧙‍♂️' },
    { id: 'sci-fi', name: '🚀 Ficção Científica', icon: '🚀' },
    { id: 'romance', name: '💖 Romance', icon: '💖' },
    { id: 'mystery', name: '🕵️‍♂️ Mistério', icon: '🕵️‍♂️' },
    { id: 'horror', name: '👻 Horror', icon: '👻' },
    { id: 'adventure', name: '⚔️ Aventura', icon: '⚔️' },
    { id: 'comedy', name: '🎭 Comédia', icon: '🎭' },
    { id: 'drama', name: '🎬 Drama', icon: '🎬' }
  ]

  // Loading screen if not authenticated
  if (!user) {
    return (
      <div className="auth-container" ref={appRef}>
        <div className="auth-card">
          <div className="auth-header">
            <div className="logo">📖</div>
            <h1>Chronicles of Choice</h1>
            <p>Crie histórias épicas com personagens customizados</p>
          </div>
          
          {firebaseError && (
            <div className="error-banner">
              <strong>⚠️ Aviso:</strong> {firebaseError}
              <br />
              <small>Você pode continuar como convidado</small>
            </div>
          )}
          
          <div className="auth-features">
            <div className="feature">
              <span className="feature-icon">🎮</span>
              <h3>Multiplos Gêneros</h3>
              <p>Combine fantasia, sci-fi, romance e mais</p>
            </div>
            <div className="feature">
              <span className="feature-icon">👥</span>
              <h3>Personagens Customizados</h3>
              <p>Crie e gerencie seu próprio elenco</p>
            </div>
            <div className="feature">
              <span className="feature-icon">🎨</span>
              <h3>Chat Personalizado</h3>
              <p>Múltiplas fontes e temas</p>
            </div>
          </div>

          {!firebaseError ? (
            <button className="google-signin-btn" onClick={signInWithGoogle}>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" />
              Entrar com Google
            </button>
          ) : (
            <button 
              className="guest-mode-btn"
              onClick={() => setUser({ displayName: 'Convidado', email: 'convidado@exemplo.com' })}
            >
              🎮 Continuar como Convidado
            </button>
          )}

          <div className="auth-footer">
            <p>
              {firebaseError 
                ? '🔧 Use o modo convidado para testar'
                : '💡 Faça login para salvar suas histórias'
              }
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`app ${isFullscreen ? 'fullscreen' : ''}`} ref={appRef}>
      {/* Firebase Error Banner */}
      {firebaseError && (
        <div className="firebase-error-banner">
          <span>⚠️ {firebaseError}</span>
          <button onClick={() => setFirebaseError(null)}>✕</button>
        </div>
      )}

      {/* Character Modal */}
      {showCharacterModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>👥 Gerenciar Personagens</h3>
              <button onClick={() => setShowCharacterModal(false)}>✕</button>
            </div>
            <div className="characters-management">
              <div className="add-character-form">
                <input
                  type="text"
                  value={newCharacter}
                  onChange={(e) => setNewCharacter(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCharacter()}
                  placeholder="Nome do personagem..."
                  className="character-name-input"
                />
                <button onClick={addCharacter} className="add-character-btn">
                  ➕ Adicionar
                </button>
              </div>
              
              <div className="characters-list">
                {characters.map((character, index) => (
                  <div key={index} className="character-card">
                    <div className="character-header">
                      <input
                        type="text"
                        value={character.name}
                        onChange={(e) => updateCharacter(index, 'name', e.target.value)}
                        placeholder="Nome do personagem"
                        className="character-name"
                      />
                      <button 
                        onClick={() => removeCharacter(index)}
                        className="remove-character-btn"
                      >
                        🗑️
                      </button>
                    </div>
                    <textarea
                      value={character.description}
                      onChange={(e) => updateCharacter(index, 'description', e.target.value)}
                      placeholder="Descrição do personagem..."
                      rows="3"
                      className="character-description"
                    />
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => setShowCharacterModal(false)}
                className="modal-confirm-btn"
              >
                ✅ Concluído
              </button>
            </div>
          </div>
        </div>
      )}

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
            <>
              {/* Font Selector */}
              <select 
                value={selectedFont}
                onChange={(e) => setSelectedFont(e.target.value)}
                className="font-selector"
                title="Escolher fonte do chat"
              >
                {Object.entries(CHAT_FONTS).map(([key, font]) => (
                  <option key={key} value={key}>
                    {font.name}
                  </option>
                ))}
              </select>

              <button className="header-btn" onClick={exportStory} title="Exportar História">
                💾 Exportar
              </button>
            </>
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
              <p>Crie sua próxima grande aventura</p>
            </div>

            <div className="setup-panel">
              <div className="setup-columns">
                {/* Left Column - Basic Info */}
                <div className="setup-column">
                  {/* Title Input */}
                  <section className="title-section">
                    <h3>✏️ Título da História</h3>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Dê um título épico para sua história..."
                      className="title-input"
                    />
                  </section>

                  {/* Mode Selection */}
                  <section className="mode-section">
                    <h3>🎮 Modo Principal</h3>
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

                  {/* Adult Content Toggle */}
                  <section className="adult-section">
                    <label className="adult-toggle">
                      <input
                        type="checkbox"
                        checked={isAdult}
                        onChange={(e) => setIsAdult(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                      <span className="toggle-label">Conteúdo +18</span>
                    </label>
                    <p className="adult-hint">
                      {isAdult 
                        ? '⚠️ A história poderá conter temas adultos'
                        : 'Conteúdo adequado para todas as idades'
                      }
                    </p>
                  </section>
                </div>

                {/* Right Column - Advanced Settings */}
                <div className="setup-column">
                  {/* Genre Selection */}
                  <section className="genres-section">
                    <h3>🎭 Gêneros da História</h3>
                    <div className="genres-grid">
                      {availableGenres.map(genre => (
                        <button
                          key={genre.id}
                          className={`genre-btn ${selectedGenres.includes(genre.id) ? 'selected' : ''}`}
                          onClick={() => toggleGenre(genre.id)}
                        >
                          <span className="genre-icon">{genre.icon}</span>
                          {genre.name}
                        </button>
                      ))}
                    </div>
                  </section>

                  {/* Characters Section */}
                  <section className="characters-section">
                    <div className="characters-header">
                      <h3>👥 Personagens</h3>
                      <button 
                        onClick={() => setShowCharacterModal(true)}
                        className="manage-characters-btn"
                      >
                        Gerenciar
                      </button>
                    </div>
                    <div className="characters-preview">
                      {characters.length === 0 ? (
                        <p className="no-characters">Nenhum personagem adicionado</p>
                      ) : (
                        <div className="characters-tags">
                          {characters.slice(0, 3).map((character, index) => (
                            <span key={index} className="character-tag">
                              {character.name}
                            </span>
                          ))}
                          {characters.length > 3 && (
                            <span className="character-tag-more">
                              +{characters.length - 3} mais
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Context Input */}
                  <section className="context-section">
                    <h3>✨ Contexto da História</h3>
                    <div className="context-input-wrapper">
                      <textarea
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder={`Descreva o mundo, situação inicial ou background da história...

Exemplo: "Em um reino onde a magia é proibida, um jovem aprendiz descobre que possui poderes ancestrais. Enquanto isso, uma guerra se aproxima das fronteiras..."`}
                        rows="6"
                        className="context-textarea"
                      />
                      <div className="textarea-footer">
                        <span>{context.length}/2000 caracteres</span>
                      </div>
                    </div>
                  </section>
                </div>
              </div>

              {/* Action Button */}
              <div className="action-section">
                <button
                  onClick={startStory}
                  disabled={loading || !context.trim() || !title.trim()}
                  className="start-button"
                >
                  {loading ? (
                    <>
                      <div className="spinner"></div>
                      Criando Mundo...
                    </>
                  ) : (
                    '🚀 Iniciar Aventura Épica'
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
              <p>Continue suas aventuras ou relembre grandes jornadas</p>
            </div>

            {savedStories.length === 0 ? (
              <div className="empty-history">
                <div className="empty-icon">📖</div>
                <h3>Nenhuma história encontrada</h3>
                <p>Suas grandes aventuras aparecerão aqui</p>
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
                      <div className="story-tags">
                        <span className="story-mode">{story.modeName}</span>
                        {story.isAdult && <span className="adult-tag">+18</span>}
                      </div>
                    </div>
                    <div className="story-context">
                      {story.context.substring(0, 120)}
                      {story.context.length > 120 ? '...' : ''}
                    </div>
                    <div className="story-meta">
                      <div className="story-genres">
                        {story.genres?.slice(0, 2).map(genre => (
                          <span key={genre} className="genre-tag">
                            {availableGenres.find(g => g.id === genre)?.icon}
                          </span>
                        ))}
                      </div>
                      <span className="message-count">
                        {story.messages?.length || 0} mensagens
                      </span>
                    </div>
                    <div className="story-date">
                      {formatDate(story.updatedAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Chat View */}
        {activeView === 'chat' && (
          <div className="chat-interface" style={{ fontFamily: CHAT_FONTS[selectedFont].family }}>
            <div className="chat-header">
              <div className="chat-info">
                <div className="story-title">{title}</div>
                <div className="chat-tags">
                  <span className="mode-tag">
                    {availableModes.find(m => m.id === currentMode)?.name}
                  </span>
                  {isAdult && <span className="adult-tag">+18</span>}
                  <span className="message-count">{messages.length} mensagens</span>
                  {currentStoryId && (
                    <span className="saved-badge">💾 Salvo</span>
                  )}
                </div>
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
                  <p>Escreva sua primeira mensagem para dar vida à história</p>
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
                        <div className="message-text">
                          {message.content}
                        </div>
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
                  placeholder="Descreva sua ação, fale com personagens ou tome decisões importantes..."
                  rows="3"
                  disabled={loading}
                  className="message-input"
                  style={{ fontFamily: CHAT_FONTS[selectedFont].family }}
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
                {currentStoryId && ' • Salvamento automático ativo'}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App