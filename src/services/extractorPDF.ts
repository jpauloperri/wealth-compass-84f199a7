/**
 * PDF OCR & Extract Parser Service
 * Extrai dados de extratos em PDF (Tesouro, Corretora, Banco, Previdência)
 */

import type { ExtratoParsed } from "@/types/gap-report";

/**
 * Parse extrato de Tesouro Direto
 * Procura por padrões como "Tesouro IPCA", valores em R$, VNA
 */
function parseTesouroDireto(text: string): Partial<ExtratoParsed> {
  const saldos: Record<string, number> = {};

  // Padrões de títulos do Tesouro
  const padroes = [
    /Tesouro IPCA\s+(\d{2}\/\d{2}\/\d{4})\s+.*?[\s$]+([0-9.,]+)/g,
    /Tesouro Prefixado\s+(\d{2}\/\d{2}\/\d{4})\s+.*?[\s$]+([0-9.,]+)/g,
    /Tesouro Selic\s+.*?[\s$]+([0-9.,]+)/g,
  ];

  padroes.forEach((padrao) => {
    let match;
    while ((match = padrao.exec(text)) !== null) {
      const titulo = text.substring(Math.max(0, match.index - 50), match.index).split("\n").pop() || "Tesouro";
      const valor = parseFloat(match[match.length - 1].replace(/\./g, "").replace(",", "."));
      if (valor > 0) {
        saldos[titulo.trim()] = valor;
      }
    }
  });

  return {
    tipo: "Tesouro" as const,
    saldos,
  };
}

/**
 * Parse extrato de Corretora (XP, Genial, Clear, etc)
 * Procura por estruturas de tabelas com Renda Fixa, Renda Variável, etc
 */
function parseCorretora(text: string): Partial<ExtratoParsed> {
  const saldos: Record<string, number> = {};
  const taxas: Record<string, number> = {};

  // Renda Fixa
  const rfMatch = text.match(/Renda\s+Fixa\s+[\s\S]*?(?:R\$\s+)?([0-9.,]+)/i);
  if (rfMatch) {
    saldos["Renda Fixa"] = parseFloat(rfMatch[1].replace(/\./g, "").replace(",", "."));
  }

  // Renda Variável
  const rvMatch = text.match(/Renda\s+Variável\s+[\s\S]*?(?:R\$\s+)?([0-9.,]+)/i);
  if (rvMatch) {
    saldos["Renda Variável"] = parseFloat(rvMatch[1].replace(/\./g, "").replace(",", "."));
  }

  // Fundos
  const fundsMatch = text.match(/Fundos?\s+[\s\S]*?(?:R\$\s+)?([0-9.,]+)/i);
  if (fundsMatch) {
    saldos["Fundos"] = parseFloat(fundsMatch[1].replace(/\./g, "").replace(",", "."));
  }

  // Taxa de administração
  const taxaMatch = text.match(/Taxa\s+(?:de\s+)?(?:administração|corretagem)\s*:?\s*([0-9.,]+)%/i);
  if (taxaMatch) {
    taxas["Taxa de Administração"] = parseFloat(taxaMatch[1].replace(",", "."));
  }

  return {
    tipo: "Corretora" as const,
    saldos,
    taxas,
  };
}

/**
 * Parse extrato de Banco (CDB, LCI, LCA, aplicações)
 */
function parseBanco(text: string): Partial<ExtratoParsed> {
  const saldos: Record<string, number> = {};

  // CDB
  const cdbMatch = text.match(/CDB\s+[\s\S]*?(?:R\$\s+)?([0-9.,]+)/i);
  if (cdbMatch) {
    saldos["CDB"] = parseFloat(cdbMatch[1].replace(/\./g, "").replace(",", "."));
  }

  // LCI
  const lciMatch = text.match(/LCI\s+[\s\S]*?(?:R\$\s+)?([0-9.,]+)/i);
  if (lciMatch) {
    saldos["LCI"] = parseFloat(lciMatch[1].replace(/\./g, "").replace(",", "."));
  }

  // LCA
  const lcaMatch = text.match(/LCA\s+[\s\S]*?(?:R\$\s+)?([0-9.,]+)/i);
  if (lcaMatch) {
    saldos["LCA"] = parseFloat(lcaMatch[1].replace(/\./g, "").replace(",", "."));
  }

  // Aplicações/Poupança
  const appMatch = text.match(/(?:Saldo|Aplicação|Poupança)\s+[\s\S]*?(?:R\$\s+)?([0-9.,]+)/i);
  if (appMatch) {
    saldos["Aplicações"] = parseFloat(appMatch[1].replace(/\./g, "").replace(",", "."));
  }

  return {
    tipo: "Banco" as const,
    saldos,
  };
}

/**
 * Parse extrato de Previdência Privada (PGBL/VGBL)
 */
function parsePrevidencia(text: string): Partial<ExtratoParsed> {
  const saldos: Record<string, number> = {};

  // Procura por saldo total
  const saldoMatch = text.match(/(?:Saldo\s+)?Total\s+[\s\S]*?(?:R\$\s+)?([0-9.,]+)/i);
  if (saldoMatch) {
    saldos["Previdência Privada"] = parseFloat(saldoMatch[1].replace(/\./g, "").replace(",", "."));
  }

  // Tipo (PGBL ou VGBL)
  const tipo = text.includes("PGBL") ? "PGBL" : text.includes("VGBL") ? "VGBL" : "Previdência";
  saldos[tipo] = saldos["Previdência Privada"] || 0;

  return {
    tipo: "Previdência" as const,
    saldos,
  };
}

/**
 * Detecta tipo de extrato baseado em palavras-chave
 */
function detectTipoExtrato(text: string): "Tesouro" | "Corretora" | "Banco" | "Previdência" | "Outro" {
  const textoNormalizado = text.toUpperCase();

  if (textoNormalizado.includes("TESOURO DIRETO") || textoNormalizado.includes("B3")) {
    return "Tesouro";
  }
  if (
    textoNormalizado.includes("CORRETORA") ||
    textoNormalizado.includes("XP") ||
    textoNormalizado.includes("GENIAL") ||
    textoNormalizado.includes("CLEAR")
  ) {
    return "Corretora";
  }
  if (
    textoNormalizado.includes("BANCO") ||
    textoNormalizado.includes("CDB") ||
    textoNormalizado.includes("LCI") ||
    textoNormalizado.includes("LCA")
  ) {
    return "Banco";
  }
  if (textoNormalizado.includes("PREVIDÊNCIA") || textoNormalizado.includes("PGBL") || textoNormalizado.includes("VGBL")) {
    return "Previdência";
  }

  return "Outro";
}

/**
 * Extrai números em formato brasileiro (R$ 1.234,56) → 1234.56
 */
function extractValor(texto: string): number {
  const match = texto.match(/([0-9.,]+)/);
  if (!match) return 0;
  return parseFloat(match[0].replace(/\./g, "").replace(",", "."));
}

/**
 * Main: Processa PDF extraído como texto
 * Recebe texto do PDF já extraído (via pdf.js ou similar no frontend)
 */
export async function parseExtratoFinanceiro(textoDoPDF: string, nomeArquivo: string): Promise<ExtratoParsed> {
  const tipo = detectTipoExtrato(textoDoPDF);

  let resultado: Partial<ExtratoParsed> = {
    tipo,
    dataExtracao: new Date().toISOString().split("T")[0],
  };

  // Processa conforme tipo
  switch (tipo) {
    case "Tesouro":
      resultado = { ...resultado, ...parseTesouroDireto(textoDoPDF) };
      break;
    case "Corretora":
      resultado = { ...resultado, ...parseCorretora(textoDoPDF) };
      break;
    case "Banco":
      resultado = { ...resultado, ...parseBanco(textoDoPDF) };
      break;
    case "Previdência":
      resultado = { ...resultado, ...parsePrevidencia(textoDoPDF) };
      break;
    default:
      // Fallback: tenta extrair padrão genérico "R$ XXXX"
      const valoresGenericosMatch = textoDoPDF.matchAll(/R\$\s+([0-9.,]+)/g);
      const valores = Array.from(valoresGenericosMatch).map((m) => extractValor(m[1]));
      if (valores.length > 0) {
        resultado.saldos = { Aplicações: valores.reduce((a, b) => a + b, 0) };
      }
  }

  return resultado as ExtratoParsed;
}

/**
 * Frontend: Extrai texto de PDF usando pdf.js
 * Retorna array de páginas extraídas
 */
export async function extractTextFromPDF(file: File): Promise<string> {
  // Dinâmico: carrega pdf.js apenas se precisar
  const pdfjsLib = (await import("pdfjs-dist")).default;
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let textCompleto = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const textoPage = textContent.items.map((item: any) => item.str).join(" ");
    textCompleto += textoPage + "\n";
  }

  return textCompleto;
}

/**
 * Processa múltiplos arquivos de extrato
 */
export async function processarExtratosMultiplos(files: File[]): Promise<ExtratoParsed[]> {
  const resultados: ExtratoParsed[] = [];

  for (const file of files) {
    try {
      // Se for PDF, extrai texto
      let texto = "";
      if (file.type === "application/pdf") {
        texto = await extractTextFromPDF(file);
      } else if (file.type.startsWith("text/")) {
        // Se for texto, lê direto
        texto = await file.text();
      } else if (file.type.startsWith("image/")) {
        // Se for imagem, precisaria de OCR (Tesseract, etc)
        console.warn(`Arquivo ${file.name} é imagem, OCR não implementado`);
        continue;
      }

      const extrato = await parseExtratoFinanceiro(texto, file.name);
      if (Object.keys(extrato.saldos || {}).length > 0) {
        resultados.push(extrato);
      }
    } catch (e) {
      console.error(`Erro ao processar ${file.name}:`, e);
    }
  }

  return resultados;
}

/**
 * Consolida múltiplos extratos em um único "patrimônio total"
 */
export function consolidarExtratos(extratos: ExtratoParsed[]): {
  totalPorClasse: Record<string, number>;
  totalGeral: number;
  taxasImplicitas: Record<string, number>;
} {
  let totalGeral = 0;
  const totalPorClasse: Record<string, number> = {};
  const taxasImplicitas: Record<string, number> = {};

  for (const extrato of extratos) {
    // Saldos
    for (const [chave, valor] of Object.entries(extrato.saldos || {})) {
      totalPorClasse[chave] = (totalPorClasse[chave] || 0) + valor;
      totalGeral += valor;
    }

    // Taxas
    for (const [chave, valor] of Object.entries(extrato.taxas || {})) {
      taxasImplicitas[chave] = (taxasImplicitas[chave] || 0) + valor;
    }
  }

  return {
    totalPorClasse,
    totalGeral,
    taxasImplicitas,
  };
}
