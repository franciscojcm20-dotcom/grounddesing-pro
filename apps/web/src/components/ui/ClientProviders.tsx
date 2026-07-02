'use client';
import type { ReactNode } from 'react';
import { AuthProvider }      from '@/context/AuthContext';
import { ToastProvider }     from '@/context/ToastContext';
import { I18nProvider }      from '@/context/I18nContext';
import { SoilModelProvider } from '@/context/SoilModelContext';
import { FaultAnalysisProvider } from '@/context/FaultAnalysisContext';
import { ThemeProvider }     from './ThemeProvider';
import { CommandPalette }    from './CommandPalette';

export function ClientProviders({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <ToastProvider>
            <SoilModelProvider>
              <FaultAnalysisProvider>
                {children}
                <CommandPalette />
              </FaultAnalysisProvider>
            </SoilModelProvider>
          </ToastProvider>
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  );
}
