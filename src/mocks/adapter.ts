import { mockStore } from './store';

const SIMULATED_DELAY_MS = 150;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function createJsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Mock-Engine': 'iClever-Local-Mock',
    },
  });
}

function sanitizeUser(user: any) {
  if (!user) return user;
  const { password, ...safeUser } = user;
  return safeUser;
}

function createCsvResponse(csvContent: string, filename = 'employees.csv') {
  return new Response(csvContent, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'X-Mock-Engine': 'iClever-Local-Mock',
    },
  });
}

export function setupFetchMock() {
  const originalFetch = window.fetch;

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const urlStr = typeof input === 'string' ? input : input instanceof URL ? input.toString() : input.url;
    const method = (init?.method || 'GET').toUpperCase();

    // Only intercept API calls
    if (!urlStr.includes('/api/') && !urlStr.includes('/corporate/') && !urlStr.includes('/v1/')) {
      return originalFetch(input, init);
    }

    // Normalize path
    const urlObj = new URL(urlStr, window.location.origin);
    const pathname = urlObj.pathname.replace(/^\/api(\/v1)?/, '').replace(/^\/v1/, '');
    const searchParams = urlObj.searchParams;

    await sleep(SIMULATED_DELAY_MS);

    // Read auth header if present
    let authHeader = '';
    if (init?.headers) {
      if (init.headers instanceof Headers) {
        authHeader = init.headers.get('Authorization') || '';
      } else if (Array.isArray(init.headers)) {
        const found = init.headers.find(([k]) => k.toLowerCase() === 'authorization');
        if (found) authHeader = found[1];
      } else if (typeof init.headers === 'object') {
        authHeader = (init.headers as any)['Authorization'] || (init.headers as any)['authorization'] || '';
      }
    }

    // Read body if present
    let body: any = null;
    if (init?.body) {
      if (typeof init.body === 'string') {
        try {
          body = JSON.parse(init.body);
        } catch {
          body = init.body;
        }
      } else if (init.body instanceof FormData) {
        body = init.body;
      }
    }

    console.info(`[Mock API] ${method} ${pathname}`, body || '');

    // ==========================================
    // 1. Identity Service Routes
    // ==========================================
    if (pathname === '/identity/login' && method === 'POST') {
      const { email, password } = body || {};
      const user = mockStore.findUserByEmail(email);

      if (password === 'WrongPassword123!' || (user && user.password && user.password !== password)) {
        return createJsonResponse(
          {
            success: false,
            error: {
              code: 'INVALID_CREDENTIALS',
              message: 'Неверный email или пароль',
            },
          },
          401
        );
      }

      // Support role-based logins even with cached localStorage
      let authenticatedUser = user;
      const lowerEmail = (email || '').toLowerCase();

      if (!authenticatedUser) {
        if (lowerEmail.includes('employee')) {
          authenticatedUser = {
            id: 'usr-emp-001',
            email: email || 'employee@corp.iclever.ai',
            password: password || 'Password123!',
            first_name: 'Марат',
            last_name: 'Жумабаев',
            is_active: true,
          };
        } else if (lowerEmail.includes('manager')) {
          authenticatedUser = {
            id: 'usr-mgr-002',
            email: email || 'manager@corp.iclever.ai',
            password: password || 'Password123!',
            first_name: 'Виктор',
            last_name: 'Ким',
            is_active: true,
          };
        } else {
          authenticatedUser = {
            id: 'usr-admin-001',
            email: email || 'admin@corp.iclever.ai',
            password: password || 'Password123!',
            first_name: 'Алина',
            last_name: 'Садыкова',
            is_active: true,
          };
        }
      }

      const memberships = mockStore.getMemberships(authenticatedUser.id);
      const isEmployee = lowerEmail.includes('employee') || authenticatedUser.id === 'usr-emp-001';
      const isManager = lowerEmail.includes('manager') || authenticatedUser.id === 'usr-mgr-002';

      const activeMember = memberships[0] || {
        id: isEmployee ? 'mem-002' : isManager ? 'mem-003' : 'mem-001',
        organization_id: 'org-fintech-01',
        user_id: authenticatedUser.id,
        role: isEmployee ? 'employee' : isManager ? 'manager' : 'org_admin',
        status: 'active',
        job_title: isEmployee ? 'Go Backend Developer' : isManager ? 'Engineering Manager' : 'Corporate Admin',
        department_name: isEmployee || isManager ? 'Инженерия и разработка' : 'People & HR',
        org_name: 'Fintech Innovations Corp',
        org_slug: 'fintech-innovations',
        active_assignments_count: isEmployee ? 3 : 2,
      };

      return createJsonResponse({
        success: true,
        data: {
          token: 'mock-jwt-token-' + btoa(authenticatedUser.email),
          user: sanitizeUser(authenticatedUser),
          active_member: activeMember,
          memberships: memberships.length > 0 ? memberships : [activeMember],
        },
      });
    }

    if (pathname === '/identity/register' && method === 'POST') {
      const { email, password, first_name, last_name, org_name, job_title } = body || {};
      const user = mockStore.createUser({
        email,
        password: password || 'Password123!',
        first_name: first_name || 'Новый',
        last_name: last_name || 'Администратор',
        is_active: true,
      });

      const org = mockStore.createOrganization(org_name || 'Новая организация');
      const dept = mockStore.getDepartments()[0];

      const member = {
        id: 'mem-' + Math.random().toString(36).substring(2, 9),
        organization_id: org.id,
        user_id: user.id,
        role: 'org_admin' as const,
        status: 'active' as const,
        job_title: job_title || 'Руководитель',
        department_id: dept?.id,
        department_name: dept?.name,
        org_name: org.name,
        org_slug: org.name.toLowerCase().replace(/\s+/g, '-'),
        active_assignments_count: 0,
      };

      return createJsonResponse(
        {
          success: true,
          data: {
            token: 'mock-jwt-token-' + btoa(user.email),
            user: sanitizeUser(user),
            active_member: member,
            memberships: [member],
          },
        },
        201
      );
    }

    if (pathname === '/identity/me' && method === 'GET') {
      let loggedInEmail = '';
      if (authHeader && authHeader.includes('mock-jwt-token-')) {
        try {
          const raw = authHeader.split('mock-jwt-token-')[1]?.trim();
          if (raw) loggedInEmail = atob(raw);
        } catch {}
      }

      let user = loggedInEmail ? mockStore.findUserByEmail(loggedInEmail) : undefined;
      if (!user) {
        user = mockStore.findUserByEmail('admin@corp.iclever.ai') || {
          id: 'usr-admin-001',
          email: 'admin@corp.iclever.ai',
          password: 'Password123!',
          first_name: 'Алина',
          last_name: 'Садыкова',
          is_active: true,
        };
      }

      const memberships = mockStore.getMemberships(user.id);
      const isEmployee = user.email.includes('employee') || user.id === 'usr-emp-001';
      const isManager = user.email.includes('manager') || user.id === 'usr-mgr-002';
      const isTrainer = user.email.includes('trainer') || user.id === 'usr-005';

      const activeMember = memberships[0] || {
        id: isEmployee ? 'mem-002' : isManager ? 'mem-003' : isTrainer ? 'mem-005' : 'mem-001',
        organization_id: 'org-fintech-01',
        user_id: user.id,
        role: isEmployee ? 'employee' : isManager ? 'manager' : isTrainer ? 'trainer' : 'org_admin',
        status: 'active',
        job_title: isEmployee ? 'Go Backend Developer' : isManager ? 'Engineering Manager' : isTrainer ? 'Lead Corporate Trainer' : 'HR Lead & Admin',
        department_name: isEmployee || isManager ? 'Инженерия и разработка' : 'People & HR',
        org_name: 'Fintech Innovations Corp',
        org_slug: 'fintech-innovations',
        active_assignments_count: isEmployee ? 3 : isManager ? 0 : 2,
      };

      return createJsonResponse({
        success: true,
        data: {
          user: sanitizeUser(user),
          active_member: activeMember,
          memberships: memberships.length > 0 ? memberships : [activeMember],
        },
      });
    }

    if (pathname === '/identity/switch-org' && method === 'POST') {
      const { organization_id } = body || {};
      const org = mockStore.getOrganization(organization_id);
      const user = mockStore.findUserByEmail('admin@corp.iclever.ai');
      const activeMember = {
        id: 'mem-' + Math.random().toString(36).substring(2, 9),
        organization_id: organization_id,
        user_id: user?.id || 'usr-admin-001',
        role: 'org_admin' as const,
        status: 'active' as const,
        org_name: org?.name || 'Организация',
        active_assignments_count: 0,
      };
      return createJsonResponse({
        success: true,
        data: {
          token: 'mock-jwt-token-switched',
          active_member: activeMember,
          memberships: [activeMember],
        },
      });
    }

    // ==========================================
    // 2. Corporate Organization & Settings
    // ==========================================
    if (pathname === '/corporate/organizations/current') {
      if (method === 'GET') {
        const org = mockStore.getOrganization('org-fintech-01');
        return createJsonResponse({ success: true, data: org });
      }
      if (method === 'PUT') {
        const updated = mockStore.updateOrganization('org-fintech-01', body || {});
        return createJsonResponse({ success: true, data: updated });
      }
    }

    if (pathname === '/corporate/organizations/settings') {
      return createJsonResponse({
        success: true,
        data: {
          plan_name: 'Corporate Standard',
          max_seats: 200,
          used_seats: 142,
          storage_limit_mb: 10240,
          storage_used_mb: 1240,
        },
      });
    }

    // ==========================================
    // 3. Departments & Structure
    // ==========================================
    if (pathname === '/corporate/departments' || pathname === '/corporate/departments/') {
      if (method === 'GET') {
        const departments = mockStore.getDepartments();
        return createJsonResponse({ success: true, data: departments });
      }
      if (method === 'POST') {
        const created = mockStore.createDepartment(body || {});
        return createJsonResponse({ success: true, data: created }, 201);
      }
    }

    if (pathname === '/corporate/departments/tree') {
      const departments = mockStore.getDepartments();
      return createJsonResponse({ success: true, data: departments });
    }

    const deptMatch = pathname.match(/^\/corporate\/departments\/([a-zA-Z0-9_-]+)$/);
    if (deptMatch) {
      const deptId = deptMatch[1];
      if (method === 'PUT') {
        const updated = mockStore.updateDepartment(deptId, body || {});
        return createJsonResponse({ success: true, data: updated });
      }
      if (method === 'DELETE') {
        mockStore.archiveDepartment(deptId);
        return createJsonResponse({ success: true, data: { message: 'Department archived' } });
      }
    }

    // ==========================================
    // 4. Positions
    // ==========================================
    if (pathname === '/corporate/positions') {
      if (method === 'GET') {
        const positions = mockStore.getPositions();
        return createJsonResponse({ success: true, data: positions });
      }
      if (method === 'POST') {
        const created = mockStore.createPosition(body || {});
        return createJsonResponse({ success: true, data: created }, 201);
      }
    }

    // ==========================================
    // 5. Members & Invitations
    // ==========================================
    if (pathname === '/corporate/members' || pathname === '/corporate/members/') {
      if (method === 'GET') {
        const filter = {
          search: searchParams.get('search') || undefined,
          role: searchParams.get('role') || undefined,
          status: searchParams.get('status') || undefined,
          department_id: searchParams.get('department_id') || undefined,
          page: parseInt(searchParams.get('page') || '1', 10),
          limit: parseInt(searchParams.get('limit') || '20', 10),
        };
        const res = mockStore.getMembers(filter);
        return createJsonResponse({
          success: true,
          data: res.items,
          meta: {
            page: res.page,
            limit: res.limit,
            total_items: res.total,
            total_pages: res.totalPages,
          },
        });
      }
    }

    if (pathname === '/corporate/members/invite' && method === 'POST') {
      const res = mockStore.inviteMember(body || {});
      return createJsonResponse({ success: true, data: res }, 201);
    }

    if (pathname === '/corporate/members/invite/resend' && method === 'POST') {
      return createJsonResponse({ success: true, data: { message: 'Приглашение отправлено повторно' } });
    }

    if (pathname === '/corporate/members/bulk' && method === 'POST') {
      const { action, member_ids, target_id, new_role } = body || {};
      const res = mockStore.bulkAction(action, member_ids || [], target_id, new_role);
      return createJsonResponse({ success: true, data: res });
    }

    if (pathname === '/corporate/members/import' && method === 'POST') {
      let csvContent = '';
      if (body instanceof FormData) {
        const file = body.get('file');
        if (file instanceof File) {
          csvContent = await file.text();
        }
      }
      if (!csvContent) {
        csvContent = "first_name,last_name,email,role,job_title,department_code\nАлександр,Петров,alex.p@fintech.kz,employee,DevOps Engineer,ENG\nМария,Ковалева,maria.k@fintech.kz,employee,Content Writer,HR\n";
      }
      const report = mockStore.importCSV(csvContent);
      return createJsonResponse({ success: true, data: report });
    }

    if (pathname === '/corporate/members/export' && method === 'GET') {
      const csv = mockStore.exportCSV();
      return createCsvResponse(csv);
    }

    const memberIdMatch = pathname.match(/^\/corporate\/members\/([a-zA-Z0-9_-]+)$/);
    if (memberIdMatch) {
      const memberId = memberIdMatch[1];
      if (!['invite', 'bulk', 'import', 'export'].includes(memberId)) {
        const member = mockStore.getMemberById(memberId);
        if (member) {
          return createJsonResponse({ success: true, data: member });
        }
        return createJsonResponse({ success: false, error: { code: 'NOT_FOUND', message: 'Сотрудник не найден' } }, 404);
      }
    }

    // Default fallback: return success placeholder for any unmocked /v1/* endpoints
    console.warn(`[Mock API] Unhandled endpoint: ${method} ${pathname}. Returning mock success.`);
    return createJsonResponse({
      success: true,
      data: { message: `Mock response for ${method} ${pathname}` },
    });
  };
}
