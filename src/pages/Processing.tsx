import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { useDiagnostic } from "@/contexts/DiagnosticContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { processarExtratosMultiplos } from "@/services/extractorPDF";

const messages = [
  "Analisando seu perfil financeiro...",
  "Extraindo dados dos seus extratos...",
  "Mapeando gaps e riscos...",
  "Calculando oportunidades...",
  "Gerando seu diagnóstico patrimonial...",
  "Preparando resultado final...",
];

const Processing = () => {
  const navigate = useNavigate();
  const { state, setDiagnosisResult, setDiagnosisError, setIsLoading } = useDiagnostic();
  const [messageIdx, setMessageIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const calledRef = useRef(false);

  useEffect(() => {
    const msgInterval = setInterval(() => {
      setMessageIdx((i) => (i + 1) % messages.length);
    }, 3000);

    const progInterval = setInterval(() => {
      setProgress((p) => (p >= 95 ? 95 : p + 0.5));
    }, 200);

    return () => {
      clearInterval(msgInterval);
      clearInterval(progInterval);
    };
  }, []);

  useEffect(() => {
    if (calledRef.current) return;
    calledRef.current = true;
    setIsLoading(true);

    const runDiagnosis = async () => {
      try {
        // Step 1: Processar extratos OCR se houver arquivos
        let extratosOCRParsed = null;
        if (state.uploadedFiles && state.uploadedFiles.length > 0) {
          try {
            console.log("Processando extratos OCR...");
            extratosOCRParsed = await processarExtratosMultiplos(state.uploadedFiles);
            console.log("Extratos processados:", extratosOCRParsed);
          } catch (e) {
            console.warn("OCR parsing falhou, continuando sem extratos:", e);
            toast.warning("Não foi possível processar os extratos, continuando análise...");
          }
        }

        // Step 2: Transcrever áudio se houver
        let narrative = state.personalNarrative || "";
        if (state.audioBlob && !narrative) {
          try {
            const formData = new FormData();
            formData.append("audio", state.audioBlob, "audio.webm");

            const transcribeResp = await supabase.functions.invoke("transcribe-audio", {
              body: formData,
            });

            if (transcribeResp.error) {
              console.error("Transcription error:", transcribeResp.error);
              toast.warning("Não foi possível transcrever o áudio...");
            } else if (transcribeResp.data?.transcription) {
              narrative = transcribeResp.data.transcription;
            }
          } catch (e) {
            console.error("Transcription failed:", e);
            toast.warning("Falha na transcrição do áudio.");
          }
        }

        // Step 3: Gerar GAP REPORT via Claude
        console.log("Enviando para gerar diagnóstico...");
        const { data, error } = await supabase.functions.invoke("generate-diagnosis", {
          body: {
            questionnaire: state.questionnaire,
            narrative: narrative || null,
            extractsDescription: state.uploadedFiles && state.uploadedFiles.length > 0
              ? `Cliente enviou ${state.uploadedFiles.length} arquivo(s): ${state.uploadedFiles.map((f) => f.name).join(", ")}. Extratos OCR processados com ${extratosOCRParsed?.length || 0} arquivo(s) extraído(s).`
              : null,
            extratosOCRParsed: extratosOCRParsed || null,
          },
        });

        if (error) {
          throw new Error(error.message || "Erro ao gerar diagnóstico");
        }

        if (data?.error) {
          throw new Error(data.error);
        }

        if (data?.diagnosis) {
          setDiagnosisResult(data.diagnosis);
          setProgress(100);
          setTimeout(() => navigate("/resultado"), 500);
        } else {
          throw new Error("Resposta inesperada do servidor");
        }
      } catch (e: any) {
        console.error("Diagnosis failed:", e);
        const errMsg = e.message || "Erro desconhecido";
        setDiagnosisError(errMsg);
        toast.error("Erro ao gerar diagnóstico: " + errMsg);
        setTimeout(() => navigate("/relato"), 3000);
      } finally {
        setIsLoading(false);
      }
    };

    runDiagnosis();
  }, []);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center max-w-md px-6">
        {/* Animated icon */}
        <div className="relative w-24 h-24 mx-auto mb-8">
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
          <div className="absolute inset-2 rounded-full bg-primary/10 animate-pulse" />
          <div className="relative w-24 h-24 rounded-full bg-card border border-primary/30 flex items-center justify-center">
            <Shield className="w-10 h-10 text-primary" />
          </div>
        </div>

        <h2 className="font-display text-xl font-bold text-foreground mb-2">
          Processando seu diagnóstico
        </h2>
        <p className="text-muted-foreground text-sm mb-8 h-5 transition-all">
          {messages[messageIdx]}
        </p>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-secondary rounded-full overflow-hidden mb-4">
          <div
            className="h-full bg-primary rounded-full transition-all duration-200"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-muted-foreground">Análise: ~30-60 segundos</p>
      </div>
    </div>
  );
};

export default Processing;
