// ⚠️ COPIE E COLE ISSO INTEIRO NA FUNÇÃO: supabase/functions/generate-diagnosis/index.ts
// NO LOVABLE: Files > supabase/functions/generate-diagnosis/index.ts > Delete All > Paste This

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

/**
 * Fetch dados de mercado do BCB em paralelo
 * Fontes: Banco Central (Selic, CDI, IPCA, USD) + brapi (IBOV)
 */
async function getMarketData() {
  try {
    const [selicRes, cdiRes, ipcaRes, usdRes] = await Promise.all([
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json"),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json"),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json"),
      fetch("https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json"),
    ]);

    const [selic, cdi, ipca, usd] = await Promise.all([selicRes.json(), cdiRes.json(), ipcaRes.json(), usdRes.json()]);

    // Extrai último valor (mais recente)
    const getLatest = (arr: any[]) => {
      const item = arr[arr.length - 1];
      return { value: parseFloat(item.valor), date: item.data };
    };

    // IBOV via brapi
    let ibov = { value: 128000, change: 0 };
    try {
      const ibovRes = await fetch("https://brapi.dev/api/quote/^BVSP");
      if (ibovRes.ok) {
        const ibovData = await ibovRes.json();
        const quote = ibovData.results?.[0];
        if (quote) {
          ibov = {
            value: quote.regularMarketPrice || 128000,
            change: quote.regularMarketChangePercent || 0,
          };
        }
      }
    } catch (e) {
      console.warn("IBOV fetch warning:", e);
    }

    return {
      selic: getLatest(selic),
      cdi: getLatest(cdi),
      ipca: getLatest(ipca),
      usdBrl: getLatest(usd),
      ibov,
      timestamp: new Date().toISOString(),
    };
  } catch (e) {
    console.error("Market data fetch error:", e);
    // Fallback com valores estimados (não quebra)
    return {
      selic: { value: 10.5, date: new Date().toLocaleDateString("pt-BR") },
      cdi: { value: 10.15, date: new Date().toLocaleDateString("pt-BR") },
      ipca: { value: 4.2, date: new Date().toLocaleDateString("pt-BR") },
      usdBrl: { value: 5.15, date: new Date().toLocaleDateString("pt-BR") },
      ibov: { value: 128000, change: 0.5 },
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Formata dados de mercado pra contexto da IA
 */
function formatMarketContext(marketData: any): string {
  return `## CONTEXTO DE MERCADO (${marketData.timestamp})

**Taxa Selic:** ${marketData.selic.value.toFixed(2)}% a.a. (${marketData.selic.date})
**CDI:** ${marketData.cdi.value.toFixed(2)}% a.a. (${marketData.cdi.date})
**IPCA:** ${marketData.ipca.value.toFixed(2)}% (${marketData.ipca.date})
**USD/BRL (PTAX venda):** R$ ${marketData.usdBrl.value.toFixed(4)} (${marketData.usdBrl.date})
**IBOV:** ${marketData.ibov.value.toFixed(0)} pts (variação: ${marketData.ibov.change > 0 ? "+" : ""}${marketData.ibov.change.toFixed(2)}%)

Use esses dados como benchmark, referência de taxa de desconto e expectativas de retorno.`;
}

/**
 * System prompt otimizado pra Claude - GAP REPORT (Lead Qualification)
 * NÃO é alocação granular, é qualificação de leads
 */
function getSystemPrompt(): string {
  return `Você é um Planejador Financeiro CFP® Sênior especializado em Lead Qualification. 
Seu objetivo é analisar o perfil patrimonial de um prospect e gerar um GAP REPORT que mapeia 
GAPS CRÍTICOS (o que falta), RISCOS (o que está errado) e INEFICIÊNCIAS (onde está sendo "comido").

EXPERTISE:
- Finanças Comportamentais (Money Scripts, vieses, Morgan Housel)
- Financial Planning & Suitability CVM (tripé: objetivo, situação, risco)
- Risk Management (gaps de proteção, solvência)
- Gestão de Portfólio Macro (diversificação, correlação)
- Ativos Brasileiros & Riscos Brasil (Tesouro, CDB, FIDC, tributação)
- Fluxo de Caixa & Solvência (margem, índice de cobertura)
- Análise de Extratos (OCR parsed data)

TOM: Direto, factual, vendedor (cria urgência pra consultoria). Sem motivacional, sem jargão.

TAREFA: Gere um GAP REPORT de 2-3 "páginas" (JSON estruturado) que:
1. Mostra snapshot patrimonial (números-chave)
2. Mapeia 4-5 gaps críticos (o que falta)
3. Identifica 3-4 riscos (o que está errado)
4. Aponta 3-4 ineficiências (onde está sendo "comido" em R$)
5. Lista 3-4 oportunidades (por que contratar consultoria)
6. Dá score de urgência (1-10)
7. Resumo executivo + CTA

RESPONDA EXCLUSIVAMENTE EM JSON VÁLIDO (sem markdown, sem backticks):

{
  "snapshot": {
    "patrimonioTotal": "R$ X.XXX,XX",
    "rendaMensal": "R$ X.XXX,XX",
    "despesasFixas": "R$ X.XXX,XX",
    "margemPoupanca": "R$ X.XXX,XX",
    "reservaEmergencia": {
      "valor": "R$ X.XXX,XX",
      "meses": X,
      "status": "OK|BAIXA|CRITICA"
    },
    "indiceEndividamento": {
      "percentual": X,
      "status": "OK|ALERTA|CRITICO"
    },
    "horizonte": "X anos",
    "perfilIdentificado": "Conservador|Moderado|Arrojado"
  },
  
  "gaps": [
    {
      "tipo": "Proteção|Diversificação|Liquidez|Sucessão|Estrutura",
      "descricao": "descrição concisa",
      "severidade": "Crítica|Alta|Média",
      "impacto": "descrição do risco/custo"
    }
  ],
  
  "riscos": [
    {
      "tipo": "Mercado|Crédito|Liquidez|Concentração|Câmbio",
      "descricao": "descrição concisa",
      "quantidade": "R$ XXX ou X%",
      "drawdown": "-X%",
      "impactoFinanceiro": "R$ XXX",
      "severidade": "Crítica|Alta|Média"
    }
  ],
  
  "ineficiencias": [
    {
      "categoria": "Taxa|Tributária|Custos Implícitos|Dívida|Alocação",
      "descricao": "descrição concisa com antes/depois",
      "custoAnualAtual": "R$ XXX",
      "custoAnualOtimizado": "R$ XXX",
      "economiaAnual": "R$ XXX"
    }
  ],
  
  "oportunidades": [
    {
      "tema": "tema da oportunidade",
      "descricao": "breve descrição",
      "impacto": "+X% a.a. ou -R$ XXX/ano ou Risco reduzido em X%",
      "tempoImplementacao": "X semanas/meses"
    }
  ],
  
  "urgencia": {
    "score": X,
    "justificativa": "1-2 frases explicando o score"
  },
  
  "resumoExecutivo": "2-3 parágrafos diretos identificando problema central + oportunidade + por que contratar",
  
  "ctaFinal": "1 parágrafo conclusivo com call-to-action claro"
}

REGRAS CRÍTICAS (LEAD QUALIFICATION):

1. **NÃO recomende alocação granular de ativos**
   ❌ "Coloque 15% em Tesouro IPCA, 10% em FIIs..."
   ✅ "Você precisa de 20-30% em renda variável com proteção via opções"

2. **Use números concretos, não vagos**
   ❌ "Você está gastando muito com taxas"
   ✅ "Você está pagando R$ 45.000/ano a mais em taxas do que deveria"

3. **Crie urgência com dados**
   ❌ "Você pode perder tudo amanhã"
   ✅ "Em recessão (-15%), seu drawdown seria de R$ 180K com reserva de apenas 3 meses"

4. **Sempre compare com alternativa**
   ❌ "Seu CDB está ruim"
   ✅ "CDB (2% taxa implícita) vs. Tesouro Selic (0%) = R$ 30K/ano de diferença"

5. **Honre o Money Script do cliente**
   - Se avesso a risco: não force agressividade
   - Se deseja controle: não venda "caixa preta"

6. **Identifique vieses comportamentais**
   - Aversão à Perda: mantém posição perdedora
   - Ancoragem: preso em preço passado
   - Status Quo: "sempre foi assim"
   - Disponibilidade: decisão baseada em notícia recente

7. **Feche com urgência clara**
   - Score 8-10: Múltiplos gaps + vulnerabilidade → Contratar agora
   - Score 5-7: Gaps significativos → Conversa consultiva importante
   - Score 1-4: Estrutura ok → Manutenção/revisão anual

SUCESSO DO AGENTE:
Meta: 40%+ dos leds que leem o Gap Report avançam pra conversa 1:1 com consultor
`;
}
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { questionnaire, narrative, extractsDescription } = await req.json();

    // Lê chave Claude do Supabase Secrets
    const CLAUDE_API_KEY = Deno.env.get("CLAUDE_API_KEY");
    if (!CLAUDE_API_KEY) {
      throw new Error("CLAUDE_API_KEY is not configured in Supabase Secrets. Go to Settings > Secrets and add it.");
    }

    console.log("[1/3] Fetching live market data from BCB + brapi...");
    const marketData = await getMarketData();
    const marketContext = formatMarketContext(marketData);

    console.log("[2/3] Building user message with questionnaire + narrative...");
    let userMessage = marketContext + "\n\n";
    userMessage += "## DADOS DO CLIENTE\n\n";

    // Filtra dados importantes (reduz tokens)
    const importantKeys = [
      "nomeCompleto",
      "idade",
      "rendaBruta",
      "patrimonioFinanceiro",
      "patrimonioImobiliario",
      "dividas",
      "objetivo",
      "horizonte",
      "perfilAnbima",
      "reacaoQuedas",
      "perdaMaxima",
      "experiencia",
      "estadoCivil",
      "dependentes",
    ];

    for (const key of importantKeys) {
      const value = questionnaire?.[key];
      if (value) userMessage += `- ${key}: ${value}\n`;
    }

    // Carteira
    if (extractsDescription) {
      userMessage += `\n## CARTEIRA ATUAL\n${extractsDescription}\n`;
    } else {
      userMessage += "\n## CARTEIRA ATUAL\nSem extratos enviados. Gere carteira do zero com alocação prudente.\n";
    }

    // Relato pessoal (comportamental)
    if (narrative) {
      userMessage += `\n## RELATO PESSOAL (COMPORTAMENTAL)\n${narrative}\n`;
    } else {
      userMessage += "\n## RELATO PESSOAL\nNão fornecido. Retorne comportamental: null.\n";
    }

    console.log(
      `[3/3] Calling Claude API (message size: ${userMessage.length} chars, ~${Math.round(userMessage.length / 4)} tokens)...`,
    );

    // Chama Claude direto (não Gemini, não gateway)
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": CLAUDE_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 4096,
        system: getSystemPrompt(),
        messages: [{ role: "user", content: userMessage }],
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Claude API error: ${response.status}`, JSON.stringify(errorData).substring(0, 500));

      if (response.status === 401) {
        return new Response(
          JSON.stringify({
            error: "Claude API key invalid or expired. Check Supabase Secrets.",
          }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in 1 minute." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      throw new Error(`Claude API returned ${response.status}: ${errorData.error?.message || ""}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text;

    if (!content) {
      throw new Error("No content in Claude response");
    }

    // Parse JSON (remove markdown fences se houver)
    let cleanContent = content.trim();
    if (cleanContent.startsWith("```")) {
      cleanContent = cleanContent.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
    }

    let diagnosis;
    try {
      diagnosis = JSON.parse(cleanContent);
    } catch (parseError) {
      console.error("Failed to parse Claude response as JSON:", cleanContent.substring(0, 1000));
      throw new Error(`Claude response was not valid JSON. First 500 chars: ${cleanContent.substring(0, 500)}`);
    }

    console.log("✅ Diagnosis generated successfully");
    return new Response(JSON.stringify({ diagnosis }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("generate-diagnosis error:", e);
    const errorMessage = e instanceof Error ? e.message : "Unknown error";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
