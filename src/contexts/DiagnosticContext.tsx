import React, { createContext, useContext, useState, ReactNode } from "react";
import type { GapReport } from "@/types/gap-report";

export interface QuestionnaireData {
  // Identificação
  nomeCompleto: string;
  idade: string;
  profissao: string;

  // Fluxo de Caixa
  rendaBruta: string;
  naturezaRenda: string;
  despesasFixas: string;
  despesasVariaveis?: string;

  // Patrimônio
  liquidezImediata: string;
  patrimonioFinanceiro: string;
  patrimonioImobiliario: string;
  patrimonioOutros?: string;

  // Dívidas
  dividas: string;
  custoDivida: string;

  // Suitability
  objetivo: string;
  horizonte: string;
  reacaoQuedas: string;
  perdaMaxima: string;
  perfilAnbima: string;

  // Comportamento
  dormiPerdeOSono?: string;
  restricoes?: string;
  estadoCivil?: string;
  dependentes?: string;

  // Proteção
  seguroVida?: string;
  planejamentoSucessorio?: string;

  // Modelo Fiscal
  modeloIR?: string;
}

export interface DiagnosticState {
  questionnaire: Partial<QuestionnaireData>;
  uploadedFiles: File[];
  personalNarrative: string;
  audioBlob: Blob | null;
  currentStep: number;
  consentGiven: boolean;
  diagnosisResult: GapReport | null;
  diagnosisError: string | null;
  isLoading: boolean;
}

interface DiagnosticContextType {
  state: DiagnosticState;
  updateQuestionnaire: (data: Partial<QuestionnaireData>) => void;
  setUploadedFiles: (files: File[]) => void;
  setPersonalNarrative: (text: string) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setCurrentStep: (step: number) => void;
  setConsentGiven: (v: boolean) => void;
  setDiagnosisResult: (result: GapReport | null) => void;
  setDiagnosisError: (error: string | null) => void;
  setIsLoading: (loading: boolean) => void;
}

const DiagnosticContext = createContext<DiagnosticContextType | null>(null);

export const useDiagnostic = () => {
  const ctx = useContext(DiagnosticContext);
  if (!ctx) throw new Error("useDiagnostic must be used within DiagnosticProvider");
  return ctx;
};

export const DiagnosticProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DiagnosticState>({
    questionnaire: {},
    uploadedFiles: [],
    personalNarrative: "",
    audioBlob: null,
    currentStep: 1,
    consentGiven: false,
    diagnosisResult: null,
    diagnosisError: null,
    isLoading: false,
  });

  const updateQuestionnaire = (data: Partial<QuestionnaireData>) =>
    setState((s) => ({ ...s, questionnaire: { ...s.questionnaire, ...data } }));

  const setUploadedFiles = (files: File[]) => setState((s) => ({ ...s, uploadedFiles: files }));

  const setPersonalNarrative = (text: string) => setState((s) => ({ ...s, personalNarrative: text }));

  const setAudioBlob = (blob: Blob | null) => setState((s) => ({ ...s, audioBlob: blob }));

  const setCurrentStep = (step: number) => setState((s) => ({ ...s, currentStep: step }));

  const setConsentGiven = (v: boolean) => setState((s) => ({ ...s, consentGiven: v }));

  const setDiagnosisResult = (result: GapReport | null) =>
    setState((s) => ({ ...s, diagnosisResult: result }));

  const setDiagnosisError = (error: string | null) =>
    setState((s) => ({ ...s, diagnosisError: error }));

  const setIsLoading = (loading: boolean) => setState((s) => ({ ...s, isLoading: loading }));

  return (
    <DiagnosticContext.Provider
      value={{
        state,
        updateQuestionnaire,
        setUploadedFiles,
        setPersonalNarrative,
        setAudioBlob,
        setCurrentStep,
        setConsentGiven,
        setDiagnosisResult,
        setDiagnosisError,
        setIsLoading,
      }}
    >
      {children}
    </DiagnosticContext.Provider>
  );
};
