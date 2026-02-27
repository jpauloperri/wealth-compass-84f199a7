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
 * System prompt otimizado pra Claude
 */
function getSystemPrompt(): string {
  return `Você é estrategista sênior em investimentos e patrimônio, com certificações CFP®, CGA e CNPI.

EXPERTISE:
- Regulação CVM/ANBIMA/BACEN/Receita Federal para pessoa física
- Tributação: renda fixa, variável, fundos, PGBL/VGBL, Lei 14.754/2023
- Finanças comportamentais, psicologia do investidor
- Planejamento sucessório, proteção patrimonial

TOM: Direto, objetivo, sem motivacional, sem jargão de coach. Profissional e humano.

TAREFA: Gere diagnóstico patrimonial completo. Integre dados de mercado reais.

RESPONDA EXCLUSIVAMENTE EM JSON VÁLIDO (sem markdown, sem backticks):

{
  "ips": {
    "perfil": "conservador|moderado|arrojado|agressivo",
    "horizonte": "X anos",
    "objetivo": "resumo em 1 linha",
    "patrimonioFinanceiro": "R$ X.XXX,XX",
    "retornoEsperado": "CDI + X% a Y% a.a.",
    "drawdownMaximo": "-X%",
    "proximaRevisao": "Mês/Ano",
    "benchmark": "composição"
  },
  "comportamental": {
    "padraoEmocional": "texto ou null",
    "viesesIdentificados": "texto ou null",
    "inconsistencias": "texto ou null",
    "diretriz": "ação concreta ou null"
  },
  "carteiraAtual": [
    { "ativo": "nome", "classe": "renda variável|renda fixa|fundos|outros", "pct": 25 }
  ],
  "alertasCriticos": ["alerta 1", "alerta 2", "alerta 3"],
  "fluxoCaixa": {
    "capacidadeAporte": "texto descritivo",
    "vazamentos": "texto descritivo",
    "margemSeguranca": "X%"
  },
  "carteiraAlvo": [
    { "nome": "nome da classe", "value": 25 }
  ],
  "comparativo": [
    { "classe": "nome", "atual": 45, "alvo": 25 }
  ],
  "carteiraFinal": [
    { "ativo": "nome do produto", "ticker": "TICK11", "classe": "classe", "pct": 15, "valor": "R$ X.XXX,XX" }
  ],
  "movimentacoes": [
    { "posicao": "nome", "valor": "R$ X", "acao": "MANTER|RESGATAR|REALOCAR|NOVA POSIÇÃO", "destino": "destino", "justificativa": "texto curto", "timing": "imediato|30 dias|90 dias" }
  ],
  "parametros": {
    "retornoNominal": "IPCA + X% a Y% a.a.",
    "retornoReal": "X% a Y% a.a.",
    "drawdownMaximo": "-X% a -Y%",
    "rebalanceamento": "semestral|anual|conforme necessário",
    "estrategiaAportes": "texto"
  },
  "estrategiaTributaria": ["ponto 1", "ponto 2", "ponto 3"],
  "escudoPatrimonial": {
    "indiceCobertura": "X meses",
    "analise": "texto descritivo",
    "recomendacoes": "texto descritivo"
  },
  "riscosEMitigantes": [
    { "risco": "descrição", "mitigante": "ação concreta" }
  ],
  "followUp": ["pergunta 1", "pergunta 2", "pergunta 3"]
}

REGRAS CRÍTICAS:
- NÃO invente dados. Se ausente, indique claramente.
- Use aporte EFETIVO (não declarado) quando houver discrepância.
- Valores: sempre em formato brasileiro (R$ X.XXX,XX).
- Se sem relato pessoal: comportamental = null
- Se sem extratos: gere carteira do zero com alocação prudente baseada no perfil
- Integre Selic, CDI, IPCA, IBOV nas recomendações e benchmarks
- Priorize implementabilidade sobre complexidade teórica
- Seja direto nas críticas, oportunidades e riscos
- Estrutura JSON deve ser válida sempre`;
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
