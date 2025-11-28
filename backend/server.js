import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// ✅✅✅ CORS CORRIGIDO - Configuração PERMISSIVA para desenvolvimento
app.use(cors({
  origin: [
    'https://chronicles-of-choice.vercel.app',
    'https://chronicles-frontend.vercel.app', 
    'http://localhost:5173',
    'http://localhost:3000',
    'https://*.vercel.app',
    'https://*.onrender.com'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ✅ Middleware para headers CORS manuais (backup)
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  // ✅ Responde imediatamente para requisições OPTIONS (preflight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

// Armazenamento em memória
const userSessions = new Map();

// ✅ Health check
app.get('/health', (req, res) => {
  console.log('✅ Health check - CORS funcionando!');
  res.json({ 
    status: 'OK', 
    message: 'Chronicles Backend Running - CORS Fixed',
    timestamp: new Date().toISOString()
  });
});

// ✅ Sistemas de Modos
const GAME_MODES = {
  adventure: {
    name: "🎮 Modo Aventura",
    systemPrompt: `Você é um mestre de RPG especializado em aventuras épicas.`
  },
  romance: {
    name: "💖 Modo Romance", 
    systemPrompt: `Você é um escritor especializado em romances interativos.`
  },
  horror: {
    name: "👻 Modo Horror",
    systemPrompt: `Você é um mestre do horror e suspense.`
  },
  fantasy: {
    name: "🐉 Modo Fantasia Épica",
    systemPrompt: `Você é um contador de histórias de fantasia.`
  }
};

// ✅ ROTA: LISTAR MODOS
app.get('/api/modes', (req, res) => {
  console.log('📚 /api/modes chamada - CORS OK');
  
  try {
    const modes = Object.entries(GAME_MODES).map(([key, value]) => ({
      id: key,
      name: value.name,
      description: value.systemPrompt
    }));
    
    res.json({
      success: true,
      modes
    });
  } catch (error) {
    console.error('❌ Erro em /api/modes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno'
    });
  }
});

// ✅ ROTA: INICIAR HISTÓRIA
app.post('/api/start-story', async (req, res) => {
  console.log('🎯 /api/start-story chamada - CORS OK');
  
  try {
    const { userId, context, mode = 'adventure' } = req.body;
    
    if (!userId || !context) {
      return res.status(400).json({
        success: false,
        error: 'userId e context são obrigatórios'
      });
    }

    const selectedMode = GAME_MODES[mode] || GAME_MODES.adventure;
    
    // Criar sessão
    const session = {
      userId,
      mode: selectedMode,
      context,
      messages: [
        {
          role: "system",
          content: `${selectedMode.systemPrompt}\n\nCONTEXTO: ${context}`
        }
      ],
      createdAt: new Date()
    };

    userSessions.set(userId, session);
    
    // Gerar resposta IA
    const aiResponse = await generateAIResponse(session.messages);
    
    session.messages.push({
      role: "assistant", 
      content: aiResponse,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: aiResponse,
      history: session.messages.filter(msg => msg.role !== 'system'),
      mode: selectedMode.name
    });
    
  } catch (error) {
    console.error('💥 Erro em /api/start-story:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao iniciar história'
    });
  }
});

// ✅ ROTA: CONTINUAR HISTÓRIA
app.post('/api/continue-story', async (req, res) => {
  console.log('📝 /api/continue-story chamada - CORS OK');
  
  try {
    const { userId, userMessage } = req.body;
    
    if (!userId || !userMessage) {
      return res.status(400).json({
        success: false,
        error: 'userId e userMessage são obrigatórios'
      });
    }

    const session = userSessions.get(userId);
    if (!session) {
      return res.status(404).json({
        success: false,
        error: 'Sessão não encontrada'
      });
    }

    // Adicionar mensagem usuário
    session.messages.push({
      role: "user",
      content: userMessage,
      timestamp: new Date()
    });

    // Gerar resposta IA
    const aiResponse = await generateAIResponse(session.messages);
    
    session.messages.push({
      role: "assistant",
      content: aiResponse,
      timestamp: new Date()
    });

    res.json({
      success: true,
      message: aiResponse,
      history: session.messages.filter(msg => msg.role !== 'system')
    });
    
  } catch (error) {
    console.error('💥 Erro em /api/continue-story:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao continuar história'
    });
  }
});

// ✅ FUNÇÃO IA
async function generateAIResponse(messages) {
  try {
    const apiMessages = messages.slice(-6);
    
    const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
      model: "mistral-small-latest",
      messages: apiMessages,
      max_tokens: 500,
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 25000
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Erro Mistral API:', error.message);
    return 'Desculpe, houve um erro ao gerar a história. Tente novamente.';
  }
}

// ✅ Rota para debug CORS
app.get('/api/cors-test', (req, res) => {
  res.json({
    success: true,
    message: 'CORS está funcionando!',
    timestamp: new Date().toISOString(),
    allowedOrigins: [
      'https://chronicles-of-choice.vercel.app',
      'https://chronicles-frontend.vercel.app'
    ]
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`✅ CORS configurado para Vercel e Render`);
});