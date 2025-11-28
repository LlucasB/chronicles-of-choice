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

// Sistema de temas
const THEMES = {
  light: {
    name: '🌞 Claro',
    colors: {
      primary: '#2563eb',
      primaryDark: '#1d4ed8',
      bgPrimary: '#ffffff',
      bgSecondary: '#f8fafc',
      bgTertiary: '#f1f5f9',
      textPrimary: '#000000',
      textSecondary: '#374151',
      textTertiary: '#6b7280',
      border: '#e5e7eb'
    }
  },
  dark: {
    name: '🌙 Escuro',
    colors: {
      primary: '#3b82f6',
      primaryDark: '#2563eb',
      bgPrimary: '#0f172a',
      bgSecondary: '#1e293b',
      bgTertiary: '#334155',
      textPrimary: '#f8fafc',
      textSecondary: '#cbd5e1',
      textTertiary: '#94a3b8',
      border: '#475569'
    }
  },
  nature: {
    name: '🌿 Natureza',
    colors: {
      primary: '#059669',
      primaryDark: '#047857',
      bgPrimary: '#f0fdf4',
      bgSecondary: '#dcfce7',
      bgTertiary: '#bbf7d0',
      textPrimary: '#052e16',
      textSecondary: '#166534',
      textTertiary: '#15803d',
      border: '#86efac'
    }
  },
  royal: {
    name: '👑 Real',
    colors: {
      primary: '#7c3aed',
      primaryDark: '#6d28d9',
      bgPrimary: '#faf5ff',
      bgSecondary: '#f3e8ff',
      bgTertiary: '#e9d5ff',
      textPrimary: '#1e1b4b',
      textSecondary: '#3730a3',
      textTertiary: '#5b21b6',
      border: '#c4b5fd'
    }
  },
  midnight: {
    name: '🌌 Meia-Noite',
    colors: {
      primary: '#f59e0b',
      primaryDark: '#d97706',
      bgPrimary: '#1e1b4b',
      bgSecondary: '#312e81',
      bgTertiary: '#4338ca',
      textPrimary: '#f8fafc',
      textSecondary: '#e2e8f0',
      textTertiary: '#cbd5e1',
      border: '#4f46e5'
    }
  }
}

// Sistema de fontes para o chat
const CHAT_FONTS = {
  default: { name: 'Padrão', family: 'Inter, sans-serif' },
  serif: { name: 'Elegante', family: 'Georgia, serif' },
  monospace: { name: 'Code', family: 'Monaco, monospace' },
  comic: { name: 'Divertida', family: 'Comic Sans MS, cursive' },
  fantasy: { name: 'Fantasia', family: 'Papyrus, fantasy' },
  modern: { name: 'Moderna', family: 'SF Pro Display, sans-serif' },
  classic: { name: 'Clássica', family: 'Times New Roman, serif' }
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
  const [selectedTheme, setSelectedTheme] = useState('light')
  const [showCharacterModal, setShowCharacterModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [autoSave, setAutoSave] = useState(true)
  const [typingSpeed, setTypingSpeed] = useState('normal')
  const [showQuickActions, setShowQuickActions] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState(null)
  const [wordCount, setWordCount] = useState(0)
  const [isEditing, setIsEditing] = useState(false)

  const messagesEndRef = useRef(null)
  const appRef = useRef(null)
  const saveTimeoutRef = useRef(null)

  // Aplicar tema dinamicamente
  useEffect(() => {
    const theme = THEMES[selectedTheme]
    const root = document.documentElement
    
    Object.entries(theme.colors).forEach(([key, value]) => {
      root.style.setProperty(`--${key}`, value)
    })
    
    // Salvar tema no localStorage
    localStorage.setItem('selectedTheme', selectedTheme)
  }, [selectedTheme])

  // Carregar preferências salvas
  useEffect(() => {
    const savedTheme = localStorage.getItem('selectedTheme')
    const savedFont = localStorage.getItem('selectedFont')
    const savedAutoSave = localStorage.getItem('autoSave')
    
    if (savedTheme) setSelectedTheme(savedTheme)
    if (savedFont) setSelectedFont(savedFont)
    if (savedAutoSave !== null) setAutoSave(JSON.parse(savedAutoSave))
  }, [])

  // Salvar preferências
  useEffect(() => {
    localStorage.setItem('selectedFont', selectedFont)
    localStorage.setItem('autoSave', JSON.stringify(autoSave))
  }, [selectedFont, autoSave])

  // Auto-save quando mensagens mudam
  useEffect(() => {
    if (autoSave && user && currentStoryId && messages.length > 0) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
      
      saveTimeoutRef.current = setTimeout(() => {
        updateStoryInFirestore(currentStoryId, {
          messages: messages,
          lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) || ''
        })
        setLastSaveTime(new Date())
      }, 2000)
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current)
      }
    }
  }, [messages, autoSave, user, currentStoryId])

  // Calcular contagem de palavras
  useEffect(() => {
    const words = messages.reduce((count, message) => {
      return count + (message.content?.split(/\s+/).length || 0)
    }, 0)
    setWordCount(words)
  }, [messages])

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
      console.log('💾 História salva automaticamente')
    } catch (error) {
      console.error('Error updating story:', error)
      setFirebaseError('Erro ao atualizar história: ' + error.message)
    }
  }

  // Manual save
  const manualSave = async () => {
    if (user && currentStoryId) {
      await updateStoryInFirestore(currentStoryId, {
        messages: messages,
        lastMessage: messages[messages.length - 1]?.content?.substring(0, 100) || ''
      })
      setLastSaveTime(new Date())
      alert('✅ História salva com sucesso!')
    }
  }

  // Character management
  const addCharacter = () => {
    if (newCharacter.trim() && !characters.some(c => c.name === newCharacter.trim())) {
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

  // Quick actions
  const quickActions = [
    {
      label: '🧭 Explorar',
      prompt: 'Explorar os arredores em busca de pistas, itens ou pontos de interesse.'
    },
    {
      label: '💬 Dialogar',
      prompt: 'Iniciar uma conversa com os personagens presentes para obter informações.'
    },
    {
      label: '⚔️ Atacar',
      prompt: 'Preparar-se para o combate e atacar a ameaça mais próxima.'
    },
    {
      label: '🎭 Agir',
      prompt: 'Realizar uma ação específica baseada na situação atual.'
    },
    {
      label: '🔍 Investigar',
      prompt: 'Examinar cuidadosamente o ambiente atual em busca de detalhes importantes.'
    },
    {
      label: '🏃 Fugir',
      prompt: 'Tentar escapar da situação atual de forma rápida e segura.'
    }
  ]

  const useQuickAction = (prompt) => {
    setUserInput(prompt)
    setShowQuickActions(false)
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
    
    // Atalhos de teclado
    if (e.ctrlKey || e.metaKey) {
      switch(e.key) {
        case 's':
          e.preventDefault()
          manualSave()
          break
        case 'e':
          e.preventDefault()
          exportStory()
          break
        case 'n':
          e.preventDefault()
          if (activeView === 'chat') resetStory()
          break
      }
    }
  }

  const resetStory = () => {
    if (window.confirm('Tem certeza que deseja começar uma nova história? O progresso atual será perdido.')) {
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
      setIsEditing(false)
    }
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
    setIsEditing(false)
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
    
    alert('📖 História exportada com sucesso!')
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
    setIsEditing(false)
  }

  const formatDate = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    return date.toLocaleDateString('pt-BR') + ' ' + date.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatTimeAgo = (timestamp) => {
    if (!timestamp) return ''
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp)
    const now = new Date()
    const diffMs = now - date
    const diffMins = Math.floor(diffMs / 60000)
    
    if (diffMins < 1) return 'Agora mesmo'
    if (diffMins < 60) return `${diffMins} min atrás`
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} h atrás`
    return formatDate(timestamp)
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
            <p>Crie histórias épicas sem limites</p>
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
              <span className="feature-icon">🚀</span>
              <h3>Sem Limites</h3>
              <p>Histórias longas e complexas sem restrições</p>
            </div>
            <div className="feature">
              <span className="feature-icon">🎨</span>
              <h3>Temas Personalizáveis</h3>
              <p>Interface com múltiplos temas de cores</p>
            </div>
            <div className="feature">
              <span className="feature-icon">💾</span>
              <h3>Auto-save Inteligente</h3>
              <p>Seu progresso é salvo automaticamente</p>
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

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>⚙️ Configurações</h3>
              <button onClick={() => setShowSettingsModal(false)}>✕</button>
            </div>
            <div className="settings-content">
              <div className="setting-group">
                <h4>🎨 Tema de Cores</h4>
                <div className="theme-grid">
                  {Object.entries(THEMES).map(([key, theme]) => (
                    <button
                      key={key}
                      className={`theme-btn ${selectedTheme === key ? 'active' : ''}`}
                      onClick={() => setSelectedTheme(key)}
                      style={{
                        background: theme.colors.bgPrimary,
                        color: theme.colors.textPrimary,
                        border: `2px solid ${selectedTheme === key ? theme.colors.primary : theme.colors.border}`
                      }}
                    >
                      {theme.name}
                    </button>
                  ))}
                </div>
              </div>

              <div className="setting-group">
                <h4>🔤 Fonte do Chat</h4>
                <select 
                  value={selectedFont}
                  onChange={(e) => setSelectedFont(e.target.value)}
                  className="font-selector"
                >
                  {Object.entries(CHAT_FONTS).map(([key, font]) => (
                    <option key={key} value={key}>
                      {font.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="setting-group">
                <h4>💾 Auto-save</h4>
                <label className="toggle-setting">
                  <input
                    type="checkbox"
                    checked={autoSave}
                    onChange={(e) => setAutoSave(e.target.checked)}
                  />
                  <span className="toggle-slider"></span>
                  <span>Salvar automaticamente</span>
                </label>
                {lastSaveTime && (
                  <p className="save-info">
                    Último save: {formatTimeAgo(lastSaveTime)}
                  </p>
                )}
              </div>

              <div className="setting-group">
                <h4>⌨️ Atalhos de Teclado</h4>
                <div className="shortcuts-list">
                  <div className="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>S</kbd>
                    <span>Salvar história</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>E</kbd>
                    <span>Exportar história</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Ctrl</kbd> + <kbd>N</kbd>
                    <span>Nova história</span>
                  </div>
                  <div className="shortcut-item">
                    <kbd>Enter</kbd>
                    <span>Enviar mensagem</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button 
                onClick={() => setShowSettingsModal(false)}
                className="modal-confirm-btn"
              >
                ✅ Concluído
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Panel */}
      {showQuickActions && (
        <div className="quick-actions-panel">
          <div className="quick-actions-header">
            <h4>🚀 Ações Rápidas</h4>
            <button onClick={() => setShowQuickActions(false)}>✕</button>
          </div>
          <div className="quick-actions-grid">
            {quickActions.map((action, index) => (
              <button
                key={index}
                className="quick-action-btn"
                onClick={() => useQuickAction(action.prompt)}
              >
                {action.label}
              </button>
            ))}
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
              {/* Stats */}
              <div className="header-stats">
                <span className="stat-item">📝 {wordCount} palavras</span>
                <span className="stat-item">💬 {messages.length} mensagens</span>
                {lastSaveTime && autoSave && (
                  <span className="stat-item save-indicator" title={`Salvo: ${formatTimeAgo(lastSaveTime)}`}>
                    💾
                  </span>
                )}
              </div>

              <button 
                className="header-btn"
                onClick={() => setShowQuickActions(!showQuickActions)}
                title="Ações Rápidas"
              >
                🚀 Ações
              </button>

              <button 
                className="header-btn"
                onClick={manualSave}
                title="Salvar Manualmente (Ctrl+S)"
              >
                💾 Salvar
              </button>

              <button className="header-btn" onClick={exportStory} title="Exportar História (Ctrl+E)">
                📤 Exportar
              </button>
            </>
          )}
          
          <button 
            className="header-btn" 
            onClick={() => setShowSettingsModal(true)}
            title="Configurações"
          >
            ⚙️
          </button>

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
                  <small>{wordCount} palavras totais</small>
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
              <p>Crie sua próxima grande aventura sem limites</p>
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

                  {/* Context Input - SEM LIMITES */}
                  <section className="context-section">
                    <div className="context-header">
                      <h3>✨ Contexto da História</h3>
                      <span className="context-hint">Sem limites de caracteres!</span>
                    </div>
                    <div className="context-input-wrapper">
                      <textarea
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder={`Descreva o mundo, situação inicial ou background da história...

🎯 Dica: Seja detalhado! Quanto mais contexto você fornecer, mais rica e coerente será a história.

Exemplo extenso:
"Em um reino onde a magia é proibida há séculos, um jovem aprendiz de ferreiro chamado Kael descobre que possui poderes ancestrais herdados de uma linhagem esquecida. Enquanto isso, uma guerra se aproxima das fronteiras do reino de Eldoria, ameaçada pelo império vizinho de Vorlag. Kael precisa esconder seus poderes enquanto busca respostas sobre seu passado, encontrando aliados inesperados e inimigos ocultos em cada esquina. O destino do reino pode depender de suas escolhas..."`}
                        rows="8"
                        className="context-textarea unlimited"
                      />
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
                      Criando Mundo Épico...
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
                    <span className="saved-badge">
                      {autoSave ? '💾 Auto' : '💾 Salvo'}
                    </span>
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
                  className="message-input unlimited"
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
                <span>Enter para enviar • Shift+Enter para nova linha</span>
                {autoSave && <span className="auto-save-indicator"> • 💾 Auto-save ativo</span>}
                <span className="shortcut-hint"> • Ctrl+S: Salvar • Ctrl+E: Exportar • Ctrl+N: Nova</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

export default App