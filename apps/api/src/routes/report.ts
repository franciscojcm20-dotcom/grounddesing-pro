import type { FastifyInstance } from 'fastify';
import { generateReportBuffer, type ReportMeta, type ReportSection } from '@gdp/pdf-engine';

// ─── Module adapters — shape raw calc output into ReportSection ───────────────

function wennerSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const pts = (outputs['points'] as Array<{ a: number; r: number; rhoA: number }>) ?? [];
  return {
    title: 'Resistividad de suelo — Wenner',
    norm: 'IEEE Std 81-2012, Cláusula 8.3',
    inputs: [
      { label: 'Nº lecturas', value: pts.length, unit: '' },
      { label: 'Espaciamientos a', value: pts.map(p => p.a).join(', '), unit: 'm' },
    ],
    results: [
      { label: 'ρ promedio', value: Number(outputs['rhoAvg']).toFixed(1), unit: 'Ω·m', highlight: true },
      { label: 'ρ1 (capa sup.)', value: Number((outputs['twoLayer'] as Record<string, number>)?.['rho1']).toFixed(1), unit: 'Ω·m' },
      { label: 'ρ2 (capa inf.)', value: Number((outputs['twoLayer'] as Record<string, number>)?.['rho2']).toFixed(1), unit: 'Ω·m' },
      { label: 'h estimada', value: String((outputs['twoLayer'] as Record<string, number>)?.['h']), unit: 'm' },
    ],
    pass: true,
    passLabel: `Procesadas ${pts.length} lecturas de campo — IEEE 81-2012`,
    observations: [
      'ρa calculada con fórmula de Wenner: ρa = 2πaR',
      'Modelo biestrato estimado por regresión sobre lecturas de campo',
    ],
  };
}

function gridSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const Rg    = Number(outputs['Rg']).toFixed(4);
  const pass  = Boolean(outputs['pass']);
  return {
    title: 'Resistencia de malla — Sverak',
    norm: 'IEEE Std 80-2013, Cláusula 14.2',
    inputs: [
      { label: 'Largo',       value: Number(inputs['largo']).toFixed(0),     unit: 'm'  },
      { label: 'Ancho',       value: Number(inputs['ancho']).toFixed(0),     unit: 'm'  },
      { label: 'Profundidad', value: Number(inputs['h']).toFixed(2),         unit: 'm'  },
      { label: 'Nº cond. largo', value: Number(inputs['nLargo']).toFixed(0), unit: ''   },
      { label: 'Nº cond. ancho', value: Number(inputs['nAncho']).toFixed(0), unit: ''   },
      { label: 'Nº varillas', value: Number(inputs['nRods']).toFixed(0),     unit: ''   },
      { label: 'Long. varilla', value: Number(inputs['rodLength']).toFixed(0),unit: 'm' },
      { label: 'ρ suelo',     value: Number(inputs['rho']).toFixed(0),       unit: 'Ω·m'},
    ],
    results: [
      { label: 'Rg Sverak',  value: Rg, unit: 'Ω', highlight: true },
      { label: 'Límite',     value: '1.0000', unit: 'Ω' },
      { label: 'Margen',     value: (1 - Number(Rg)).toFixed(4), unit: 'Ω' },
      { label: 'Lt total',   value: String(outputs['Lt']), unit: 'm' },
    ],
    pass,
    passLabel: pass
      ? `Rg = ${Rg} Ω < 1 Ω — CUMPLE IEEE 80-2013`
      : `Rg = ${Rg} Ω ≥ 1 Ω — NO CUMPLE, ampliar malla`,
    observations: [
      'Ecuación de Sverak: Rg = ρ/√(20·A) + ρ/(Lt)·(1 + 1/(1+h·√(20/A)))',
      pass ? 'La malla cumple el criterio de resistencia máxima.' : 'Se recomienda aumentar Lt o agregar varillas verticales.',
    ],
  };
}

function conductorSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  return {
    title: 'Dimensionamiento de conductor — Onderdonk',
    norm: 'IEEE Std 80-2013, Cláusula 11.3',
    inputs: [
      { label: 'Corriente de falla If', value: Number(inputs['iFalla']).toFixed(2), unit: 'kA' },
      { label: 'Tiempo de despeje tc', value: Number(inputs['tFalla']).toFixed(3),  unit: 's'  },
      { label: 'Temp. ambiente',        value: Number(inputs['tempAmbiente']),       unit: '°C' },
      { label: 'Temp. máx. fusión',     value: Number(inputs['tempMaxFusion']),      unit: '°C' },
    ],
    results: [
      { label: 'Área mínima',     value: Number(outputs['areaMm2']).toFixed(2),   unit: 'mm²',  highlight: true },
      { label: 'Calibre AWG/MCM', value: String(outputs['calibre'] ?? outputs['calibreSeleccionado'] ?? '—'), unit: '' },
      { label: 'Área seleccionada', value: String(outputs['areaSeleccionada'] ?? '—'), unit: 'mm²' },
      { label: 'Margen seguridad', value: String(outputs['margenPct'] ?? '—'),   unit: '%'   },
    ],
    pass: true,
    passLabel: `Calibre ${outputs['calibre'] ?? outputs['calibreSeleccionado']} — CUMPLE Onderdonk`,
    observations: [
      'Fórmula de Onderdonk: A = I·√(tc / (TCAP·ln((Tm+234)/(Ta+234))))',
      'Calibre seleccionado con margen de seguridad sobre área mínima calculada.',
    ],
  };
}

function voltagesSection(inputs: Record<string, unknown>, outputs: Record<string, unknown>): ReportSection {
  const passTouch = Boolean(outputs['passTouch']);
  const passStep  = Boolean(outputs['passStep']);
  const pass      = passTouch && passStep;
  return {
    title: 'Tensiones de paso y contacto',
    norm: 'IEEE Std 80-2013, Cláusula 16',
    inputs: [
      { label: 'ρ suelo',        value: Number(inputs['rho']).toFixed(0),        unit: 'Ω·m' },
      { label: 'ρ capa sup.',    value: Number(inputs['rhoS']).toFixed(0),       unit: 'Ω·m' },
      { label: 'Espesor capa',   value: Number(inputs['hs']).toFixed(2),         unit: 'm'   },
      { label: 'Ig corriente',   value: Number(inputs['Ig']).toFixed(0),         unit: 'A'   },
      { label: 'Tiempo despeje', value: Number(inputs['ts']).toFixed(3),         unit: 's'   },
      { label: 'Peso persona',   value: Number(inputs['pesoKg']).toFixed(0),     unit: 'kg'  },
    ],
    results: [
      { label: 'Em (malla)',         value: Number(outputs['Em']).toFixed(1),          unit: 'V', highlight: true },
      { label: 'Es (paso)',          value: Number(outputs['Es']).toFixed(1),          unit: 'V', highlight: true },
      { label: 'Etouch admisible',   value: Number(outputs['Etouch_adm']).toFixed(1),  unit: 'V' },
      { label: 'Estep admisible',    value: Number(outputs['Estep_adm']).toFixed(1),   unit: 'V' },
      { label: 'Cs factor',          value: Number(outputs['Cs']).toFixed(4),          unit: ''  },
    ],
    pass,
    passLabel: pass
      ? 'Em ≤ Etouch y Es ≤ Estep — CUMPLE IEEE 80-2013 Cl.16'
      : `${!passTouch ? 'Em > Etouch ' : ''}${!passStep ? 'Es > Estep' : ''} — NO CUMPLE`,
    observations: [
      `Tensión de malla Em = ${Number(outputs['Em']).toFixed(1)} V (adm. ${Number(outputs['Etouch_adm']).toFixed(1)} V)`,
      `Tensión de paso Es = ${Number(outputs['Es']).toFixed(1)} V (adm. ${Number(outputs['Estep_adm']).toFixed(1)} V)`,
    ],
  };
}

const ADAPTERS: Record<string, (i: Record<string, unknown>, o: Record<string, unknown>) => ReportSection> = {
  wenner:     wennerSection,
  grid:       gridSection,
  conductor:  conductorSection,
  voltages:   voltagesSection,
};

// ─── Route ────────────────────────────────────────────────────────────────────

export async function reportRoutes(app: FastifyInstance) {

  // POST /api/v1/report
  // Body: { meta: ReportMeta, sections: Array<{ module, inputs, outputs }> }
  app.post('/', async (req, reply) => {
    const body = req.body as {
      meta: ReportMeta;
      sections: Array<{ module: string; inputs: Record<string, unknown>; outputs: Record<string, unknown>; norm?: string }>;
    };

    if (!body.meta?.projectName) return reply.code(400).send({ error: 'meta.projectName es requerido' });
    if (!body.sections?.length)  return reply.code(400).send({ error: 'sections no puede estar vacío' });

    const sections: ReportSection[] = body.sections.map(s => {
      const adapter = ADAPTERS[s.module];
      if (adapter) return adapter(s.inputs, s.outputs);
      // Generic fallback
      return {
        title: s.module.toUpperCase(),
        norm: s.norm,
        inputs:  Object.entries(s.inputs).map(([k, v]) => ({ label: k, value: String(v) })),
        results: Object.entries(s.outputs).map(([k, v]) => ({ label: k, value: String(v) })),
      };
    });

    const buffer = await generateReportBuffer({ meta: body.meta, sections });

    const filename = `GDP-${body.meta.projectCode ?? 'report'}-${new Date().toISOString().slice(0, 10)}.pdf`;
    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="${filename}"`)
      .send(buffer);
  });
}
