import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Starting journal analysis...');
    const { transcription, timeframe } = await req.json();
    
    if (!transcription) {
      throw new Error('No transcription provided');
    }

    const systemPrompt = `Você é um assistente especializado em análise de diários pessoais e journaling. 
Sua função é analisar as entradas de diário do usuário e fornecer insights significativos e úteis sobre:
- Padrões emocionais e mentais
- Temas recorrentes
- Momentos de crescimento pessoal
- Sugestões de reflexão
- Observações sobre bem-estar

Seja empático, construtivo e encorajador. Mantenha um tom acolhedor e de apoio.
${timeframe ? `Esta análise se refere ao período: ${timeframe}` : ''}`;

    const userPrompt = `Analise a seguinte entrada de diário e forneça insights profundos e úteis:

${transcription}

Forneça uma análise estruturada com:
1. Resumo do que foi compartilhado
2. Principais temas e emoções identificadas
3. Insights e observações construtivas
4. Sugestões para reflexão ou ação`;

    console.log('Sending to Lovable AI (Gemini)...');
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('LOVABLE_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Limite de requisições excedido. Tente novamente em alguns instantes.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: 'Créditos insuficientes. Adicione créditos ao seu workspace Lovable.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      throw new Error(`Lovable AI error: ${errorText}`);
    }

    const result = await response.json();
    const insights = result.choices[0].message.content;
    console.log('Analysis successful');

    return new Response(
      JSON.stringify({ insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in journal analysis:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});