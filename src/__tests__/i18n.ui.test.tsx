import React from 'react';
import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { AuthProvider, I18nProvider, LOCALE_STORAGE_KEY, ToastProvider } from '@iclever/frontend-kit';
import { LoginPage } from '@/pages/LoginPage';
import { loadAll } from './loadCatalogue';
import { setupFetchMock } from '@/mocks/adapter';
import { resetDb } from '@/mocks/db';
import { resetRateLimits } from '@/mocks/http';

const catalogues = loadAll();

function renderLogin(initialLocale: 'ru' | 'kk' | 'en' = 'ru') {
  return render(
    <I18nProvider initialLocale={initialLocale} catalogues={catalogues}>
      <ToastProvider>
        <AuthProvider>
          <MemoryRouter initialEntries={['/login']} future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <LoginPage />
          </MemoryRouter>
        </AuthProvider>
      </ToastProvider>
    </I18nProvider>,
  );
}

beforeAll(() => setupFetchMock());
beforeEach(() => {
  localStorage.clear();
  resetDb();
  resetRateLimits();
});
afterEach(cleanup);

describe('language switching', () => {
  it('updates the interface immediately and persists the choice', async () => {
    renderLogin('ru');
    expect(screen.getByRole('button', { name: 'Войти' })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Қазақша' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Кіру' })).toBeTruthy());
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('kk');
    expect(document.documentElement.lang).toBe('kk');
    fireEvent.click(screen.getByRole('button', { name: 'English' }));
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sign in' })).toBeTruthy());
    expect(screen.getByRole('button', { name: 'English' }).getAttribute('aria-pressed')).toBe('true');
    expect(document.title).toContain('corporate learning');
  });

  it('shows localized server errors (no raw codes or English server messages)', async () => {
    renderLogin('kk');
    fireEvent.change(screen.getByLabelText('Жұмыс email-і'), { target: { value: 'admin@corp.iclever.ai' } });
    fireEvent.change(screen.getByLabelText('Құпиясөз'), { target: { value: 'wrong-password1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Кіру' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Email немесе құпиясөз қате'));
  });

  it('validates required fields client-side before calling the server', async () => {
    renderLogin('en');
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(screen.getByRole('alert').textContent).toBe('Enter your email and password.'));
  });
});
