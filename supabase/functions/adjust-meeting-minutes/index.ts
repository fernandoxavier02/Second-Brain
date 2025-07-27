import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Initialize Supabase client
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Adjust meeting minutes function called');
    
    // Verify authentication
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    const requestBody = await req.json();
    const { originalMinutes, adjustmentRequest, transcription } = requestBody;
    
    // Input validation
    if (!originalMinutes || typeof originalMinutes !== 'string') {
      throw new Error('Original minutes are required');
    }
    
    if (!adjustmentRequest || typeof adjustmentRequest !== 'string') {
      throw new Error('Adjustment request is required');
    }

    if (!transcription || typeof transcription !== 'string') {
      throw new Error('Original transcription is required');
    }

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Processing adjustment request...');

    // Generate adjusted meeting minutes using GPT
    const adjustmentPrompt = `
Você é um assistente especializado em ajustar atas de reunião corporativas. Sua função é fazer APENAS os ajustes solicitados, mantendo-se EXTREMAMENTE FIEL ao conteúdo da transcrição original.

TRANSCRIÇÃO ORIGINAL: ${transcription}

ATA ATUAL: ${originalMinutes}

SOLICITAÇÃO DE AJUSTE: ${adjustmentRequest}

INSTRUÇÕES CRÍTICAS:
- Faça APENAS os ajustes especificamente solicitados
- JAMAIS invente, assuma ou adicione informações que não estejam na transcrição original
- JAMAIS crie situações, decisões ou ações que não foram claramente discutidas no áudio
- Mantenha o tom CORPORATIVO E FORMAL em toda a ata
- Use linguagem profissional e objetiva
- Se o ajuste solicitado exigir informações que não estão na transcrição, explique que não é possível fazer o ajuste
- Seja conservador: prefira manter a ata atual a inventar informações

REGRAS PARA AJUSTES:
1. Se solicitado mudança de formato: ajuste apenas a estrutura/apresentação
2. Se solicitado inclusão de informações: verifique se existe na transcrição
3. Se solicitado correção: corrija apenas se baseado na transcrição
4. Se solicitado remoção: remova apenas se for apropriado

Retorne a ata ajustada mantendo a mesma estrutura corporativa formal, ou explique por que o ajuste não pode ser feito se exigir informações não presentes na transcrição.

REGRA FUNDAMENTAL: Toda informação deve estar presente na transcrição original. Se não estiver, não inclua.
`;

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Você é um assistente especializado em ajustar atas de reunião profissionais, mantendo sempre fidelidade à transcrição original e tom corporativo formal.'
          },
          {
            role: 'user',
            content: adjustmentPrompt
          }
        ],
        temperature: 0.3,
        max_tokens: 2500,
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('OpenAI GPT error:', errorText);
      throw new Error(`OpenAI GPT error: ${errorText}`);
    }

    const gptResult = await gptResponse.json();
    const adjustedMinutes = gptResult.choices[0].message.content;

    console.log('Meeting minutes adjusted successfully');

    return new Response(
      JSON.stringify({ 
        adjustedMinutes: adjustedMinutes 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in adjust-meeting-minutes function:', error);
    
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error.message.includes('Authentication required') || 
        error.message.includes('required') ||
        error.message.includes('Invalid')) {
      errorMessage = error.message;
      statusCode = 400;
    }
    
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: statusCode,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});