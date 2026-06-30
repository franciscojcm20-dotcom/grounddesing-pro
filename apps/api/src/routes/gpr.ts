import type { FastifyInstance } from 'fastify';

interface GprInput {
  Ig:    number;   // Corriente de falla a tierra (A)
  Rg:    number;   // Resistencia de malla (Ω)
  Zf:    number;   // Impedancia del sistema de falla (Ω) — opcional, default Rg
  Sf:    number;   // Factor de división de corriente (0-1)
  ts:    number;   // Duración de la falla (s)
  bodyW: number;   // Peso corporal (kg): 50 o 70
  Cs:    number;   // Factor de reducción capa superficial
  rhoS:  number;   // Resistividad capa superficial (Ω·m)
}

export async function routesGpr(app: FastifyInstance): Promise<void> {

  // POST /api/v1/gpr
  app.post<{ Body: GprInput }>('/', async (req, reply) => {
    const { Ig, Rg, Sf, ts, bodyW, Cs, rhoS } = req.body;

    if (Ig <= 0 || Rg <= 0) {
      return reply.code(400).send({ error: 'Ig y Rg deben ser positivos' });
    }

    // GPR = Sf * Ig * Rg  (IEEE 80-2013 Ec. 27)
    const GPR = Sf * Ig * Rg;

    // Corriente de toque y paso (IEEE 80-2013 Cl. 15)
    const Ib50 = 0.116 / Math.sqrt(ts);   // A — cuerpo 50 kg
    const Ib70 = 0.157 / Math.sqrt(ts);   // A — cuerpo 70 kg
    const Ib   = bodyW >= 70 ? Ib70 : Ib50;

    // Tensión de toque admisible (IEEE 80-2013 Ec. 32)
    const Etouch = (1000 + 1.5 * Cs * rhoS) * Ib;

    // Tensión de paso admisible (IEEE 80-2013 Ec. 33)
    const Estep  = (1000 + 6.0 * Cs * rhoS) * Ib;

    // Referencia de tensión de toque máxima ~ GPR/2 (simplificado)
    const EtouchMax = GPR / 2;

    const compliance = {
      gprUnder5kV: { pass: GPR <= 5000, limit: '≤ 5 kV', norm: 'IEEE 80-2013 Cl. 1' },
      touchSafe:   { pass: EtouchMax <= Etouch, limit: `≤ ${Etouch.toFixed(0)} V`, norm: 'IEEE 80-2013 Cl. 16' },
    };

    return {
      GPR,
      Ib, Ib50, Ib70,
      Etouch, Estep,
      EtouchMax,
      compliance,
      inputs: req.body,
      norm: 'IEEE Std 80-2013 Cl. 15-16',
    };
  });
}
