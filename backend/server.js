import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

// Armazenamento em memória (em produção usaríamos database)
const userSessions = new Map();

// Configuração CORS
app.use(cors({
  origin: [
    'https://chronicles-frontend.vercel.app',
    'https://*.vercel.app',
    'http://localhost:5173'
  ],
  credentials: true
}));

app.use(express.json());

// Middleware de log
app.use((req, res, next) => {
  console.log('📍 Nova requisição:', req.method, req.url);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Chronicles Backend Running' });
});

// Sistemas de Modos
const GAME_MODES = {
  adventure: {
    name: "🎮 Modo Aventura",
    systemPrompt: `Você é um mestre de RPG especializado em aventuras épicas. Crie narrativas emocionantes com:
    - Missões perigosas e recompensas
    - Combates estratégicos 
    - Exploração de mundos fantásticos
    - NPCs memoráveis com personalidades únicas
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
    - Ambiente claustrofóbico e opressivo
    
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
  },
  scifi: {
    name: "🚀 Modo Ficção Científica", 
    systemPrompt: `Você é um escritor de ficção científica. Crie:
    - Tecnologias avançadas e suas consequências
    - Sociedades futuristas e distopias
    - Exploração espacial e alienígenas
    - Dilemas éticos da tecnologia
    - Universos científicos consistentes
    
    Mantenha a base científica plausível dentro do universo.`
  }
};

// Rota para iniciar uma nova história
app.post('/api/start-story', async (req, res) => {
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
          content: `${selectedMode.systemPrompt}
          
          CONTEXTO INICIAL PROVIDENCIADO PELO USUÁRIO:
          ${context}
          
          Agora, comece a história baseada neste contexto, dando as boas-vindas ao jogador e apresentando a primeira situação.`
        }
      ],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    userSessions.set(userId, session);
    
    // Gerar primeira mensagem da IA
    const aiResponse = await generateAIResponse(session.messages);
    
    // Adicionar resposta da IA ao histórico
    session.messages.push({
      role: "assistant", 
      content: aiResponse,
      timestamp: new Date()
    });
    
    session.updatedAt = new Date();

    console.log(`📖 Nova história iniciada para usuário ${userId} no modo ${mode}`);

    res.json({
      success: true,
      message: aiResponse,
      history: session.messages.filter(msg => msg.role !== 'system'),
      mode: selectedMode.name
    });
    
  } catch (error) {
    console.error('💥 Erro ao iniciar história:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao iniciar história'
    });
  }
});

// Rota para continuar a história
app.post('/api/continue-story', async (req, res) => {
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

    // Adicionar mensagem do usuário ao histórico
    session.messages.push({
      role: "user",
      content: userMessage,
      timestamp: new Date()
    });

    // Gerar resposta da IA baseada em TODO o histórico
    const aiResponse = await generateAIResponse(session.messages);
    
    // Adicionar resposta da IA ao histórico
    session.messages.push({
      role: "assistant",
      content: aiResponse,
      timestamp: new Date()
    });
    
    session.updatedAt = new Date();

    console.log(`📝 História continuada para usuário ${userId}`);

    res.json({
      success: true,
      message: aiResponse,
      history: session.messages.filter(msg => msg.role !== 'system')
    });
    
  } catch (error) {
    console.error('💥 Erro ao continuar história:', error);
    res.status(500).json({
      success: false,
      error: 'Erro ao continuar história'
    });
  }
});

// Rota para obter histórico da sessão
app.get('/api/session/:userId', (req, res) => {
  const { userId } = req.params;
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

// Função para gerar resposta da IA
async function generateAIResponse(messages) {
  try {
    // Preparar mensagens para a API (limitar para não exceder tokens)
    const apiMessages = messages.slice(-10); // Manter últimas 10 mensagens para contexto
    
    const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
      model: "mistral-small-latest",
      messages: apiMessages,
      max_tokens: 800,
      temperature: 0.8,
      top_p: 0.9
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      },
      timeout: 30000
    });

    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('❌ Erro na Mistral API:', error.response?.data || error.message);
    throw new Error('Falha ao gerar resposta da IA');
  }
}

// Rota para listar modos disponíveis
app.get('/api/modes', (req, res) => {
  const modes = Object.entries(GAME_MODES).map(([key, value]) => ({
    id: key,
    name: value.name,
    description: value.systemPrompt.substring(0, 100) + '...'
  }));
  
  res.json({
    success: true,
    modes
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 Modos disponíveis: ${Object.keys(GAME_MODES).join(', ')}`);
});