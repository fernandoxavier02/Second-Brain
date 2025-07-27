import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getAdjustmentPrompt(contentType: string) {
  switch (contentType) {
    case 'note':
      return `Você é um assistente especializado em ajustar notas inteligentes. 
Analise o conteúdo original e a solicitação de ajuste do usuário.
Mantenha a estrutura JSON válida no formato:
{
  "title": "Título da nota",
  "content": "Conteúdo da nota bem organizado", 
  "tags": ["tag1", "tag2", "tag3"],
  "color": "blue"
}

Faça apenas os ajustes solicitados, mantendo a essência do conteúdo original.
Use cores disponíveis: yellow, blue, green, pink, purple, orange.`;

    case 'task':
      return `Você é um assistente especializado em ajustar tarefas com checklist.
Analise o conteúdo original e a solicitação de ajuste do usuário.
Mantenha a estrutura JSON válida no formato:
{
  "title": "Título da tarefa",
  "description": "Descrição detalhada da tarefa com checklist",
  "priority": "medium",
  "tags": ["tag1", "tag2"],
  "completed": false
}

Faça apenas os ajustes solicitados, mantendo a praticidade da tarefa.
Use prioridade: low, medium, high.`;

    case 'thought':
      return `Você é um assistente especializado em ajustar pensamentos e reflexões.
Analise o conteúdo original e a solicitação de ajuste do usuário.
Mantenha a estrutura JSON válida no formato:
{
  "content": "Reflexão ou pensamento",
  "mood": "neutral", 
  "tags": ["tag1", "tag2"]
}

Faça apenas os ajustes solicitados, preservando a reflexão original.
Use mood: positive, neutral, negative.`;

    default:
      return `Ajuste o conteúdo conforme solicitado pelo usuário, mantendo a estrutura original.`;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Adjust smart content function called')
    
    const { originalContent, adjustmentPrompt, contentType } = await req.json()
    
    if (!originalContent || !adjustmentPrompt || !contentType) {
      throw new Error('Missing required parameters')
    }

    console.log(`Processing ${contentType} adjustment...`)

    // Generate adjusted content
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
            content: getAdjustmentPrompt(contentType)
          },
          {
            role: 'user',
            content: `Conteúdo original: ${originalContent}

Solicitação de ajuste: ${adjustmentPrompt}

Por favor, ajuste o conteúdo conforme solicitado, mantendo o formato JSON válido.`
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${await response.text()}`)
    }

    const result = await response.json()
    const adjustedContent = result.choices[0].message.content

    console.log('Content adjusted successfully')

    return new Response(
      JSON.stringify({ adjustedContent }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error in adjust-smart-content function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})