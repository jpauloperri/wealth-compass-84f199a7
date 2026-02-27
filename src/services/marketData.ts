/**
 * Market Data Service
 * Integra dados reais e em tempo real do BCB, brapi e ANBIMA
 * Fornece cache local pra reduzir API calls
 */

interface MarketDataCache {
  selic: { value: number; date: string; fetchedAt: number };
  cdi: { value: number; date: string; fetchedAt: number };
  ipca: { value: number; date: string; fetchedAt: number };
  ibov: { value: number; change: number; fetchedAt: number };
  usdBrl: { value: number; date: string; fetchedAt: number };
  anbima?: {
    ima: any;
    ida: any;
    ihfa: any;
    idka: any;
    fetchedAt: number;
  };
}

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24h
const ANBIMA_CACHE_DURATION = 6 * 60 * 60 * 1000; // 6h (índices diários)
let cache: Partial<MarketDataCache> = {};

/**
 * Fetch Selic diária do BCB
 * Código SGS: 11
 */
async function fetchSelic(): Promise<{ value: number; date: string }> {
  if (cache.selic && Date.now() - cache.selic.fetchedAt < CACHE_DURATION) {
    return { value: cache.selic.value, date: cache.selic.date };
  }

  try {
    const response = await fetch(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.11/dados?formato=json"
    );
    if (!response.ok) throw new Error("BCB Selic fetch failed");

    const data = await response.json();
    // Último registro é o mais recente
    const latest = data[data.length - 1];
    const value = parseFloat(latest.valor);
    const date = latest.data;

    cache.selic = { value, date, fetchedAt: Date.now() };
    return { value, date };
  } catch (e) {
    console.error("Selic fetch error:", e);
    return { value: 10.5, date: new Date().toLocaleDateString("pt-BR") }; // Fallback
  }
}

/**
 * Fetch CDI diário do BCB
 * Código SGS: 12
 */
async function fetchCDI(): Promise<{ value: number; date: string }> {
  if (cache.cdi && Date.now() - cache.cdi.fetchedAt < CACHE_DURATION) {
    return { value: cache.cdi.value, date: cache.cdi.date };
  }

  try {
    const response = await fetch(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.12/dados?formato=json"
    );
    if (!response.ok) throw new Error("BCB CDI fetch failed");

    const data = await response.json();
    const latest = data[data.length - 1];
    const value = parseFloat(latest.valor);
    const date = latest.data;

    cache.cdi = { value, date, fetchedAt: Date.now() };
    return { value, date };
  } catch (e) {
    console.error("CDI fetch error:", e);
    return { value: 10.15, date: new Date().toLocaleDateString("pt-BR") };
  }
}

/**
 * Fetch IPCA mensal do BCB
 * Código SGS: 433
 */
async function fetchIPCA(): Promise<{ value: number; date: string }> {
  if (cache.ipca && Date.now() - cache.ipca.fetchedAt < CACHE_DURATION) {
    return { value: cache.ipca.value, date: cache.ipca.date };
  }

  try {
    const response = await fetch(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.433/dados?formato=json"
    );
    if (!response.ok) throw new Error("BCB IPCA fetch failed");

    const data = await response.json();
    const latest = data[data.length - 1];
    const value = parseFloat(latest.valor);
    const date = latest.data;

    cache.ipca = { value, date, fetchedAt: Date.now() };
    return { value, date };
  } catch (e) {
    console.error("IPCA fetch error:", e);
    return { value: 4.2, date: new Date().toLocaleDateString("pt-BR") };
  }
}

/**
 * Fetch IBOV em tempo real via brapi
 * Ticker: ^BVSP
 */
async function fetchIBOV(): Promise<{ value: number; change: number }> {
  if (cache.ibov && Date.now() - cache.ibov.fetchedAt < 5 * 60 * 1000) {
    // Cache 5min para tempo real
    return { value: cache.ibov.value, change: cache.ibov.change };
  }

  try {
    const response = await fetch("https://brapi.dev/api/quote/^BVSP");
    if (!response.ok) throw new Error("brapi IBOV fetch failed");

    const data = await response.json();
    const quote = data.results?.[0];
    if (!quote) throw new Error("No IBOV data in response");

    const value = quote.regularMarketPrice || 0;
    const change = quote.regularMarketChangePercent || 0;

    cache.ibov = { value, change, fetchedAt: Date.now() };
    return { value, change };
  } catch (e) {
    console.error("IBOV fetch error:", e);
    return { value: 128000, change: 0.5 };
  }
}

/**
 * Fetch USD/BRL (PTAX venda) do BCB
 * Código SGS: 1
 */
async function fetchUSDtoRBL(): Promise<{ value: number; date: string }> {
  if (cache.usdBrl && Date.now() - cache.usdBrl.fetchedAt < CACHE_DURATION) {
    return { value: cache.usdBrl.value, date: cache.usdBrl.date };
  }

  try {
    const response = await fetch(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados?formato=json"
    );
    if (!response.ok) throw new Error("BCB USD/BRL fetch failed");

    const data = await response.json();
    const latest = data[data.length - 1];
    const value = parseFloat(latest.valor);
    const date = latest.data;

    cache.usdBrl = { value, date, fetchedAt: Date.now() };
    return { value, date };
  } catch (e) {
    console.error("USD/BRL fetch error:", e);
    return { value: 5.15, date: new Date().toLocaleDateString("pt-BR") };
  }
}

/**
 * Fetch índices ANBIMA (IMA, IDA, IHFA, IDkA)
 * Requer autenticação OAuth2
 */
async function fetchANBIMAIndices(
  clientId: string,
  clientSecret: string
): Promise<any> {
  if (cache.anbima && Date.now() - cache.anbima.fetchedAt < ANBIMA_CACHE_DURATION) {
    return cache.anbima;
  }

  try {
    // Step 1: Get access token
    const authResponse = await fetch("https://api.anbima.com.br/oauth/authorize", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
    });

    if (!authResponse.ok) {
      console.error("ANBIMA auth failed:", authResponse.status);
      throw new Error("ANBIMA authentication failed");
    }

    const authData = await authResponse.json();
    const token = authData.access_token;

    // Step 2: Fetch indices
    const headers = {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    };

    const [imaRes, idaRes, ihfaRes, idkaRes] = await Promise.all([
      fetch("https://api.anbima.com.br/feed/precos-indices/v1/indices/resultados-ima", {
        headers,
      }),
      fetch("https://api.anbima.com.br/feed/precos-indices/v1/indices/resultados-ida-fechado", {
        headers,
      }),
      fetch("https://api.anbima.com.br/feed/precos-indices/v1/indices/resultados-ihfa-fechado", {
        headers,
      }),
      fetch("https://api.anbima.com.br/feed/precos-indices/v1/indices/resultados-idka", {
        headers,
      }),
    ]);

    const ima = (await imaRes.json()).catch(() => ({}));
    const ida = (await idaRes.json()).catch(() => ({}));
    const ihfa = (await ihfaRes.json()).catch(() => ({}));
    const idka = (await idkaRes.json()).catch(() => ({}));

    cache.anbima = { ima, ida, ihfa, idka, fetchedAt: Date.now() };
    return cache.anbima;
  } catch (e) {
    console.error("ANBIMA fetch error:", e);
    return {
      ima: {},
      ida: {},
      ihfa: {},
      idka: {},
      fetchedAt: Date.now(),
    };
  }
}

/**
 * Orquestra todas as chamadas e retorna dados consolidados
 */
export async function getMarketDataSnapshot(
  anbima?: { clientId: string; clientSecret: string }
): Promise<{
  selic: { value: number; date: string };
  cdi: { value: number; date: string };
  ipca: { value: number; date: string };
  ibov: { value: number; change: number };
  usdBrl: { value: number; date: string };
  anbima?: any;
  snapshot_timestamp: string;
}> {
  const [selic, cdi, ipca, ibov, usdBrl] = await Promise.all([
    fetchSelic(),
    fetchCDI(),
    fetchIPCA(),
    fetchIBOV(),
    fetchUSDtoRBL(),
  ]);

  let anbima = null;
  if (anbima?.clientId && anbima?.clientSecret) {
    anbima = await fetchANBIMAIndices(anbima.clientId, anbima.clientSecret);
  }

  return {
    selic,
    cdi,
    ipca,
    ibov,
    usdBrl,
    anbima,
    snapshot_timestamp: new Date().toISOString(),
  };
}

/**
 * Formata dados para contexto legível pela IA
 */
export function formatMarketDataForAI(data: Awaited<ReturnType<typeof getMarketDataSnapshot>>): string {
  return `
## DADOS DE MERCADO (${data.snapshot_timestamp})

**Taxas Básicas (BCB):**
- Selic: ${data.selic.value}% a.a. (data: ${data.selic.date})
- CDI: ${data.cdi.value}% a.a. (data: ${data.cdi.date})
- IPCA: ${data.ipca.value}% (data: ${data.ipca.date})

**Câmbio:**
- USD/BRL: R$ ${data.usdBrl.value.toFixed(4)} (PTAX venda, data: ${data.usdBrl.date})

**Índices Bolsa:**
- IBOV: ${data.ibov.value.toFixed(0)} pts (variação: ${data.ibov.change > 0 ? "+" : ""}${data.ibov.change.toFixed(2)}%)

${
  data.anbima
    ? `
**Índices ANBIMA:**
- IMA: ${JSON.stringify(data.anbima.ima).substring(0, 200)}...
- IDA: ${JSON.stringify(data.anbima.ida).substring(0, 200)}...
- IHFA: ${JSON.stringify(data.anbima.ihfa).substring(0, 200)}...
- IDkA: ${JSON.stringify(data.anbima.idka).substring(0, 200)}...
`
    : ""
}
`;
}

export { MarketDataCache };
