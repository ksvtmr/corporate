import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  is_active: boolean;
}

export interface OrgMember {
  id: string;
  organization_id: string;
  user_id: string;
  role: 'platform_super_admin' | 'org_admin' | 'hr_manager' | 'manager' | 'trainer' | 'employee';
  status: 'invited' | 'active' | 'suspended' | 'inactive' | 'archived';
  job_title?: string;
  department_id?: string;
  department_name?: string;
  manager_id?: string;
  org_name?: string;
  org_slug?: string;
  active_assignments_count?: number;
}

interface AuthContextType {
  user: User | null;
  activeMember: OrgMember | null;
  memberships: OrgMember[];
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, orgId?: string) => Promise<boolean>;
  register: (payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    org_name?: string;
    job_title?: string;
  }) => Promise<boolean>;
  logout: () => void;
  switchOrganization: (orgId: string) => Promise<void>;
  hasRole: (roles: string[]) => boolean;
  switchRole: (role: OrgMember['role']) => void;
  locale: 'ru' | 'kk' | 'en';
  setLocale: (loc: 'ru' | 'kk' | 'en') => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeMember, setActiveMember] = useState<OrgMember | null>(null);
  const [memberships, setMemberships] = useState<OrgMember[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const token = localStorage.getItem('iclever_token');
    if (!token) {
      setIsLoading(false);
      return;
    }

    const savedRole = localStorage.getItem('iclever_active_role') as OrgMember['role'] | null;

    api.get<{ user: User; active_member: OrgMember; memberships: OrgMember[] }>('/v1/identity/me')
      .then((res) => {
        if (res.success && res.data) {
          let member = res.data.active_member;
          let u = res.data.user;

          if (savedRole === 'employee') {
            u = { id: 'usr-emp-001', email: 'employee@corp.iclever.ai', first_name: 'Марат', last_name: 'Жумабаев', is_active: true };
            member = { ...member, role: 'employee', user_id: u.id, job_title: 'Go Backend Developer', department_name: 'Инженерия и разработка' };
          } else if (savedRole === 'manager') {
            u = { id: 'usr-mgr-002', email: 'manager@corp.iclever.ai', first_name: 'Виктор', last_name: 'Ким', is_active: true };
            member = { ...member, role: 'manager', user_id: u.id, job_title: 'Engineering Manager', department_name: 'Инженерия и разработка' };
          }

          setUser(u);
          setActiveMember(member);
          setMemberships(res.data.memberships || []);
          if (res.data.active_member?.organization_id) {
            localStorage.setItem('iclever_active_org_id', res.data.active_member.organization_id);
          }
        } else {
          localStorage.removeItem('iclever_token');
          localStorage.removeItem('iclever_active_org_id');
        }
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = async (email: string, password: string, orgId?: string): Promise<boolean> => {
    const res = await api.post<{ token: string; user: User; active_member: OrgMember; memberships: OrgMember[] }>(
      '/v1/identity/login',
      { email, password, organization_id: orgId }
    );

    if (res.success && res.data) {
      localStorage.setItem('iclever_token', res.data.token);
      if (res.data.active_member?.organization_id) {
        localStorage.setItem('iclever_active_org_id', res.data.active_member.organization_id);
      }
      if (res.data.active_member?.role) {
        localStorage.setItem('iclever_active_role', res.data.active_member.role);
      }
      setUser(res.data.user);
      setActiveMember(res.data.active_member);
      setMemberships(res.data.memberships || []);
      return true;
    }
    return false;
  };

  const register = async (payload: {
    email: string;
    password: string;
    first_name: string;
    last_name: string;
    org_name?: string;
    job_title?: string;
  }): Promise<boolean> => {
    const res = await api.post<{ token: string; user: User; active_member: OrgMember; memberships: OrgMember[] }>(
      '/v1/identity/register',
      payload
    );

    if (res.success && res.data) {
      localStorage.setItem('iclever_token', res.data.token);
      if (res.data.active_member?.organization_id) {
        localStorage.setItem('iclever_active_org_id', res.data.active_member.organization_id);
      }
      if (res.data.active_member?.role) {
        localStorage.setItem('iclever_active_role', res.data.active_member.role);
      }
      setUser(res.data.user);
      setActiveMember(res.data.active_member);
      setMemberships(res.data.memberships || []);
      return true;
    }
    return false;
  };

  const logout = () => {
    localStorage.removeItem('iclever_token');
    localStorage.removeItem('iclever_active_org_id');
    localStorage.removeItem('iclever_active_role');
    setUser(null);
    setActiveMember(null);
    setMemberships([]);
    window.location.href = `${import.meta.env.BASE_URL}login`;
  };

  const switchOrganization = async (orgId: string) => {
    const res = await api.post<{ token: string; active_member: OrgMember; memberships: OrgMember[] }>(
      '/v1/identity/switch-org',
      { organization_id: orgId }
    );

    if (res.success && res.data) {
      localStorage.setItem('iclever_token', res.data.token);
      localStorage.setItem('iclever_active_org_id', orgId);
      setActiveMember(res.data.active_member);
      setMemberships(res.data.memberships || []);
      window.location.reload();
    }
  };

  const [locale, setLocale] = useState<'ru' | 'kk' | 'en'>('ru');

  const switchRole = (role: OrgMember['role']) => {
    if (!activeMember) return;
    localStorage.setItem('iclever_active_role', role);
    
    let updatedUser = user;
    let jobTitle = activeMember.job_title;
    let deptName = activeMember.department_name;

    if (role === 'employee') {
      updatedUser = {
        id: 'usr-emp-001',
        email: 'employee@corp.iclever.ai',
        first_name: 'Марат',
        last_name: 'Жумабаев',
        is_active: true,
      };
      jobTitle = 'Go Backend Developer';
      deptName = 'Инженерия и разработка';
    } else if (role === 'manager') {
      updatedUser = {
        id: 'usr-mgr-002',
        email: 'manager@corp.iclever.ai',
        first_name: 'Виктор',
        last_name: 'Ким',
        is_active: true,
      };
      jobTitle = 'Engineering Manager';
      deptName = 'Инженерия и разработка';
    } else if (role === 'trainer') {
      updatedUser = {
        id: 'usr-trainer-003',
        email: 'trainer@corp.iclever.ai',
        first_name: 'Елена',
        last_name: 'Воронова',
        is_active: true,
      };
      jobTitle = 'Lead Corporate Trainer';
      deptName = 'People & HR';
    } else {
      updatedUser = {
        id: 'usr-admin-001',
        email: 'admin@corp.iclever.ai',
        first_name: 'Алина',
        last_name: 'Садыкова',
        is_active: true,
      };
      jobTitle = role === 'org_admin' ? 'HR Lead & Platform Admin' : 'Learning & Development Manager';
      deptName = 'People & HR';
    }

    const updatedMember: OrgMember = {
      ...activeMember,
      role,
      user_id: updatedUser.id,
      job_title: jobTitle,
      department_name: deptName,
    };

    setUser(updatedUser);
    setActiveMember(updatedMember);
  };

  const hasRole = (roles: string[]): boolean => {
    if (!activeMember) return false;
    if (activeMember.role === 'platform_super_admin' || activeMember.role === 'org_admin') return true;
    return roles.includes(activeMember.role);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeMember,
        memberships,
        isAuthenticated: !!user,
        isLoading,
        login,
        register,
        logout,
        switchOrganization,
        hasRole,
        switchRole,
        locale,
        setLocale,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
