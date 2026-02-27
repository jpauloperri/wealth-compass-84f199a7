import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ChevronRight, ChevronLeft } from "lucide-react";
import { useDiagnostic } from "@/contexts/DiagnosticContext";
import { Progress } from "@/components/ui/progress";

type Step = 
  | "identificacao"
  | "fluxoCaixa"
  | "patrimonio"
  | "dividas"
  | "suitability"
  | "comportamento"
  | "familia"
  | "resumo";

const Questionnaire = () => {
  const navigate = useNavigate();
  const { state, updateQuestionnaire } = useDiagnostic();
  const [currentStep, setCurrentStep] = useState<Step>("identificacao");

  const steps: Step[] = [
    "identificacao",
    "fluxoCaixa",
    "patrimonio",
    "dividas",
    "suitability",
    "comportamento",
    "familia",
    "resumo",
  ];

  const stepIndex = steps.indexOf(currentStep);
  const progress = ((stepIndex + 1) / steps.length) * 100;

  const handleNext = () => {
    const nextIdx = stepIndex + 1;
    if (nextIdx < steps.length) {
      setCurrentStep(steps[nextIdx]);
    } else {
      navigate("/upload");
    }
  };

  const handlePrev = () => {
    const prevIdx = stepIndex - 1;
    if (prevIdx >= 0) {
      setCurrentStep(steps[prevIdx]);
    }
  };

  const getStepTitle = (step: Step) => {
    const titles: Record<Step, string> = {
      identificacao: "1. Identificação",
      fluxoCaixa: "2. Fluxo de Caixa",
      patrimonio: "3. Patrimônio Financeiro",
      dividas: "4. Dívidas",
      suitability: "5. Objetivo & Risco",
      comportamento: "6. Comportamento Financeiro",
      familia: "7. Estrutura Familiar",
      resumo: "8. Resumo",
    };
    return titles[step];
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold text-foreground mb-2">
            Diagnóstico Patrimonial
          </h1>
          <p className="text-muted-foreground">
            {getStepTitle(currentStep)}
          </p>
        </div>

        {/* Progress bar */}
        <Progress value={progress} className="mb-8 h-1.5" />

        {/* Seção: Identificação */}
        {currentStep === "identificacao" && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="nome" className="text-foreground font-semibold mb-2 block">
                Nome Completo
              </Label>
              <Input
                id="nome"
                placeholder="Seu nome"
                value={state.questionnaire.nomeCompleto || ""}
                onChange={(e) => updateQuestionnaire({ nomeCompleto: e.target.value })}
                className="bg-secondary border-muted"
              />
            </div>

            <div>
              <Label htmlFor="idade" className="text-foreground font-semibold mb-2 block">
                Idade
              </Label>
              <Input
                id="idade"
                type="number"
                placeholder="Ex: 45"
                value={state.questionnaire.idade || ""}
                onChange={(e) => updateQuestionnaire({ idade: e.target.value })}
                className="bg-secondary border-muted"
              />
            </div>

            <div>
              <Label htmlFor="profissao" className="text-foreground font-semibold mb-2 block">
                Profissão/Ocupação
              </Label>
              <Input
                id="profissao"
                placeholder="Ex: Empresário, Advogado, Médico"
                value={state.questionnaire.profissao || ""}
                onChange={(e) => updateQuestionnaire({ profissao: e.target.value })}
                className="bg-secondary border-muted"
              />
            </div>
          </div>
        )}

        {/* Seção: Fluxo de Caixa */}
        {currentStep === "fluxoCaixa" && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="renda" className="text-foreground font-semibold mb-2 block">
                Renda Mensal Líquida (R$)
              </Label>
              <Input
                id="renda"
                type="number"
                placeholder="Ex: 15000"
                value={state.questionnaire.rendaBruta || ""}
                onChange={(e) => updateQuestionnaire({ rendaBruta: e.target.value })}
                className="bg-secondary border-muted"
              />
            </div>

            <div>
              <Label className="text-foreground font-semibold mb-3 block">Natureza da Renda</Label>
              <RadioGroup value={state.questionnaire.naturezaRenda || ""} onValueChange={(v) => updateQuestionnaire({ naturezaRenda: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Fixa" id="fixa" />
                  <Label htmlFor="fixa" className="cursor-pointer">Fixa (CLT, servidor público)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Variável" id="variavel" />
                  <Label htmlFor="variavel" className="cursor-pointer">Variável (empresário, comissão)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Híbrida" id="hibrida" />
                  <Label htmlFor="hibrida" className="cursor-pointer">Híbrida (salário + variável)</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="despesas" className="text-foreground font-semibold mb-2 block">
                Despesas Fixas Mensais (R$)
              </Label>
              <Input
                id="despesas"
                type="number"
                placeholder="Ex: 10000"
                value={state.questionnaire.despesasFixas || ""}
                onChange={(e) => updateQuestionnaire({ despesasFixas: e.target.value })}
                className="bg-secondary border-muted"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Moradia, educação, saúde, alimentação
              </p>
            </div>
          </div>
        )}

        {/* Seção: Patrimônio Financeiro */}
        {currentStep === "patrimonio" && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="reserva" className="text-foreground font-semibold mb-2 block">
                Reserva Imediata (Poupança, Conta, Tesouro Selic) - R$
              </Label>
              <Input
                id="reserva"
                type="number"
                placeholder="Ex: 50000"
                value={state.questionnaire.liquidezImediata || ""}
                onChange={(e) => updateQuestionnaire({ liquidezImediata: e.target.value })}
                className="bg-secondary border-muted"
              />
            </div>

            <div>
              <Label htmlFor="rendaFixa" className="text-foreground font-semibold mb-2 block">
                Renda Fixa (CDB, Tesouro, LCI, Previdência) - R$
              </Label>
              <Input
                id="rendaFixa"
                type="number"
                placeholder="Ex: 500000"
                value={state.questionnaire.patrimonioFinanceiro || ""}
                onChange={(e) => updateQuestionnaire({ patrimonioFinanceiro: e.target.value })}
                className="bg-secondary border-muted"
              />
            </div>

            <div>
              <Label htmlFor="rendaVar" className="text-foreground font-semibold mb-2 block">
                Renda Variável (Ações, FIIs, Fundos) - R$
              </Label>
              <Input
                id="rendaVar"
                type="number"
                placeholder="Ex: 300000"
                value={state.questionnaire.patrimonioImobiliario || ""}
                onChange={(e) => updateQuestionnaire({ patrimonioImobiliario: e.target.value })}
                className="bg-secondary border-muted"
              />
            </div>
          </div>
        )}

        {/* Seção: Dívidas */}
        {currentStep === "dividas" && (
          <div className="space-y-6">
            <div>
              <Label className="text-foreground font-semibold mb-3 block">Tem dívidas?</Label>
              <RadioGroup value={state.questionnaire.dividas || "Não"} onValueChange={(v) => updateQuestionnaire({ dividas: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Não" id="nao-divida" />
                  <Label htmlFor="nao-divida" className="cursor-pointer">Não tenho dívidas</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sim" id="sim-divida" />
                  <Label htmlFor="sim-divida" className="cursor-pointer">Sim, tenho dívidas</Label>
                </div>
              </RadioGroup>
            </div>

            {state.questionnaire.dividas === "Sim" && (
              <>
                <div>
                  <Label htmlFor="saldoDivida" className="text-foreground font-semibold mb-2 block">
                    Saldo Total de Dívidas - R$
                  </Label>
                  <Input
                    id="saldoDivida"
                    type="number"
                    placeholder="Ex: 150000"
                    value={state.questionnaire.custoDivida || ""}
                    onChange={(e) => updateQuestionnaire({ custoDivida: e.target.value })}
                    className="bg-secondary border-muted"
                  />
                </div>
              </>
            )}
          </div>
        )}

        {/* Seção: Suitability */}
        {currentStep === "suitability" && (
          <div className="space-y-6">
            <div>
              <Label className="text-foreground font-semibold mb-3 block">
                Objetivo do Investimento
              </Label>
              <RadioGroup value={state.questionnaire.objetivo || ""} onValueChange={(v) => updateQuestionnaire({ objetivo: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Aposentadoria" id="aposent" />
                  <Label htmlFor="aposent" className="cursor-pointer">Aposentadoria (10+ anos)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Liberdade Financeira" id="liberdade" />
                  <Label htmlFor="liberdade" className="cursor-pointer">Liberdade/Renda Passiva (10+ anos)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Reserva Emergência" id="reserva-obj" />
                  <Label htmlFor="reserva-obj" className="cursor-pointer">Reserva para Imprevistos (1-2 anos)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Meta Específica" id="meta" />
                  <Label htmlFor="meta" className="cursor-pointer">Meta Específica (compra imóvel, viagem, etc)</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="horizonte" className="text-foreground font-semibold mb-2 block">
                Quando vai precisar desse dinheiro? (Anos)
              </Label>
              <Input
                id="horizonte"
                type="number"
                placeholder="Ex: 15"
                value={state.questionnaire.horizonte || ""}
                onChange={(e) => updateQuestionnaire({ horizonte: e.target.value })}
                className="bg-secondary border-muted"
              />
            </div>

            <div>
              <Label className="text-foreground font-semibold mb-3 block">
                Se sua carteira cair 20%, você:
              </Label>
              <RadioGroup value={state.questionnaire.reacaoQuedas || ""} onValueChange={(v) => updateQuestionnaire({ reacaoQuedas: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Vende" id="vende" />
                  <Label htmlFor="vende" className="cursor-pointer">Vende e coloca em poupança (Conservador)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Mantém" id="mantem" />
                  <Label htmlFor="mantem" className="cursor-pointer">Fica nervoso, mas mantém (Moderado)</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Compra Mais" id="compra" />
                  <Label htmlFor="compra" className="cursor-pointer">Vê como oportunidade e compra mais (Arrojado)</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Seção: Comportamento */}
        {currentStep === "comportamento" && (
          <div className="space-y-6">
            <div>
              <Label htmlFor="dormi" className="text-foreground font-semibold mb-2 block">
                O que faz você PERDER O SONO financeiramente?
              </Label>
              <Textarea
                id="dormi"
                placeholder="Ex: Perder dinheiro em investimento errado, falta de proteção familiar..."
                value={state.questionnaire.dormiPerdeOSono || ""}
                onChange={(e) => updateQuestionnaire({ dormiPerdeOSono: e.target.value })}
                className="bg-secondary border-muted min-h-24"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Deixe em branco se preferir pular
              </p>
            </div>

            <div>
              <Label htmlFor="restricoes" className="text-foreground font-semibold mb-2 block">
                Existe algo que você NÃO investiria NUNCA?
              </Label>
              <Input
                id="restricoes"
                placeholder="Ex: Cripto, ações, fundos imobiliários, exterior"
                value={state.questionnaire.restricoes || ""}
                onChange={(e) => updateQuestionnaire({ restricoes: e.target.value })}
                className="bg-secondary border-muted"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Deixe em branco se aberto a tudo
              </p>
            </div>
          </div>
        )}

        {/* Seção: Estrutura Familiar */}
        {currentStep === "familia" && (
          <div className="space-y-6">
            <div>
              <Label className="text-foreground font-semibold mb-3 block">Estado Civil</Label>
              <RadioGroup value={state.questionnaire.estadoCivil || ""} onValueChange={(v) => updateQuestionnaire({ estadoCivil: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Solteiro" id="solt" />
                  <Label htmlFor="solt" className="cursor-pointer">Solteiro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Casado" id="cas" />
                  <Label htmlFor="cas" className="cursor-pointer">Casado/Companheiro</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Divorciado" id="div" />
                  <Label htmlFor="div" className="cursor-pointer">Divorciado</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label htmlFor="dependentes" className="text-foreground font-semibold mb-2 block">
                Dependentes Financeiros
              </Label>
              <Input
                id="dependentes"
                type="number"
                placeholder="Ex: 2"
                value={state.questionnaire.dependentes || ""}
                onChange={(e) => updateQuestionnaire({ dependentes: e.target.value })}
                className="bg-secondary border-muted"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Número de filhos/dependentes
              </p>
            </div>

            <div>
              <Label className="text-foreground font-semibold mb-3 block">
                Tem Seguro de Vida?
              </Label>
              <RadioGroup value={state.questionnaire.seguroVida || ""} onValueChange={(v) => updateQuestionnaire({ seguroVida: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sim" id="seg-sim" />
                  <Label htmlFor="seg-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Não" id="seg-nao" />
                  <Label htmlFor="seg-nao" className="cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <Label className="text-foreground font-semibold mb-3 block">
                Tem Testamento/Estrutura Sucessória?
              </Label>
              <RadioGroup value={state.questionnaire.planejamentoSucessorio || ""} onValueChange={(v) => updateQuestionnaire({ planejamentoSucessorio: v })}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Sim" id="test-sim" />
                  <Label htmlFor="test-sim" className="cursor-pointer">Sim</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="Não" id="test-nao" />
                  <Label htmlFor="test-nao" className="cursor-pointer">Não</Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        )}

        {/* Seção: Resumo */}
        {currentStep === "resumo" && (
          <div className="space-y-4">
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-6">
              <h3 className="font-semibold text-foreground mb-4">✓ Seu Perfil</h3>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p><strong className="text-foreground">{state.questionnaire.nomeCompleto || "---"}</strong>, {state.questionnaire.idade || "---"} anos</p>
                <p>Renda: <strong className="text-foreground">R$ {Number(state.questionnaire.rendaBruta || 0).toLocaleString("pt-BR")}</strong></p>
                <p>Objetivo: <strong className="text-foreground">{state.questionnaire.objetivo || "---"}</strong></p>
                <p>Horizonte: <strong className="text-foreground">{state.questionnaire.horizonte || "---"} anos</strong></p>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              ✓ Pronto! Agora envie seus extratos (opcional) para análise mais precisa.
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex gap-4 mt-10">
          <Button
            variant="outline"
            onClick={handlePrev}
            disabled={stepIndex === 0}
            className="flex-1"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Anterior
          </Button>

          <Button
            onClick={handleNext}
            className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            {stepIndex === steps.length - 1 ? "Enviar Extratos" : "Próximo"}
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Questionnaire;
