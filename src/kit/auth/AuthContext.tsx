import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { api, ApiError, ApiResponse } from '../api/client';
import { useI18n } from '../i18n/I18nProvider';
import { Locale, normalizeLocale, readStoredLocale } from '../i18n/config';
import type { LocalizedText } from '../i18n/localized';
import { can, Capability, MemberStatus, Role } from './permissions';
import { DEMO_ACCOUNTS, DEMO_PASSWORD, IS_DEMO_MODE } from './demo';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_active: boolean;
  locale?: Locale | null;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: Role;
  status: MemberStatus;
  first_name?: string;
  last_name?: string;
  email?: string;
  job_title?: string;
  department_id?: string;
  department_name?: string;
  department_name_i18n?: LocalizedText;
  manager_id?: string;
  manager_name?: string;
  org_name?: string;
  org_slug?: string;
  active_assignments_count?: number;
}

interface SessionPayload {
  token: string;
  user: User;
  active_member: OrgMember;
  memberships: OrgMember[];
}

export type AuthResult = { ok: true } | { ok: false; error: ApiError };

export interface RegisterPayload {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  org_name: string;
  job_title?: string;
}

interface AuthContextType {
  user: User | null;
  activeMember: OrgMember | null;
  memberships: OrgMember[];
  isAuthenticated: boolean;
  isLoading: boolean;
  /** Set when the server invalidated the session (expired/revoked); shown on the login page. */
  sessionNotice: string | null;
  login: (email: string, password: string, orgId?: string) => Promise<AuthResult>;
  register: (payload: RegisterPayload) => Promise<AuthResult>;
  acceptInvitation: (payload: { token: string; password: string; first_name?: string; last_name?: string }) => Promise<AuthResult>;
  logout: () => Promise<void>;
  switchOrganization: (orgId: string) => Promise<AuthResult>;
  /** Demo mode only: signs in as the seed account for `role` (a real server session, not a UI override). */
  switchDemoRole: (role: Role) => Promise<AuthResult>;
  can: (capability: Capability) => boolean;
  /** Changes the UI language and stores it on the user profile when signed in. */
  changeLocale: (locale: Locale) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { locale, setLocale } = useI18n();
  const [user, setUser] = useState<User | null>(null);
  const [activeMember, setActiveMember] = useState<OrgMember | null>(null);
  const [memberships, setMemberships] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const localeRef = useRef(locale);
  localeRef.current = locale;

  useEffect(() => {
    api.setLocale(locale);
  }, [locale]);

  const clearSession = useCallback(() => {
    api.setSession(null, null);
    setUser(null);
    setActiveMember(null);
    setMemberships([]);
  }, []);

  /**
   * Applies the language preference after sign-in. Priority: the user's saved
   * profile preference → an explicit choice on this device → the organization
   * default. A browser-detected language never overrides a saved preference.
   */
  const applyLocalePreference = useCallback(
    (u: User, member: OrgMember & { org_default_locale?: string }, orgDefault?: string) => {
      const saved = normalizeLocale(u.locale);
      if (saved) {
        if (saved !== localeRef.current) void setLocale(saved);
        return;
      }
      if (readStoredLocale()) return;
      const fallback = normalizeLocale(orgDefault ?? member.org_default_locale);
      if (fallback && fallback !== localeRef.current) void setLocale(fallback, { persist: false });
    },
    [setLocale],
  );

  const applySession = useCallback(
    async (payload: SessionPayload | Omit<SessionPayload, 'token'>, token?: string) => {
      if (token) api.setSession(token, payload.active_member.organization_id);
      setUser(payload.user);
      setActiveMember(payload.active_member);
      setMemberships(payload.memberships || []);
      setSessionNotice(null);
      let orgDefault: string | undefined;
      if (!normalizeLocale(payload.user.locale) && !readStoredLocale()) {
        const org = await api.get<{ default_locale: string }>('/corporate/organizations/current');
        orgDefault = org.data?.default_locale;
      }
      applyLocalePreference(payload.user, payload.active_member, orgDefault);
    },
    [applyLocalePreference],
  );

  useEffect(() => {
    api.onUnauthorized((code) => {
      clearSession();
      setSessionNotice(code === 'SESSION_EXPIRED' ? 'session_expired' : 'session_ended');
    });
    return () => api.onUnauthorized(null);
  }, [clearSession]);

  useEffect(() => {
    let cancelled = false;
    if (!api.getToken()) {
      setIsLoading(false);
      return;
    }
    api
      .get<Omit<SessionPayload, 'token'>>('/identity/me', { noCache: true })
      .then(async (res) => {
        if (cancelled) return;
        if (res.success && res.data) await applySession(res.data);
        else clearSession();
      })
      .finally(() => !cancelled && setIsLoading(false));
    return () => {
      cancelled = true;
    };
  }, [applySession, clearSession]);

  const handleSessionResponse = useCallback(
    async (res: ApiResponse<SessionPayload>): Promise<AuthResult> => {
      if (res.success && res.data) {
        await applySession(res.data, res.data.token);
        return { ok: true };
      }
      return { ok: false, error: res.error ?? { code: 'UNKNOWN', message: 'Unknown error' } };
    },
    [applySession],
  );

  const login = useCallback(
    async (email: string, password: string, orgId?: string) =>
      handleSessionResponse(await api.post<SessionPayload>('/identity/login', { email: email.trim(), password, organization_id: orgId })),
    [handleSessionResponse],
  );

  const register = useCallback(
    async (payload: RegisterPayload) =>
      handleSessionResponse(await api.post<SessionPayload>('/identity/register', { ...payload, locale: localeRef.current })),
    [handleSessionResponse],
  );

  const acceptInvitation = useCallback(
    async (payload: { token: string; password: string; first_name?: string; last_name?: string }) =>
      handleSessionResponse(await api.post<SessionPayload>('/identity/invitations/accept', payload)),
    [handleSessionResponse],
  );

  const logout = useCallback(async () => {
    await api.post('/identity/logout');
    clearSession();
    setSessionNotice(null);
  }, [clearSession]);

  const switchOrganization = useCallback(
    async (orgId: string) => handleSessionResponse(await api.post<SessionPayload>('/identity/switch-org', { organization_id: orgId })),
    [handleSessionResponse],
  );

  const switchDemoRole = useCallback(
    async (role: Role): Promise<AuthResult> => {
      const account = DEMO_ACCOUNTS.find((a) => a.role === role);
      if (!IS_DEMO_MODE || !account) return { ok: false, error: { code: 'FORBIDDEN', message: 'Demo role switching is disabled' } };
      await api.post('/identity/logout');
      api.setSession(null, null);
      return handleSessionResponse(await api.post<SessionPayload>('/identity/login', { email: account.email, password: DEMO_PASSWORD }));
    },
    [handleSessionResponse],
  );

  const changeLocale = useCallback(
    async (next: Locale) => {
      // Save the profile preference immediately (in parallel with loading the
      // catalogue) so a quick navigation right after switching cannot drop it.
      const saving = user ? api.put<User>('/identity/me/preferences', { locale: next }) : null;
      await setLocale(next);
      const res = await saving;
      if (res?.success && res.data) setUser(res.data);
    },
    [setLocale, user],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      activeMember,
      memberships,
      isAuthenticated: !!user && !!activeMember,
      isLoading,
      sessionNotice,
      login,
      register,
      acceptInvitation,
      logout,
      switchOrganization,
      switchDemoRole,
      can: (capability) => can(activeMember?.role, capability),
      changeLocale,
    }),
    [user, activeMember, memberships, isLoading, sessionNotice, login, register, acceptInvitation, logout, switchOrganization, switchDemoRole, changeLocale],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
