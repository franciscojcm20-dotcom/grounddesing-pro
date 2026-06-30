import type { Metadata } from 'next';
import { SettingsClient } from './SettingsClient';

export const metadata: Metadata = {
  title: 'Configuración',
  description: 'Preferencias de idioma, norma activa y notificaciones.',
};

export default function SettingsPage() {
  return <SettingsClient />;
}
