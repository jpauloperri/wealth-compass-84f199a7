/**
 * Claude Analysis Service
 * Substitui Gemini via Lovable Gateway por Claude API direto
 * Reduz custos, melhora output, permite prompt engineering avançado
 */

interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export class ClaudeAnalysisService {
  private apiKey: string;
  private model: string = "claude-3-5-sonnet-20241022"; // Melhor custo-benefício

  constructor(apiKey: string) {
    if (!apiKey) {
      throw new Error("CLAUDE_API_KEY is required");
    }
    this.apiKey = apiKey;
  }

  /**
   * Gera diagnóstico patrimonial via Claude
   * Otimizado pra 2-3K tokens por chamada
   */
  async generateDiagnosis(params: {
    questionnaire: Record<string, any>;
    narrative?: string;
    marketData: string;
    uploadsInfo?: string;
  }): Promise<any> {
    const systemPrompt = this.getSystemPrompt();
    const userMessage = this.buildUserMessage(params);

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: userMessage }],
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("Claude API error:", errorData);
        throw new Error(
          `Claude API returned ${response.status}: ${errorData.error?.message || "Unknown error"}`
        );
      }

      const data = await response.json();
      const content = data.content?.[0]?.text;

      if (!content) {
        throw new Error("No content in Claude response");
      }

      // Parse JSON response
      let diagnosis;
      try {
        // Remove markdown fences if present
        let cleanContent = content.trim();
        if (cleanContent.startsWith("```")) {
          cleanContent = cleanContent.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "");
        }
        diagnosis = JSON.parse(cleanContent);
      } catch (parseError) {
        console.error("Failed to parse Claude response as JSON:", content.substring(0, 500));
        throw new Error("Claude response was not valid JSON");
      }

      return diagnosis;
    } catch (error) {
      console.error("Claude diagnosis generation failed:", error);
      throw error;
    }
  }

  /**
   * System prompt otimizado pra Claude
   * Mais assertivo, menos papo, foco em estrutura
   */
  private getSystemPrompt(): string {
    return `Você é estrategista sênior em investimentos e patrimônio, com certificações CFP®, CGA e CNPI.

EXPERTISE:
- Regulação CVM/ANBIMA/BACEN/Receita Federal para pessoa física
- Tributação: renda fixa, variável, fundos, PGBL/VGBL, exterior (Lei 14.754/2023)
- Finanças comportamentais e psicologia do investidor
- Planejamento sucessório, proteção patrimonial

TOM: Direto, objetivo, sem motivacional, sem jargão de coach. Profissional e humano.

TAREFA: Gere diagnóstico patrimonial completo baseado nos dados fornecidos.

RESPONDA EXCLUSIVAMENTE EM JSON VÁLIDO com esta estrutura (sem markdown, sem backticks):

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
    "padraoEmocional": "texto",
    "viesesIdentificados": "texto",
    "inconsistencias": "texto ou null",
    "diretriz": "ação concreta"
  },
  "carteiraAtual": [
    { "ativo": "nome", "classe": "classe", "pct": 25 }
  ],
  "alertasCriticos": ["alerta 1", "alerta 2"],
  "fluxoCaixa": {
    "capacidadeAporte": "texto",
    "vazamentos": "texto",
    "margemSeguranca": "X%"
  },
  "carteiraAlvo": [
    { "nome": "classe", "value": 25 }
  ],
  "comparativo": [
    { "classe": "nome", "atual": 45, "alvo": 25 }
  ],
  "carteiraFinal": [
    { "ativo": "nome", "ticker": "TICK11", "classe": "classe", "pct": 15, "valor": "R$ X" }
  ],
  "movimentacoes": [
    { "posicao": "nome", "valor": "R$ X", "acao": "MANTER|RESGATAR|REALOCAR|NOVO", "destino": "destino", "justificativa": "texto", "timing": "imediato|30d|90d" }
  ],
  "parametros": {
    "retornoNominal": "IPCA + X% a Y%",
    "retornoReal": "X% a Y%",
    "drawdownMaximo": "-X% a -Y%",
    "rebalanceamento": "texto",
    "estrategiaAportes": "texto"
  },
  "estrategiaTributaria": ["ponto 1", "ponto 2"],
  "escudoPatrimonial": {
    "indiceCobertura": "X meses",
    "analise": "texto",
    "recomendacoes": "texto"
  },
  "riscosEMitigantes": [
    { "risco": "descrição", "mitigante": "ação" }
  ],
  "followUp": ["pergunta 1", "pergunta 2", "pergunta 3"]
}

REGRAS:
- NÃO invente dados. Se ausente, indique claramente.
- Use aporte EFETIVO (não declarado) quando houver discrepância.
- Valores sempre em formato brasileiro (R$ X.XXX,XX).
- Se sem relato pessoal, retorne comportamental: null
- Se sem extratos, gere carteira do zero com alocação prudente
- Integre dados de mercado (Selic, CDI, IPCA, IBOV) nas recomendações
- Seja direto nas críticas e oportunidades
- Priorize implementabilidade sobre complexidade teórica`;
  }

  /**
   * Monta mensagem do usuário com dados estruturados
   * Otimizado pra não estourar 3K tokens
   */
  private buildUserMessage(params: {
    questionnaire: Record<string, any>;
    narrative?: string;
    marketData: string;
    uploadsInfo?: string;
  }): string {
    let message = "";

    // Dados de mercado (contexto crítico)
    message += params.marketData + "\n\n";

    // Questionnaire (compacto)
    message += "## PERFIL DO CLIENTE\n\n";
    const keys = Object.keys(params.questionnaire || {}).sort();
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
      "dependentes",
      "estadoCivil",
    ];

    for (const key of importantKeys) {
      const value = params.questionnaire[key];
      if (value) {
        message += `- ${key}: ${value}\n`;
      }
    }

    // Outros campos não críticos (compacto)
    const otherKeys = keys.filter((k) => !importantKeys.includes(k));
    if (otherKeys.length > 0) {
      message += "\n**Dados Complementares:**\n";
      for (const key of otherKeys) {
        const value = params.questionnaire[key];
        if (value) {
          message += `${key}: ${value}; `;
        }
      }
      message += "\n\n";
    }

    // Uploads (se houver)
    if (params.uploadsInfo) {
      message += `\n## CARTEIRA ATUAL\n${params.uploadsInfo}\n`;
    } else {
      message += "\n## CARTEIRA ATUAL\nSem extratos enviados. Gere carteira do zero.\n";
    }

    // Relato pessoal (comportamental)
    if (params.narrative) {
      message += `\n## RELATO PESSOAL (DIMENSÃO COMPORTAMENTAL)\n${params.narrative}\n`;
    } else {
      message += "\n## RELATO PESSOAL\nNão fornecido. Omita análise comportamental (retorne null).\n";
    }

    return message;
  }

  /**
   * Valida resposta JSON da IA
   */
  static validateDiagnosisResponse(diagnosis: any): {
    valid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    if (!diagnosis.ips) errors.push("Seção 'ips' obrigatória");
    if (!diagnosis.alertasCriticos || !Array.isArray(diagnosis.alertasCriticos)) {
      errors.push("'alertasCriticos' deve ser array");
    }
    if (!diagnosis.carteiraAlvo || !Array.isArray(diagnosis.carteiraAlvo)) {
      errors.push("'carteiraAlvo' deve ser array");
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

export default ClaudeAnalysisService;
