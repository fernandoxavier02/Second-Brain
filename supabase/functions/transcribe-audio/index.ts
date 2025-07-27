import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour in milliseconds
const MAX_REQUESTS_PER_HOUR = 10;

// Initialize Supabase client for rate limiting
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

// Process base64 in chunks to prevent memory issues
function processBase64Chunks(base64String: string, chunkSize = 32768) {
  const chunks: Uint8Array[] = [];
  let position = 0;
  
  while (position < base64String.length) {
    const chunk = base64String.slice(position, position + chunkSize);
    const binaryChunk = atob(chunk);
    const bytes = new Uint8Array(binaryChunk.length);
    
    for (let i = 0; i < binaryChunk.length; i++) {
      bytes[i] = binaryChunk.charCodeAt(i);
    }
    
    chunks.push(bytes);
    position += chunkSize;
  }

  const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

// Rate limiting function
async function checkRateLimit(userId: string): Promise<void> {
  const now = new Date();
  const windowStart = new Date(now.getTime() - RATE_LIMIT_WINDOW);
  
  // Get current rate limit entry
  const { data: rateLimits, error } = await supabase
    .from('api_rate_limits')
    .select('*')
    .eq('user_id', userId)
    .eq('endpoint', 'transcribe-audio')
    .gte('window_start', windowStart.toISOString());

  if (error) {
    console.error('Rate limit check error:', error);
    throw new Error('Rate limit check failed');
  }

  const totalRequests = rateLimits?.reduce((sum, limit) => sum + limit.request_count, 0) || 0;

  if (totalRequests >= MAX_REQUESTS_PER_HOUR) {
    throw new Error('Rate limit exceeded. Maximum 10 requests per hour');
  }

  // Update or create rate limit entry
  const { error: upsertError } = await supabase
    .from('api_rate_limits')
    .upsert({
      user_id: userId,
      endpoint: 'transcribe-audio',
      request_count: 1,
      window_start: now.toISOString(),
    });

  if (upsertError) {
    console.error('Rate limit update error:', upsertError);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Transcribe audio function called');
    
    // Verify authentication and extract user ID
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Authentication required');
    }

    // Extract JWT token and verify it to get user ID
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      throw new Error('Invalid authentication token');
    }

    // Check rate limiting
    await checkRateLimit(user.id);

    const requestBody = await req.json();
    const { audio, meetingTitle } = requestBody;
    
    // Input validation
    if (!audio) {
      throw new Error('No audio data provided');
    }
    
    if (typeof audio !== 'string') {
      throw new Error('Invalid audio data format');
    }
    
    // Validate audio size (limit to 25MB base64, which is ~18MB actual file)
    if (audio.length > 25 * 1024 * 1024) {
      throw new Error('Audio file too large. Maximum size is 25MB');
    }
    
    // Validate meeting title
    if (meetingTitle && typeof meetingTitle !== 'string') {
      throw new Error('Invalid meeting title format');
    }
    
    // Sanitize meeting title
    const sanitizedTitle = meetingTitle ? meetingTitle.trim().substring(0, 200) : 'Reunião';

    const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY');
    if (!OPENAI_API_KEY) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Processing audio data...');
    
    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio);
    
    // Prepare form data for Whisper API
    const formData = new FormData();
    const blob = new Blob([binaryAudio], { type: 'audio/webm' });
    formData.append('file', blob, 'audio.webm');
    formData.append('model', 'whisper-1');
    formData.append('language', 'pt');
    formData.append('response_format', 'text');

    console.log('Sending to OpenAI Whisper API...');

    // Send to OpenAI Whisper for transcription
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!transcriptionResponse.ok) {
      const errorText = await transcriptionResponse.text();
      console.error('OpenAI transcription error:', errorText);
      throw new Error(`OpenAI transcription error: ${errorText}`);
    }

    const transcriptionText = await transcriptionResponse.text();
    console.log('Transcription completed, generating meeting minutes...');

    // Generate structured meeting minutes using GPT
    const meetingPrompt = `
Você é um assistente especializado em criar atas de reunião corporativas. Sua função é ser EXTREMAMENTE FIEL ao conteúdo da transcrição, mantendo sempre um tom formal e profissional.

Título da reunião: ${sanitizedTitle}

Transcrição: ${transcriptionText}

INSTRUÇÕES CRÍTICAS:
- JAMAIS invente, assuma ou adicione informações que não estejam EXPLICITAMENTE mencionadas na transcrição
- JAMAIS crie situações, decisões ou ações que não foram claramente discutidas no áudio
- Se algo não foi mencionado ou está pouco claro, simplesmente NÃO inclua na ata
- Mantenha um tom CORPORATIVO E FORMAL em toda a ata
- Use linguagem profissional e objetiva
- Seja conservador: é melhor ter uma ata menor e precisa do que uma ata completa mas imprecisa

Crie uma ata seguindo esta estrutura, incluindo APENAS o que realmente foi discutido:

# Ata da Reunião - ${sanitizedTitle}

**Data:** [Data atual]
**Horário:** [Não especificar se não mencionado]
**Participantes:** [APENAS nomes claramente mencionados na gravação, ou "Conforme registro da reunião" se não identificados]

## Resumo Executivo
[Breve resumo dos principais tópicos abordados na reunião, máximo 2-3 linhas]

## Principais Assuntos Tratados
[Organize em tópicos resumidos e numerados APENAS os assuntos que foram efetivamente discutidos:
1. [Tópico 1 - descrição concisa e formal]
2. [Tópico 2 - descrição concisa e formal]
...]

## Decisões Deliberadas
[APENAS decisões explicitamente mencionadas na conversa, usando linguagem formal - se nenhuma decisão clara foi tomada, escreva "Não foram registradas decisões específicas durante esta reunião"]

## Ações e Responsabilidades
[APENAS ações claramente definidas na conversa, especificando responsável quando mencionado - se não houve ações específicas, escreva "Não foram definidas ações específicas durante esta reunião"]

## Encaminhamentos
[APENAS se foram explicitamente discutidos próximos passos ou encaminhamentos - caso contrário, omitir esta seção]

---
*Documento gerado automaticamente com base na transcrição fiel do áudio da reunião*

REGRA FUNDAMENTAL: Se você não tem certeza absoluta de que algo foi dito, NÃO inclua na ata. Use sempre linguagem corporativa formal.
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
            content: 'Você é um assistente especializado em criar atas de reunião profissionais e bem estruturadas em português brasileiro.'
          },
          {
            role: 'user',
            content: meetingPrompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!gptResponse.ok) {
      const errorText = await gptResponse.text();
      console.error('OpenAI GPT error:', errorText);
      throw new Error(`OpenAI GPT error: ${errorText}`);
    }

    const gptResult = await gptResponse.json();
    const meetingMinutes = gptResult.choices[0].message.content;

    console.log('Meeting minutes generated successfully');

    return new Response(
      JSON.stringify({ 
        transcription: transcriptionText,
        meetingMinutes: meetingMinutes 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in transcribe-audio function:', error);
    
    // Don't expose sensitive error details
    let errorMessage = 'Internal server error';
    let statusCode = 500;
    
    if (error.message.includes('Authentication required') || 
        error.message.includes('Invalid audio data') ||
        error.message.includes('No audio data provided') ||
        error.message.includes('Audio file too large') ||
        error.message.includes('Invalid meeting title')) {
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