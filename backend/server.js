import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Health check para Render
app.get('/health', (req, res) => {
  res.json({ status: 'OK', message: 'Chronicles Backend Running' });
});

// Sua rota da Mistral AI
app.post('/api/generate', async (req, res) => {
  try {
    const { prompt } = req.body;
    
    const response = await axios.post('https://api.mistral.ai/v1/chat/completions', {
      model: "mistral-small-latest",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 500
    }, {
      headers: {
        'Authorization': `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ 
      success: true, 
      story: response.data.choices[0].message.content 
    });
  } catch (error) {
    console.error('Mistral API Error:', error.response?.data || error.message);
    res.status(500).json({ 
      success: false, 
      error: 'Erro ao gerar história' 
    });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});