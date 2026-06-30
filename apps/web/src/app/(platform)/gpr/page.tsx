import type { Metadata } from 'next';
import { GprClient } from './GprClient';

export const metadata: Metadata = { title: 'GPR — Potencial de tierra IEEE 80' };

export default function GprPage() {
  return <GprClient />;
}
