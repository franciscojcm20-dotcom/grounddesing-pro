'use client';
import { useState } from 'react';
import {
  SectionLabel, StatCard, CompBanner, ExpertItem, FundBtn,
  calcLayout, inputStyle, Field,
} from '@/components/ui/CalcShared';
import { ExportBar } from '@/components/ui/ExportBar';

const BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

interface GprResult {
  GPR:        number;
  Ib:         number;
  Ib50:       number;
  Ib70:       number;
  Etouch:     number;
  Estep:      number;
  EtouchMax:  number;
  compliance: {
    gprUnder5kV: { pass: boolean; limit: string; norm: string };
    touchSafe:   { pass: boolean; limit: string; norm: string };
  };
  norm: string;
}

export function GprClient() {
  const [Ig,    setIg]    = useState('10000');
  const [Rg,    setRg]    = useState('0.8');
  const [Sf,    setSf]    = useState('0.6');
  const [ts,    setTs]    = useState('0.5');
  const [bodyW, setBodyW] = useState<50 | 70>(70);
  const [Cs,    setCs]    = useState('0.75');
  const [rhoS,  setRhoS]  = useState('3000');

  const [result,   setResult]   = useState<GprResult | null>(null);
  const [error,    setError]    = useState<string | null>(null);
  const [loading,  setLoading]  = useState(false);
  const [showFund, setShowFund] = useState(false);

  async function calculate() {
    setLoading(true); setError(null);
    try {
      const res = await fetch(`${BASE}/api/v1/gpr`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          Ig: Number(Ig), Rg: Number(Rg), Zf: Number(Rg),
          Sf: Number(Sf), ts: Number(ts), bodyW,
          Cs: Number(Cs), rhoS: Number(rhoS),
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error ?? 'Error'); }
      setResult(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error de conexión');
    } finally { setLoading(false); }
  }

  const allPass = result
    ? Object.values(result.compliance).every(c => c.pass)
    : false;

  return (
    <div style={calcLayout}>
      <aside style={{ borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--panel)', padding: '18px 16px 40px' }}>
        <h2 style={{ fontSize: 14, fontWeight: 700, marginBottom: 4 }}>Potencial de tierra — GPR</h2>
        <p style={{ fontSize: 10, color: 'var(--faint)', marginBottom: 18, lineHeight: 1.5 }}>
          IEEE Std 80-2013 · Cl. 15-16 · Ground Potential Rise
        </p>

        <SectionLabel>Sistema de falla</SectionLabel>
        <Field label="Corriente de falla Ig" unit="A">
          <input style={inputStyle} type="number" value={Ig} onChange={e => setIg(e.target.value)} />
        </Field>
        <Field label="Resistencia de malla Rg" unit="Ω">
          <input style={inputStyle} type="number" value={Rg} onChange={e => setRg(e.target.value)} step="0.01" />
        </Field>
        <Field label="Factor de división Sf" unit="(0–1)">
          <input style={inputStyle} type="number" value={Sf} onChange={e => setSf(e.target.value)} step="0.01" min="0" max="1" />
        </Field>
        <Field label="Duración de falla ts" unit="s">
          <input style={inputStyle} type="number" value={ts} onChange={e => setTs(e.target.value)} step="0.01" />
        </Field>

        <SectionLabel>Capa superficial</SectionLabel>
        <Field label="Factor de reducción Cs" unit="">
          <input style={inputStyle} type="number" value={Cs} onChange={e => setCs(e.target.value)} step="0.01" min="0" max="1" />
        </Field>
        <Field label="Resistividad ρs" unit="Ω·m">
          <input style={inputStyle} type="number" value={rhoS} onChange={e => setRhoS(e.target.value)} />
        </Field>

        <SectionLabel>Criterio de seguridad</SectionLabel>
        <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
          {([50, 70] as const).map(w => (
            <button key={w} type="button" onClick={() => setBodyW(w)} style={{
              flex: 1, padding: '7px 0', background: bodyW === w ? 'var(--copper-soft)' : 'var(--bg)',
              border: `1px solid ${bodyW === w ? 'var(--copper)' : 'var(--line)'}`,
              borderRadius: 3, cursor: 'pointer', fontSize: 10, fontWeight: 700,
              color: bodyW === w ? 'var(--copper)' : 'var(--dim)',
            }}>{w} kg</button>
          ))}
        </div>

        <button onClick={calculate} disabled={loading} style={{
          width: '100%', background: 'var(--copper)', border: 'none', color: '#fff',
          fontWeight: 700, fontSize: 11, padding: 10, borderRadius: 3,
          cursor: 'pointer', opacity: loading ? 0.6 : 1,
        }}>
          {loading ? 'Calculando…' : 'Calcular GPR'}
        </button>
        {error && (
          <div style={{ marginTop: 12, padding: '8px 10px', background: '#1a0d0d', border: '1px solid #ef444444', borderRadius: 3, fontSize: 10, color: 'var(--danger)' }}>
            {error}
          </div>
        )}
      </aside>

      <section style={{ overflowY: 'auto', padding: '18px 24px 40px', background: 'var(--bg)' }}>
        {!result ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12 }}>
            <div style={{ fontSize: 32 }}>⚡</div>
            <div style={{ color: 'var(--faint)', fontSize: 11 }}>Ingresa los parámetros y presiona Calcular</div>
          </div>
        ) : (
          <>
            <CompBanner pass={allPass} norm={result.norm} />

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label="GPR" value={(result.GPR / 1000).toFixed(2)} unit="kV" primary />
              <StatCard label="Etoque máx." value={result.EtouchMax.toFixed(0)} unit="V" />
              <StatCard label="Etoque admis." value={result.Etouch.toFixed(0)} unit="V" />
              <StatCard label="Epaso admis." value={result.Estep.toFixed(0)} unit="V" />
            </div>

            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <StatCard label={`Ib (${bodyW} kg)`} value={(result.Ib * 1000).toFixed(1)} unit="mA" />
              <StatCard label="Ib50" value={(result.Ib50 * 1000).toFixed(1)} unit="mA" />
              <StatCard label="Ib70" value={(result.Ib70 * 1000).toFixed(1)} unit="mA" />
            </div>

            <SectionLabel>Cumplimiento IEEE 80-2013</SectionLabel>
            {Object.entries(result.compliance).map(([key, c]) => (
              <ExpertItem key={key} type={c.pass ? 'ok' : 'danger'}>
                <strong>{key === 'gprUnder5kV' ? 'GPR' : 'Tensión de toque'}</strong> {c.pass ? 'cumple' : 'NO cumple'} — {c.limit} · {c.norm}
              </ExpertItem>
            ))}

            <ExportBar
              module="gpr"
              inputs={{ Ig: Number(Ig), Rg: Number(Rg), Sf: Number(Sf), ts: Number(ts), bodyW, Cs: Number(Cs), rhoS: Number(rhoS) }}
              outputs={result}
              norm={result.norm}
            />

            <FundBtn show={showFund} onToggle={() => setShowFund(f => !f)} label="Fundamentos IEEE 80-2013">
              <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--copper)', marginBottom: 10, fontSize: 11 }}>
                GPR = Sf · Ig · Rg
              </div>
              <p><strong style={{ color: 'var(--text)' }}>Sf (Split Factor):</strong> fracción de la corriente de falla que circula por la malla. Depende del diseño del sistema y de la impedancia de la red de tierra remota.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Corriente admisible:</strong> Ib = 0.116/√ts (50 kg) o 0.157/√ts (70 kg) — fórmulas de Dalziel (IEEE 80-2013 Ec. 29-30).</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Tensión de toque admisible:</strong> Etouch = (1000 + 1.5·Cs·ρs)·Ib — IEEE 80-2013 Ec. 32.</p>
              <p style={{ marginTop: 8 }}><strong style={{ color: 'var(--text)' }}>Tensión de paso admisible:</strong> Estep = (1000 + 6·Cs·ρs)·Ib — IEEE 80-2013 Ec. 33.</p>
              <p style={{ marginTop: 12, fontSize: 9, color: 'var(--faint)' }}>IEEE Std 80-2013 Cl. 15 · Dalziel & Lee (1968)</p>
            </FundBtn>
          </>
        )}
      </section>
    </div>
  );
}
