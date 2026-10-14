import {
  initialUsers,
  initialOrganizations,
  initialDepartments,
  initialPositions,
  initialMembers,
  SeedUser,
  SeedOrganization,
  SeedDepartment,
  SeedPosition,
  SeedOrgMember,
} from './data/seed';

const STORAGE_KEY = 'iclever_mock_db';

interface MockDB {
  users: SeedUser[];
  organizations: SeedOrganization[];
  departments: SeedDepartment[];
  positions: SeedPosition[];
  members: SeedOrgMember[];
  invitations: Array<{ id: string; email: string; role: string; department_id?: string; link?: string; created_at: string }>;
}

class MockStore {
  private db: MockDB;

  constructor() {
    this.db = this.load();
  }

  private load(): MockDB {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    const initial: MockDB = {
      users: [...initialUsers],
      organizations: [...initialOrganizations],
      departments: [...initialDepartments],
      positions: [...initialPositions],
      members: [...initialMembers],
      invitations: [],
    };
    this.save(initial);
    return initial;
  }

  private save(data?: MockDB) {
    if (data) this.db = data;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.db));
    } catch {
      // ignore
    }
  }

  public reset() {
    localStorage.removeItem(STORAGE_KEY);
    this.db = this.load();
  }

  // --- Auth & Users ---
  public findUserByEmail(email: string): SeedUser | undefined {
    return this.db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(user: Omit<SeedUser, 'id'>): SeedUser {
    const newUser: SeedUser = {
      ...user,
      id: 'usr-' + Math.random().toString(36).substring(2, 9),
    };
    this.db.users.push(newUser);
    this.save();
    return newUser;
  }

  public getMemberships(userId: string): SeedOrgMember[] {
    return this.db.members.filter((m) => m.user_id === userId);
  }

  // --- Organizations ---
  public getOrganization(orgId: string): SeedOrganization | undefined {
    return this.db.organizations.find((o) => o.id === orgId) || this.db.organizations[0];
  }

  public updateOrganization(orgId: string, updates: Partial<SeedOrganization>): SeedOrganization {
    const org = this.getOrganization(orgId);
    if (!org) throw new Error('Organization not found');
    Object.assign(org, updates);
    this.save();
    return org;
  }

  public createOrganization(name: string, domain?: string): SeedOrganization {
    const newOrg: SeedOrganization = {
      id: 'org-' + Math.random().toString(36).substring(2, 9),
      name,
      legal_name: name,
      domain: domain || 'company.com',
      allowed_domains: domain ? [domain] : ['company.com'],
      brand_color: '#4F46E5',
      timezone: 'UTC+5',
      default_locale: 'ru',
    };
    this.db.organizations.push(newOrg);
    this.save();
    return newOrg;
  }

  // --- Departments ---
  public getDepartments(): SeedDepartment[] {
    return this.db.departments;
  }

  public createDepartment(dept: Omit<SeedDepartment, 'id' | 'member_count'>): SeedDepartment {
    const newDept: SeedDepartment = {
      ...dept,
      id: 'dept-' + Math.random().toString(36).substring(2, 9),
      member_count: 0,
    };
    this.db.departments.push(newDept);
    this.save();
    return newDept;
  }

  public updateDepartment(id: string, updates: Partial<SeedDepartment>): SeedDepartment {
    const dept = this.db.departments.find((d) => d.id === id);
    if (!dept) throw new Error('Department not found');
    Object.assign(dept, updates);
    this.save();
    return dept;
  }

  public archiveDepartment(id: string): void {
    this.db.departments = this.db.departments.filter((d) => d.id !== id);
    this.save();
  }

  // --- Positions ---
  public getPositions(): SeedPosition[] {
    return this.db.positions;
  }

  public createPosition(pos: Omit<SeedPosition, 'id'>): SeedPosition {
    const newPos: SeedPosition = {
      ...pos,
      id: 'pos-' + Math.random().toString(36).substring(2, 9),
    };
    this.db.positions.push(newPos);
    this.save();
    return newPos;
  }

  // --- Members ---
  public getMembers(filter: {
    search?: string;
    role?: string;
    status?: string;
    department_id?: string;
    page?: number;
    limit?: number;
  }) {
    let list = [...this.db.members];

    if (filter.department_id) {
      list = list.filter((m) => m.department_id === filter.department_id);
    }
    if (filter.role) {
      list = list.filter((m) => m.role === filter.role);
    }
    if (filter.status) {
      list = list.filter((m) => m.status === filter.status);
    }
    if (filter.search) {
      const q = filter.search.toLowerCase();
      list = list.filter((m) => {
        const user = this.db.users.find((u) => u.id === m.user_id);
        const name = user ? `${user.first_name} ${user.last_name}`.toLowerCase() : '';
        const email = user ? user.email.toLowerCase() : '';
        const job = (m.job_title || '').toLowerCase();
        return name.includes(q) || email.includes(q) || job.includes(q);
      });
    }

    const total = list.length;
    const page = filter.page && filter.page > 0 ? filter.page : 1;
    const limit = filter.limit && filter.limit > 0 ? filter.limit : 20;
    const offset = (page - 1) * limit;

    const paged = list.slice(offset, offset + limit).map((m) => {
      const user = this.db.users.find((u) => u.id === m.user_id);
      return {
        ...m,
        first_name: user?.first_name || 'Сотрудник',
        last_name: user?.last_name || '',
        email: user?.email || '',
      };
    });

    return {
      items: paged,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
    };
  }

  public getMemberById(id: string) {
    const m = this.db.members.find((item) => item.id === id);
    if (!m) return null;
    const user = this.db.users.find((u) => u.id === m.user_id);
    return {
      ...m,
      first_name: user?.first_name || '',
      last_name: user?.last_name || '',
      email: user?.email || '',
    };
  }

  public inviteMember(data: {
    email: string;
    role: SeedOrgMember['role'];
    department_id?: string;
    invite_type?: 'email' | 'link';
  }) {
    let user = this.findUserByEmail(data.email);
    if (!user) {
      const parts = data.email.split('@')[0].split('.');
      const firstName = parts[0] ? parts[0].charAt(0).toUpperCase() + parts[0].slice(1) : 'Новый';
      const lastName = parts[1] ? parts[1].charAt(0).toUpperCase() + parts[1].slice(1) : 'Пользователь';
      user = this.createUser({
        email: data.email,
        password: 'Password123!',
        first_name: firstName,
        last_name: lastName,
        is_active: true,
      });
    }

    const dept = this.db.departments.find((d) => d.id === data.department_id);
    const org = this.db.organizations[0];

    const newMember: SeedOrgMember = {
      id: 'mem-' + Math.random().toString(36).substring(2, 9),
      organization_id: org.id,
      user_id: user.id,
      role: data.role,
      status: 'invited',
      job_title: 'Новый сотрудник',
      department_id: data.department_id,
      department_name: dept?.name,
      org_name: org.name,
      active_assignments_count: 0,
      start_date: new Date().toISOString().split('T')[0],
    };

    this.db.members.push(newMember);

    const inviteToken = 'inv-' + Math.random().toString(36).substring(2, 12);
    const inviteLink = `${window.location.origin}${import.meta.env.BASE_URL}invite?token=${inviteToken}`;

    this.db.invitations.push({
      id: inviteToken,
      email: data.email,
      role: data.role,
      department_id: data.department_id,
      link: inviteLink,
      created_at: new Date().toISOString(),
    });

    this.save();

    return {
      invitation_id: inviteToken,
      invite_link: data.invite_type === 'link' ? inviteLink : undefined,
      member: newMember,
    };
  }

  public bulkAction(action: 'assign_department' | 'change_role' | 'deactivate', memberIds: string[], targetId?: string, newRole?: string) {
    let affected = 0;
    this.db.members.forEach((m) => {
      if (memberIds.includes(m.id)) {
        affected++;
        if (action === 'assign_department' && targetId) {
          m.department_id = targetId;
          const dept = this.db.departments.find((d) => d.id === targetId);
          m.department_name = dept?.name;
        } else if (action === 'change_role' && newRole) {
          m.role = newRole as SeedOrgMember['role'];
        } else if (action === 'deactivate') {
          m.status = 'inactive';
        }
      }
    });
    this.save();
    return { affected_rows: affected };
  }

  public importCSV(csvContent: string) {
    const lines = csvContent.trim().split(/\r?\n/);
    if (lines.length <= 1) {
      return { total_rows: 0, created_count: 0, updated_count: 0, failed_count: 0, row_results: [] };
    }

    // Limit maximum rows to prevent DoS
    const MAX_ROWS = 500;
    const safeLines = lines.slice(0, MAX_ROWS + 1);

    const parseCsvLine = (line: string): string[] => {
      const result: string[] = [];
      let cur = '';
      let inQuotes = false;
      for (let j = 0; j < line.length; j++) {
        const char = line[j];
        if (char === '"') {
          if (inQuotes && line[j + 1] === '"') {
            cur += '"';
            j++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(cur.trim());
          cur = '';
        } else {
          cur += char;
        }
      }
      result.push(cur.trim());
      return result;
    };

    const header = parseCsvLine(safeLines[0]).map((h) => h.toLowerCase());
    const results: Array<{ row_number: number; email: string; status: string; error?: string }> = [];
    let created = 0;
    let failed = 0;

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

    for (let i = 1; i < safeLines.length; i++) {
      const line = safeLines[i].trim();
      if (!line) continue;
      const cols = parseCsvLine(line);
      const rowNum = i;

      const row: Record<string, string> = {};
      header.forEach((h, idx) => {
        row[h] = cols[idx] || '';
      });

      const email = (row['email'] || '').replace(/^['=+\-@]/, '').trim();
      const firstName = (row['first_name'] || 'Сотрудник').replace(/^[=+\-@]/, '');
      const lastName = (row['last_name'] || '').replace(/^[=+\-@]/, '');
      const role = (row['role'] || 'employee') as SeedOrgMember['role'];
      const jobTitle = (row['job_title'] || 'Специалист').replace(/^[=+\-@]/, '');
      const deptCode = row['department_code'];

      if (!email || !emailRegex.test(email)) {
        results.push({ row_number: rowNum, email: email || 'empty', status: 'failed', error: 'Некорректный email адрес' });
        failed++;
        continue;
      }

      let user = this.findUserByEmail(email);
      if (!user) {
        user = this.createUser({
          email,
          password: 'Password123!',
          first_name: firstName,
          last_name: lastName,
          is_active: true,
        });
      }

      const dept = this.db.departments.find((d) => d.code === deptCode);
      const org = this.db.organizations[0];

      this.db.members.push({
        id: 'mem-' + Math.random().toString(36).substring(2, 9),
        organization_id: org.id,
        user_id: user.id,
        role: role,
        status: 'active',
        job_title: jobTitle,
        department_id: dept?.id,
        department_name: dept?.name,
        org_name: org.name,
        active_assignments_count: 0,
        start_date: new Date().toISOString().split('T')[0],
      });

      created++;
      results.push({ row_number: rowNum, email, status: 'success' });
    }

    this.save();
    return {
      total_rows: safeLines.length - 1,
      created_count: created,
      updated_count: 0,
      failed_count: failed,
      row_results: results,
    };
  }

  public exportCSV(): string {
    const sanitizeCsvCell = (value: unknown): string => {
      if (value === undefined || value === null) return '""';
      let str = String(value);
      // CSV Formula Injection mitigation (CWE-1236):
      // Prefix dangerous leading characters with single quote
      if (/^[=+\-@\t\r]/.test(str)) {
        str = `'${str}`;
      }
      const escaped = str.replace(/"/g, '""');
      return `"${escaped}"`;
    };

    const headers = ['ID', 'First Name', 'Last Name', 'Email', 'Role', 'Status', 'Job Title', 'Department'];
    const rows = this.db.members.map((m) => {
      const user = this.db.users.find((u) => u.id === m.user_id);
      return [
        sanitizeCsvCell(m.id),
        sanitizeCsvCell(user?.first_name),
        sanitizeCsvCell(user?.last_name),
        sanitizeCsvCell(m.user_id ? user?.email : ''),
        sanitizeCsvCell(m.role),
        sanitizeCsvCell(m.status),
        sanitizeCsvCell(m.job_title),
        sanitizeCsvCell(m.department_name),
      ].join(',');
    });
    return [headers.map((h) => `"${h}"`).join(','), ...rows].join('\r\n');
  }
}

export const mockStore = new MockStore();
