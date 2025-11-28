import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// CORS
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

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
});

app.use(express.json());

const userSessions = new Map();

// Sistemas de Modos
const GAME_MODES = {
  adventure: {
    name: "🎮 Modo Aventura",
    systemPrompt: `Você é um mestre de RPG especializado em aventuras épicas. Crie narrativas emocionantes com missões, combates, exploração e NPCs. Mantenha a história coerente.`
  },
  romance: {
    name: "💖 Modo Romance", 
    systemPrompt: `Você é um escritor especializado em romances interativos. Crie relacionamentos profundos e diálogos emocionantes.`
  },
  horror: {
    name: "👻 Modo Horror",
    systemPrompt: `Você é um mestre do horror e suspense. Crie atmosfera tensa e sustos psicológicos.`
  },
  fantasy: {
    name: "🐉 Modo Fantasia Épica",
    systemPrompt: `Você é um contador de histórias de fantasia. Crie mundos mágicos, criaturas e batalhas épicas.`
  }
};

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Chronicles Backend Running',
    timestamp: new Date().toISOString()
  });
});

// Rota: Listar modos
app.get('/api/modes', (req, res) => {
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

// Rota: Iniciar história
app.post('/api/start-story', async (req, res) => {
  console.log('🎯 INICIANDO HISTÓRIA:', req.body);
  
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
          content: `${selectedMode.systemPrompt}\n\nContexto inicial: ${context}`
        }
      ],
      createdAt: new Date()
    };

    userSessions.set(userId, session);
    
    // Gerar resposta IA
    console.log('🤖 CHAMANDO MISTRAL API...');
    const aiResponse = await generateAIResponse(session.messages);
    
    session.messages.push({
      role: "assistant", 
      content: aiResponse,
      timestamp: new Date()
    });

    console.log('✅ HISTÓRIA INICIADA COM SUCESSO');
    
    res.json({
      success: true,
      message: aiResponse,
      history: session.messages.filter(msg => msg.role !== 'system'),
      mode: selectedMode.name
    });
    
  } catch (error) {
    console.error('💥 ERRO EM /api/start-story:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao iniciar história: ' + error.message
    });
  }
});

// Rota: Continuar história
app.post('/api/continue-story', async (req, res) => {
  console.log('📝 CONTINUANDO HISTÓRIA:', req.body);
  
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

    console.log('💬 MENSAGEM DO USUÁRIO:', userMessage);
    
    // Adicionar mensagem usuário
    session.messages.push({
      role: "user",
      content: userMessage,
      timestamp: new Date()
    });

    // Gerar resposta IA
    console.log('🤖 CHAMANDO MISTRAL API PARA CONTINUAR...');
    const aiResponse = await generateAIResponse(session.messages);
    
    session.messages.push({
      role: "assistant",
      content: aiResponse,
      timestamp: new Date()
    });

    console.log('✅ HISTÓRIA CONTINUADA COM SUCESSO');
    
    res.json({
      success: true,
      message: aiResponse,
      history: session.messages.filter(msg => msg.role !== 'system')
    });
    
  } catch (error) {
    console.error('💥 ERRO EM /api/continue-story:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao continuar história: ' + error.message
    });
  }
});

// ✅✅✅ FUNÇÃO IA COM LOGS DETALHADOS
async function generateAIResponse(messages) {
  console.log('🔍 DETALHES DA CHAMADA DA IA:');
  console.log('📋 Quantidade de mensagens:', messages.length);
  console.log('📝 Últimas mensagens:', JSON.stringify(messages.slice(-2), null, 2));
  
  try {
    // Preparar mensagens para a API
    const apiMessages = messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    console.log('🚀 ENVIANDO PARA MISTRAL API...');
    
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
      timeout: 30000
    });

    console.log('✅ RESPOSTA DA MISTRAL RECEBIDA:');
    console.log('📊 Status:', response.status);
    console.log('🔤 Conteúdo:', response.data.choices[0].message.content.substring(0, 100) + '...');
    
    return response.data.choices[0].message.content;
    
  } catch (error) {
    console.error('💥 ERRO DETALHADO NA MISTRAL API:');
    
    if (error.response) {
      // Erro com resposta do servidor
      console.error('📊 Status do erro:', error.response.status);
      console.error('📝 Dados do erro:', error.response.data);
      console.error('📋 Headers do erro:', error.response.headers);
      
      if (error.response.status === 401) {
        console.error('🔑 ERRO 401: API KEY INVÁLIDA OU AUSENTE');
        console.error('🔑 API Key usada:', process.env.MISTRAL_API_KEY ? '***' + process.env.MISTRAL_API_KEY.slice(-4) : 'NÃO CONFIGURADA');
      } else if (error.response.status === 429) {
        console.error('⏰ ERRO 429: LIMITE DE REQUISIÇÕES EXCEDIDO');
      } else if (error.response.status === 400) {
        console.error('❌ ERRO 400: REQUISIÇÃO INVÁLIDA - Verifique o formato das mensagens');
      }
      
    } else if (error.request) {
      // Erro sem resposta
      console.error('🌐 ERRO DE REDE: Não foi possível conectar com a Mistral API');
      console.error('🔧 Detalhes do request:', error.request);
    } else {
      // Outro erro
      console.error('⚡ ERRO GERAL:', error.message);
    }
    
    throw new Error('Falha ao gerar resposta da IA: ' + error.message);
  }
}

// Rota para verificar API Key
app.get('/api/debug', (req, res) => {
  const hasApiKey = !!process.env.MISTRAL_API_KEY;
  const apiKeyPreview = hasApiKey ? 
    `***${process.env.MISTRAL_API_KEY.slice(-4)}` : 
    'NÃO CONFIGURADA';
  
  res.json({
    mistral_api_key_configured: hasApiKey,
    mistral_api_key_preview: apiKeyPreview,
    user_sessions_count: userSessions.size,
    timestamp: new Date().toISOString()
  });
});

// Rota para obter histórico do usuário
app.get('/api/user-stories/:userId', (req, res) => {
  const { userId } = req.params;
  
  // Em produção, isso viria de um banco de dados
  const userStories = Array.from(userSessions.entries())
    .filter(([key, session]) => key.startsWith(userId))
    .map(([key, session]) => ({
      id: key,
      context: session.context,
      mode: session.mode.name,
      createdAt: session.createdAt,
      messageCount: session.messages.length - 1 // Excluindo system message
    }));
  
  res.json({
    success: true,
    stories: userStories
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`);
  console.log(`🔑 Mistral API Key: ${process.env.MISTRAL_API_KEY ? 'CONFIGURADA' : 'NÃO CONFIGURADA'}`);
  if (process.env.MISTRAL_API_KEY) {
    console.log(`🔐 Preview: ***${process.env.MISTRAL_API_KEY.slice(-4)}`);
  }
});