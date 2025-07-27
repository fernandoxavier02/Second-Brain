import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

function getContentPrompt(contentType: string) {
  switch (contentType) {
    case 'note':
      return `Analise este áudio e crie uma nota inteligente estruturada. Retorne APENAS um JSON válido no formato:
{
  "title": "Título da nota",
  "content": "Conteúdo da nota bem organizado",
  "tags": ["tag1", "tag2", "tag3"],
  "color": "blue"
}

Seja preciso e organize o conteúdo de forma clara. Use cores: yellow, blue, green, pink, purple, orange.`;

    case 'task':
      return `Analise este áudio e crie uma tarefa com checklist estruturada. Retorne APENAS um JSON válido no formato:
{
  "title": "Título da tarefa",
  "description": "Descrição detalhada da tarefa com checklist de itens a serem feitos",
  "priority": "medium",
  "tags": ["tag1", "tag2"],
  "completed": false
}

Organize a descrição como uma lista de itens práticos. Use prioridade: low, medium, high.`;

    case 'thought':
      return `Analise este áudio e crie um pensamento estruturado. Retorne APENAS um JSON válido no formato:
{
  "content": "Reflexão ou pensamento capturado do áudio",
  "mood": "neutral",
  "tags": ["tag1", "tag2"]
}

Capture a essência do pensamento ou reflexão. Use mood: positive, neutral, negative.`;

    default:
      return `Analise este áudio e crie conteúdo estruturado apropriado.`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Create smart content function called')
    
    const { audio, contentType } = await req.json()
    
    if (!audio) {
      throw new Error('No audio data provided')
    }

    if (!contentType) {
      throw new Error('Content type is required')
    }

    console.log(`Processing ${contentType} creation from audio...`)

    // Process audio in chunks
    const binaryAudio = processBase64Chunks(audio)
    
    // Prepare form data for transcription
    const formData = new FormData()
    const blob = new Blob([binaryAudio], { type: 'audio/webm' })
    formData.append('file', blob, 'audio.webm')
    formData.append('model', 'whisper-1')

    // Transcribe audio
    const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
      },
      body: formData,
    })

    if (!transcriptionResponse.ok) {
      throw new Error(`Transcription error: ${await transcriptionResponse.text()}`)
    }

    const transcriptionResult = await transcriptionResponse.json()
    const transcription = transcriptionResult.text

    console.log('Audio transcribed, generating structured content...')

    // Generate structured content
    const contentResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: getContentPrompt(contentType)
          },
          {
            role: 'user',
            content: `Transcrição do áudio: "${transcription}"`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!contentResponse.ok) {
      throw new Error(`Content generation error: ${await contentResponse.text()}`)
    }

    const contentResult = await contentResponse.json()
    const generatedContent = contentResult.choices[0].message.content

    console.log('Smart content created successfully')

    return new Response(
      JSON.stringify({ 
        content: generatedContent,
        transcription: transcription
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in create-smart-content function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})