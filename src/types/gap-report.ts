/**
 * Types for Gap Report Analysis
 * Estrutura de dados para o novo sistema de diagnóstico
 */

export interface SnapshotPatrimonial {
  patrimonioTotal: string;
  rendaMensal: string;
  despesasFixas: string;
  margemPoupanca: string;
  reservaEmergencia: {
    valor: string;
    meses: number;
    ideal: "6-12 meses";
    status: "OK" | "BAIXA" | "CRITICA";
  };
  indiceEndividamento: {
    percentual: number;
    status: "OK" | "ALERTA" | "CRITICO";
  };
  horizonte: string;
  perfilIdentificado: "Conservador" | "Moderado" | "Arrojado" | "Agressivo";
}

export interface Gap {
  id: string;
  tipo: "Proteção" | "Diversificação" | "Liquidez" | "Sucessão" | "Estrutura" | "Outro";
  descricao: string;
  severidade: "Crítica" | "Alta" | "Média";
  impacto: string;
  riscosAssociados?: string[];
}

export interface Risco {
  id: string;
  tipo: "Mercado" | "Crédito" | "Liquidez" | "Concentração" | "Câmbio" | "Comportamental";
  descricao: string;
  quantidade: string; // R$ XXX
  drawdown?: string; // -X%
  impactoFinanceiro: string; // R$ XXX
  severidade: "Crítica" | "Alta" | "Média";
}

export interface Ineficiencia {
  id: string;
  categoria: "Taxa" | "Tributária" | "Custos Implícitos" | "Dívida Cara" | "Alocação";
  descricao: string;
  custoAnualAtual: string; // R$ XXX
  custoAnualOtimizado: string; // R$ XXX
  economiaAnual: string; // R$ XXX
  complexidade: "Baixa" | "Média" | "Alta";
  tempoimplementacao: string; // "1 semana", "2 meses", etc
}

export interface Oportunidade {
  id: string;
  tema: string;
  descricao: string;
  impacto: {
    tipo: "Retorno" | "Custo" | "Risco" | "Proteção";
    valor: string; // "+2.5% a.a." ou "-R$ 45K/ano" ou "Reduz risco em X%"
  };
  complexidade: "Baixa" | "Média" | "Alta";
  tempoImplementacao: string;
  porQueContratar: string;
}

export interface GapReport {
  cliente: {
    nome: string;
    idade: number;
    profissao: string;
  };
  dataGeracao: string;
  snapshot: SnapshotPatrimonial;
  gaps: Gap[];
  riscos: Risco[];
  ineficiencias: Ineficiencia[];
  oportunidades: Oportunidade[];
  urgencia: {
    score: number; // 1-10
    justificativa: string;
  };
  resumoExecutivo: string; // 2-3 parágrafos
  ctaFinal: string;
}

// Types para entrada (questionnaire processado)
export interface QuestionnaireProcessado {
  // Identificação
  nomeCompleto: string;
  idade: number;
  profissao: string;

  // Fluxo de Caixa
  rendaMensal: number;
  naturezaRenda: "Fixa" | "Variável" | "Híbrida";
  despesasFixas: number;
  despesasVariaveis?: number;
  margem?: number; // Calculado

  // Patrimônio
  reservaImediata: number;
  rendaFixa: number;
  rendaVariavel: number;
  imoveisUso?: number;
  imoveisRenda?: number;
  patrimonioTotal?: number; // Calculado

  // Dívidas
  saldoDevedor: number;
  taxaMediaJuros?: number;
  indiceEndividamento?: number; // Calculado

  // Suitability
  objetivo: string;
  horizonte: number; // anos
  reacaoVolatilidade: "Vende" | "Mantém" | "Compra Mais";
  buscaRetorno: "Preservar" | "Crescimento Moderado" | "Crescimento Agressivo";

  // Comportamento
  moneyScript?: string;
  dormiPerdeOSono: string;
  restricoes?: string[];

  // Estrutura Familiar
  estadoCivil: string;
  dependentes: number;
  temSeguro: boolean;
  temTestamento: boolean;

  // Extratos (OCR Parsed)
  extratosOCR?: ExtratoParsed[];
}

// Types para OCR de Extratos
export interface ExtratoParsed {
  tipo: "Tesouro" | "Corretora" | "Banco" | "Previdência" | "Outro";
  dataExtracao: string;
  saldos: {
    [classe: string]: number; // "Tesouro IPCA": 500000, "Ações": 300000
  };
  taxas?: {
    [descricao: string]: number; // "Taxa admin": 1.5, "IR": 15
  };
  custos?: {
    [descricao: string]: number; // "Corretagem": 50, "Custódia": 200
  };
  desempenho?: {
    [periodo: string]: number; // "6M": 5.2, "YTD": 8.5, "1Y": 10.2
  };
  dadosAdicionais?: Record<string, any>;
}

// Types para análise de eficiência
export interface AnaliseEficiencia {
  alocacaoAtual: {
    [classe: string]: {
      valor: number;
      percentual: number;
      retornoEsperado: number;
      taxa: number;
      custoImplicito: number;
    };
  };
  alocacaoOtimizada: {
    [classe: string]: {
      valor: number;
      percentual: number;
      retornoEsperado: number;
      taxa: number;
      custoImplicito: number;
    };
  };
  diferencial: {
    retornoAdional: number; // % a.a.
    custoReduzido: number; // R$ / ano
    riscoDiminuido: number; // % (VaR)
  };
}

// Types para Market Data Context
export interface MarketDataContext {
  selic: number; // % a.a.
  cdi: number; // % a.a.
  ipca: number; // % (último mês)
  ibov: number; // pontos
  usdBrl: number; // cotação
  dataSnapshot: string;
}

export enum SeveridadeGap {
  CRITICA = "Crítica",
  ALTA = "Alta",
  MEDIA = "Média",
  BAIXA = "Baixa",
}

export enum TipoGap {
  PROTECAO = "Proteção",
  DIVERSIFICACAO = "Diversificação",
  LIQUIDEZ = "Liquidez",
  SUCESSAO = "Sucessão",
  ESTRUTURA = "Estrutura",
}

export enum StatusReserva {
  OK = "OK",
  BAIXA = "BAIXA",
  CRITICA = "CRITICA",
}
