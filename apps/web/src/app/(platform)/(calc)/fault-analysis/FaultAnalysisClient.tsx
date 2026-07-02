'use client';
import { useState } from 'react';
import { api, type FaultAnalysisResult, type SplitFactorMethod } from '@/lib/api';
import {
  Field, SectionLabel, StatCard, CompBanner, ExpertItem,
  FundBtn, calcLayout, inputStyle, panelStyle, Th, TdMono,
} from '@/components/ui/CalcShared';
import { useFaultAnalysis, type FaultAnalysisMaster } from '@/context/FaultAnalysisContext';
import { useToast } from '@/context/ToastContext';

const DEFAULTS = { If: 12000, tFalla: 0.5, xr: 15, freq: 50 };

const CONFIDENCE_LABEL: Record<FaultAnalysisResult['confidence'], string> = {
  alta: 'Alta — validada por estudio específico',
  media: 'Media — estimación propia de ingeniería',
  conservadora: 'Conservadora — sin optimización de costo',
};

export function FaultAnalysisClient() {
  const toast = useToast();
  const faultAnalysis = useFaultAnalysis();
  const [form, setForm] = useState(DEFAULTS);
  const [method, setMethod] = useState<SplitFactorMethod>('conservative');
  const [manualSf, setManualSf] = useState(0.6);
  const [nPaths, setNPaths] = useState(2);
  const [result, setResult] = useState<FaultAnalysisResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWhy, setShowWhy] = useState(false);
  const [showFund, setShowFund] = useState(false);

  function set<K extends keyof typeof DEFAULTS>(k: K, v: number) { setForm(f => ({ ...f, [k]: v })); }
  function num(k: keyof typeof DEFAULTS) { return (e: React.ChangeEvent<HTMLInputElement>) => set(k, Number(e.target.value)); }

  async function calculate() {
    setLoading(true); setError(null);
    try {
      const splitFactor = method === 'manual' ? { method, manualValue: manualSf }
        : method === 'estimated' ? { method, nParallelPaths: nPaths }
        : { method };
      const r = await api.faultAnalysis.compute({ If: form.If, tFalla: form.tFalla, xr: form.xr, freq: form.freq, splitFactor });
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }

  function saveAsOfficial() {
    if (!result) return;
    const master: FaultAnalysisMaster = {
      If: form.If, tFalla: form.tFalla, xr: form.xr, freq: form.freq,
      splitMethod: method,
      ...(method === 'manual' ? { splitManualValue: manualSf } : {}),
      ...(method === 'estimated' ? { splitNPaths: nPaths } : {}),
      Df: result.Df, Ta: result.Ta, Sf: result.Sf, Ig: result.Ig,
      splitJustificacion: result.splitJustificacion, confidence: result.confidence,
      updatedAt: new Date().toISOString(),
    };
    faultAnalysis.setResult(master);
    toast.success(`Corriente de diseño oficial guardada: Ig = ${result.Ig.toFixed(0)} A`);
  }

  const active = faultAnalysis.result;

  return (
    <div style={calcLayout}>
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Motor de Análisis de Falla</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 14, lineHeight: 1.5 }}>
          Primer cálculo de ingeniería del proyecto — determina y justifica la corriente de diseño (Ig) que alimentará automáticamente todos los módulos posteriores.
        </p>

        {active && (
          <div style={{
            background: 'var(--safe-soft)', border: '1px solid var(--safe)', borderRadius: 4,
            padding: '9px 11px', marginBottom: 14, fontSize: 10, color: 'var(--safe)', lineHeight: 1.6,
          }}>
            ✓ Corriente de diseño oficial activa: <strong>Ig = {active.Ig.toFixed(0)} A</strong>. Todos los módulos de diseño la usan automáticamente.
          </div>
        )}

        <SectionLabel>Corriente de falla</SectionLabel>
        <Field label="If — corriente de falla simétrica" unit="A">
          <input style={inputStyle} type="number" value={form.If} onChange={num('If')} />
        </Field>
        <p style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: -6, marginBottom: 10, lineHeight: 1.5 }}>
          Obtenida del estudio de cortocircuito del sistema eléctrico (nivel de falla en la barra/subestación en estudio).
        </p>
        <Field label="Tiempo de despeje tf" unit="s">
          <input style={inputStyle} type="number" step="0.05" value={form.tFalla} onChange={num('tFalla')} />
        </Field>
        <Field label="Relación X/R en el punto de falla" unit="">
          <input style={inputStyle} type="number" step="0.5" value={form.xr} onChange={num('xr')} />
        </Field>
        <Field label="Frecuencia del sistema" unit="Hz">
          <div style={{ display: 'flex', gap: 8 }}>
            {[50, 60].map(f => (
              <button key={f} onClick={() => set('freq', f)} style={{
                flex: 1, padding: '6px', borderRadius: 3, cursor: 'pointer',
                background: form.freq === f ? 'var(--copper-soft)' : 'var(--bg)',
                border: `1px solid ${form.freq === f ? 'var(--copper)' : 'var(--line)'}`,
                color: form.freq === f ? 'var(--copper)' : 'var(--dim)', fontSize: 11, fontWeight: 700,
              }}>{f} Hz</button>
            ))}
          </div>
        </Field>

        <SectionLabel purple>Factor de división de corriente (Sf)</SectionLabel>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 10 }}>
          {([
            { id: 'conservative', label: 'Conservador (Sf = 1)', desc: 'Sin datos de trayectorias alternativas' },
            { id: 'estimated', label: 'Estimado', desc: 'Nº de trayectorias de retorno paralelas conocidas' },
            { id: 'manual', label: 'Manual', desc: 'Sf validado por estudio de distribución específico' },
          ] as const).map(m => (
            <button key={m.id} onClick={() => setMethod(m.id)} style={{
              textAlign: 'left', padding: '8px 10px', borderRadius: 3, cursor: 'pointer',
              background: method === m.id ? 'var(--copper-soft)' : 'var(--bg)',
              border: `1px solid ${method === m.id ? 'var(--copper)' : 'var(--line)'}`,
            }}>
              <div style={{ fontSize: 10.5, fontWeight: 700, color: method === m.id ? 'var(--copper)' : 'var(--dim)' }}>{m.label}</div>
              <div style={{ fontSize: 8.5, color: 'var(--faint)', marginTop: 1 }}>{m.desc}</div>
            </button>
          ))}
        </div>
        {method === 'manual' && (
          <Field label="Sf (0–1)" unit="">
            <input style={inputStyle} type="number" step="0.01" min="0" max="1" value={manualSf} onChange={e => setManualSf(Number(e.target.value))} />
          </Field>
        )}
        {method === 'estimated' && (
          <Field label="Nº de trayectorias de retorno paralelas" unit="">
            <input style={inputStyle} type="number" step="1" min="1" value={nPaths} onChange={e => setNPaths(Number(e.target.value))} />
          </Field>
        )}

        <button onClick={calculate} disabled={loading} style={{
          width: '100%', background: 'var(--copper)', border: 'none', color: '#fff',
          fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 3, cursor: 'pointer',
          opacity: loading ? 0.6 : 1, marginTop: 4,
        }}>{loading ? 'Calculando…' : 'Calcular corriente de diseño'}</button>
        {error && <div style={{ marginTop: 10, padding: '8px 10px', background: 'var(--danger-soft)', border: '1px solid var(--danger)', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>{error}</div>}
      </aside>

      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>⚡</div>
            <div style={{ color: 'var(--faint)', fontSize: 11, textAlign: 'center', maxWidth: 320 }}>
              Ingresa los datos del estudio de cortocircuito y presiona Calcular para determinar la corriente de diseño oficial del proyecto.
            </div>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="If — corriente de falla" value={result.If.toFixed(0)} unit="A" />
              <StatCard label="Df — decremento" value={result.Df.toFixed(4)} unit="" />
              <StatCard label="Sf — división" value={result.Sf.toFixed(3)} unit="" />
              <StatCard label="Ig — corriente de diseño" value={result.Ig.toFixed(0)} unit="A" primary />
            </div>

            <CompBanner
              pass={true}
              norm={result.norm}
              msg={`Ig = If × Sf × Df = ${result.If.toFixed(0)} × ${result.Sf.toFixed(3)} × ${result.Df.toFixed(4)} = ${result.Ig.toFixed(0)} A`}
            />

            <div style={{
              display: 'flex', alignItems: 'center', gap: 8, background: 'var(--panel3)', border: '1px solid var(--line)',
              borderRadius: 4, padding: '8px 12px', marginBottom: 16, fontSize: 10, color: 'var(--dim)',
            }}>
              <span style={{ fontWeight: 700, color: 'var(--copper)' }}>Confiabilidad:</span>
              <span>{CONFIDENCE_LABEL[result.confidence]}</span>
            </div>

            <button onClick={saveAsOfficial} style={{
              width: '100%', background: 'var(--safe)', border: 'none', color: '#fff', fontWeight: 700,
              fontSize: 12, padding: 12, borderRadius: 4, cursor: 'pointer', marginBottom: 16,
            }}>
              ✓ Guardar como corriente de diseño oficial del proyecto
            </button>

            <SectionLabel purple>Sistema Experto</SectionLabel>
            <ExpertItem type="info">{result.splitJustificacion}</ExpertItem>
            <ExpertItem type="info">
              Ta = (X/R)/(2πf) = {result.Ta.toFixed(4)} s — constante de tiempo del sistema en el punto de falla; determina cuánto tarda en decaer la componente asimétrica (DC) de la corriente.
            </ExpertItem>
            {result.Df > 1.5 && (
              <ExpertItem type="warn">
                Df = {result.Df.toFixed(3)} es alto — el tiempo de despeje (tf = {form.tFalla} s) es corto en relación a la constante de tiempo del sistema (Ta = {result.Ta.toFixed(3)} s), por lo que la componente asimétrica no alcanza a decaer y penaliza fuertemente la corriente de diseño. Verificar la coordinación de protecciones si este valor parece inusualmente alto.
              </ExpertItem>
            )}

            <div style={panelStyle}>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 10 }}>Desglose de cálculo</div>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['If (corriente de falla)', `${form.If.toFixed(0)} A`],
                    ['tf (tiempo de despeje)', `${form.tFalla} s`],
                    ['X/R', `${form.xr}`],
                    ['Frecuencia', `${form.freq} Hz`],
                    ['Ta (constante de tiempo)', `${result.Ta.toFixed(4)} s`],
                    ['Df (factor de decremento)', `${result.Df.toFixed(4)}`],
                    ['Método de división', method === 'manual' ? 'Manual' : method === 'estimated' ? 'Estimado' : 'Conservador'],
                    ['Sf (factor de división)', `${result.Sf.toFixed(3)}`],
                    ['Ig (corriente de diseño)', `${result.Ig.toFixed(0)} A`],
                  ].map(([k, v]) => (
                    <tr key={k as string}>
                      <td style={{ padding: '5px 8px', borderBottom: '1px solid var(--line)', fontSize: 10, color: 'var(--dim)' }}>{k}</td>
                      <TdMono highlight>{v}</TdMono>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button onClick={() => setShowWhy(s => !s)} style={{
              display: 'flex', alignItems: 'center', gap: 6, width: '100%',
              background: 'var(--panel)', border: '1px solid var(--blue)', color: 'var(--blue)',
              fontFamily: 'var(--font-mono)', fontSize: 10, padding: '9px 12px', borderRadius: 3, cursor: 'pointer', marginBottom: 12,
            }}>
              ❓ ¿Por qué la corriente disipada no es igual a la corriente de falla?
              <span style={{ marginLeft: 'auto' }}>{showWhy ? '▴' : '▾'}</span>
            </button>
            {showWhy && (
              <div style={{ background: 'var(--panel)', border: '1px solid var(--line)', borderRadius: 4, padding: '14px 16px', fontSize: 10.5, color: 'var(--dim)', lineHeight: 1.8, marginBottom: 16 }}>
                <p style={{ marginBottom: 10 }}>
                  La corriente de falla total (If) calculada en el estudio de cortocircuito <strong style={{ color: 'var(--text)' }}>no circula íntegramente por la malla de tierra en estudio</strong>. Parte de esa corriente retorna a la fuente por caminos alternativos, de menor impedancia que el suelo:
                </p>
                <ul style={{ margin: '0 0 10px 18px', padding: 0 }}>
                  <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text)' }}>Retorno por neutros:</strong> en sistemas con neutro conectado a tierra en múltiples puntos, una fracción importante de la corriente de falla retorna por el conductor neutro en vez de por el suelo.</li>
                  <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text)' }}>Cables de guarda (shield wires):</strong> en líneas de transmisión, los cables de guarda aterrizados en cada torre ofrecen una trayectoria de baja impedancia en paralelo con la malla, captando una fracción significativa de la corriente.</li>
                  <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text)' }}>Pantallas de cables (cable shields):</strong> en alimentadores subterráneos, la pantalla metálica del cable aterrizada en ambos extremos actúa como trayectoria de retorno paralela.</li>
                  <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text)' }}>Estructuras metálicas:</strong> tuberías, rieles, estructuras de edificios u otros elementos conductores enterrados o interconectados pueden derivar parte de la corriente.</li>
                  <li style={{ marginBottom: 6 }}><strong style={{ color: 'var(--text)' }}>Sistemas de tierra vecinos:</strong> mallas de subestaciones o instalaciones cercanas, interconectadas eléctricamente, comparten la corriente de falla.</li>
                </ul>
                <p style={{ marginBottom: 10 }}>
                  El <strong style={{ color: 'var(--text)' }}>factor de división (Sf)</strong> cuantifica qué fracción de If efectivamente retorna por el suelo a través de la malla en estudio — es la corriente que realmente produce elevación de potencial (GPR) y tensiones de paso/contacto peligrosas, y por tanto la que debe usarse para dimensionar el sistema de puesta a tierra.
                </p>
                <p style={{ marginBottom: 0 }}>
                  <strong style={{ color: 'var(--text)' }}>Fundamento según IEEE 80:</strong> IEEE Std 80-2013, Cláusula 15.9 (determinación de la corriente máxima de malla, "maximum grid current") y su Annex C (métodos de estimación del factor de división) establecen que usar If directamente sin corregir por Sf sobredimensiona innecesariamente el sistema, mientras que ignorar el factor de decremento Df (Cl. 15.10, Ec. 79) subestima la severidad real durante el período transitorio de la falla.
                </p>
              </div>
            )}

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Corriente de diseño — Ig = If · Sf · Df">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                Df = √(1 + (Ta/tf)·(1 − e^(−2tf/Ta))) · Ta = (X/R)/(2πf)
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Variables:</strong> If = corriente de falla simétrica (A), Sf = factor de división de corriente, Df = factor de decremento, tf = tiempo de despeje (s), X/R = relación reactancia/resistencia en el punto de falla, f = frecuencia del sistema (Hz).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Regla fundamental:</strong> GroundDesing Pro no inicia el diseño de la malla sin una corriente de diseño oficial validada por este motor — todos los módulos posteriores (malla, GPR, tensiones, conductor, optimización, sistema experto, memoria y exportaciones) usan Ig automáticamente.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>IEEE Std 80-2013, Cláusula 15.9–15.10, Ecuación 79 · IEEE Std 80-2013 Annex C (factor de división)</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
