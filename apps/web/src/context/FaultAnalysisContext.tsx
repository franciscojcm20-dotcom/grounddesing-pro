'use client';
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';

export type SplitFactorMethod = 'manual' | 'conservative' | 'estimated';

export interface FaultAnalysisMaster {
  If:      number;   // A — corriente de falla simétrica (estudio de cortocircuito)
  tFalla:  number;   // s
  xr:      number;   // X/R
  freq:    number;   // Hz
  splitMethod:       SplitFactorMethod;
  splitManualValue?: number;
  splitNPaths?:      number;
  Df: number;
  Ta: number;
  Sf: number;
  Ig: number;        // corriente de diseño oficial del proyecto
  splitJustificacion: string;
  confidence: 'alta' | 'media' | 'conservadora';
  updatedAt: string;
}

interface FaultAnalysisCtx {
  /** Corriente de diseño oficial del proyecto — parámetro maestro que alimenta todos los cálculos posteriores. */
  result: FaultAnalysisMaster | null;
  setResult: (r: FaultAnalysisMaster) => void;
  clear: () => void;
}

const STORAGE_KEY = 'gdp-fault-analysis';

const Ctx = createContext<FaultAnalysisCtx>({
  result: null,
  setResult: () => {},
  clear: () => {},
});

export function FaultAnalysisProvider({ children }: { children: ReactNode }) {
  const [result, setResultState] = useState<FaultAnalysisMaster | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setResultState(JSON.parse(saved) as FaultAnalysisMaster); } catch { /* ignore corrupt cache */ }
    }
  }, []);

  const setResult = useCallback((r: FaultAnalysisMaster) => {
    setResultState(r);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(r));
  }, []);

  const clear = useCallback(() => {
    setResultState(null);
    localStorage.removeItem(STORAGE_KEY);
  }, []);

  return <Ctx.Provider value={{ result, setResult, clear }}>{children}</Ctx.Provider>;
}

export function useFaultAnalysis() {
  return useContext(Ctx);
}
