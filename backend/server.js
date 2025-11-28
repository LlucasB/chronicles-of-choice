import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Armazenamento em memória (simples para MVP)
const userSessions = new Map();

// CORS configurado corretamente
app.use(cors({
  origin: [
    'https://chronicles-frontend.vercel.app',
    'https://*.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());

// Middleware de log melhorado
app.use((req, res, next) => {
  console.log('🔥', new Date().toISOString(), req.method, req.url, req.body || '');
  next();
});

// ✅ ROTA HEALTH CHECK (já funciona)
app.get('/health', (req, res) => {
  console.log('✅ Health check OK');
  res.json({ 
    status: 'OK', 
    message: 'Chronicles Backend Running',
    timestamp: new Date().toISOString()
  });
});

// ✅ SISTEMA DE MODOS
const GAME_MODES = {
  adventure: {
    name: "🎮 Modo Aventura",
    systemPrompt: `Você é um mestre de RPG especializado em aventuras épicas. Crie narrativas emocionantes com:
- Missões perigosas e recompensas
- Combates estratégicos 
- Exploração de mundos fantásticos
- NPCs memoráveis
- Escolhas que impactam a história

Mantenha a história coerente e lembre-se de todos os eventos anteriores.`
  },
  romance: {
    name: "💖 Modo Romance", 
    systemPrompt: `Você é um escritor especializado em romances interativos. Crie:
- Desenvolvimento de relacionamentos profundos
- Diálogos emocionantes e românticos
- Conflitos emocionais significativos
- Momentos de intimidade e conexão
- Personagens complexos e cativantes

Construa relacionamentos orgânicos baseados nas escolhas do usuário.`
  },
  horror: {
    name: "👻 Modo Horror",
    systemPrompt: `Você é um mestre do horror e suspense. Crie:
- Atmosfera tensa e assustadora
- Sustos psicológicos bem construídos
- Mistérios sobrenaturais
- Decisões de vida ou morte
- Ambiente claustrofóbico

Use o medo do desconhecido e mantenha a tensão constante.`
  },
  fantasy: {
    name: "🐉 Modo Fantasia Épica",
    systemPrompt: `Você é um contador de histórias de fantasia. Crie:
- Mundos mágicos detalhados
- Criaturas mitológicas e raças únicas
- Sistemas de magia complexos
- Profecias e destinos
- Batalhas épicas e jornadas heróicas

Desenvolva lore rica e histórias que se conectam.`
  }
};

// ✅ ROTA: LISTAR MODOS DISPONÍVEIS
app.get('/api/modes', (req, res) => {
  console.log('📚 Listando modos disponíveis');
  
  try {
    const modes = Object.entries(GAME_MODES).map(([key, value]) => ({
      id: key,
      name: value.name,
      description: value.systemPrompt.substring(0, 120) + '...'
    }));
    
    res.json({
      success: true,
      modes
    });
  } catch (error) {
    console.error('❌ Erro em /api/modes:', error);
    res.status(500).json({
      success: false,
      error: 'Erro interno ao carregar modos'
    });
  }
});

// ✅ ROTA: INICIAR NOVA HISTÓRIA
app.post('/api/start-story', async (req, res) => {
  console.log('🎯 Iniciando nova história:', req.body);
  
  try {
    const { userId, context, mode = 'adventure' } = req.body;
    
    if (!userId || !context) {
      return res.status(400).json({
        success: false,
        error: 'userId e context são obrigatórios'
      });
    }

    const selectedMode = GAME_MODES[mode] || GAME_MODES.adventure;
    
    // Criar nova sessão
    const session = {
      userId,
      mode: selectedMode,
      context,
      messages: [
        {
          role: "system",
          content: `${selectedMode.systemPrompt}\n\nCONTEXTO INICIAL: ${context}\n\nComece a história dando as boas-vindas ao jogador e apresentando a primeira situação.`
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    userSessions.set(userId, session);
    
    // Gerar primeira mensagem da IA
    console.log('🤖 Chamando Mistral API...');
    const aiResponse = await generateAIResponse(session.messages);
    
    // Adicionar resposta da IA ao histórico
    session.messages.push({
      role: "assistant", 
      content: aiResponse,
      timestamp: new Date()
    });
    
    session.updatedAt = new Date();

    console.log(`📖 Nova história iniciada para ${userId} no modo ${mode}`);

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
      error: 'Erro ao iniciar história: ' + error.message
    });
  }
});

// ✅ ROTA: CONTINUAR HISTÓRIA
app.post('/api/continue-story', async (req, res) => {
  console.log('📝 Continuando história:', req.body);
  
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
        error: 'Sessão não encontrada. Inicie uma nova história.'
      });
    }

    // Adicionar mensagem do usuário
    session.messages.push({
      role: "user",
      content: userMessage,
      timestamp: new Date()
    });

    // Gerar resposta da IA
    console.log('🤖 Gerando resposta da IA...');
    const aiResponse = await generateAIResponse(session.messages);
    
    // Adicionar resposta da IA
    session.messages.push({
      role: "assistant",
      content: aiResponse,
      timestamp: new Date()
    });
    
    session.updatedAt = new Date();

    res.json({
      success: true,
      message: aiResponse,
      history: session.messages.filter(msg => msg.role !== 'system')
    });
    
  } catch (error) {
    console.error('💥 Erro em /api/continue-story:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao continuar história: ' + error.message
    });
  }
});

// ✅ ROTA: OBTER HISTÓRICO
app.get('/api/session/:userId', (req, res) => {
  const { userId } = req.params;
  console.log('📋 Obtendo histórico para:', userId);
  
  const session = userSessions.get(userId);
  
  if (!session) {
    return res.status(404).json({
      success: false,
      error: 'Sessão não encontrada'
    });
  }

  res.json({
    success: true,
    history: session.messages.filter(msg => msg.role !== 'system'),
    mode: session.mode.name,
    context: session.context
  });
});

// ✅ FUNÇÃO AUXILIAR: GERAR RESPOSTA DA IA
async function generateAIResponse(messages) {
  try {
    const apiMessages = messages.slice(-8); // Manter contexto recente
    
    const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
      model: "mistral-small-latest",
      messages: apiMessages,
      max_tokens: 600,
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
    console.error('❌ Erro Mistral API:', error.response?.data || error.message);
    throw new Error('Falha ao gerar resposta da IA');
  }
}

// ✅ ROTA CATCH-ALL PARA DEBUG
app.all('*', (req, res) => {
  console.log('❌ Rota não encontrada:', req.method, req.url);
  res.status(404).json({
    success: false,
    error: 'Rota não encontrada',
    method: req.method,
    url: req.url,
    availableRoutes: [
      'GET /health',
      'GET /api/modes', 
      'POST /api/start-story',
      'POST /api/continue-story',
      'GET /api/session/:userId'
    ]
  });
});

// ✅ INICIAR SERVIDOR
app.listen(PORT, () => {
  console.log(`\n🚀 SERVIDOR INICIADO NA PORTA ${PORT}`);
  console.log(`📚 Modos disponíveis: ${Object.keys(GAME_MODES).join(', ')}`);
  console.log(`🔑 Mistral API: ${process.env.MISTRAL_API_KEY ? '✅ Configurada' : '❌ FALTANDO'}`);
  console.log(`🌐 Health Check: http://localhost:${PORT}/health\n`);
});