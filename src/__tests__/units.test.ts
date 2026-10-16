import { describe, expect, it } from 'vitest';
import { can, canAssignRole, rolesWith } from '@/kit/auth/permissions';
import { sanitizeCsvCell, toCsv } from '@/kit/export/csv';
import { isEmail, isStrongPassword } from '@/kit/forms/validation';
import { effectiveStatus } from '@/demo/useDemoData';
import { daysFromNow } from '@/demo/fixtures';
import { scheduleCard } from '@/pages/FlashcardsPage';

describe('RBAC matrix (API_CONTRACTS §16.2)', () => {
  it('matches the documented permissions', () => {
    expect(can('employee', 'members.read')).toBe(false);
    expect(can('manager', 'members.read')).toBe(true);
    expect(can('manager', 'members.manage')).toBe(false);
    expect(can('trainer', 'tracks.manage')).toBe(true);
    expect(can('trainer', 'cohorts.manage')).toBe(false);
    expect(can('hr_manager', 'org.settings')).toBe(true);
    expect(can('employee', 'learning.self')).toBe(true);
    expect(can(undefined, 'learning.self')).toBe(false);
    expect(rolesWith('reviews.manage')).not.toContain('trainer');
  });

  it('prevents privilege escalation through role assignment', () => {
    expect(canAssignRole('hr_manager', 'org_admin')).toBe(false);
    expect(canAssignRole('org_admin', 'org_admin')).toBe(true);
    expect(canAssignRole('org_admin', 'platform_super_admin')).toBe(false);
    expect(canAssignRole('manager', 'employee')).toBe(false);
  });
});

describe('CSV export safety (CWE-1236)', () => {
  it('neutralises formula prefixes and escapes quotes', () => {
    expect(sanitizeCsvCell('=SUM(A1)')).toBe(`"'=SUM(A1)"`);
    expect(sanitizeCsvCell('@cmd')).toBe(`"'@cmd"`);
    expect(sanitizeCsvCell('say "hi"')).toBe('"say ""hi"""');
    expect(toCsv([['a', '+1']])).toBe('﻿"a","\'+1"');
  });
});

describe('shared validation', () => {
  it('validates email and password policy identically on client and server', () => {
    expect(isEmail('user@fintech.kz')).toBe(true);
    expect(isEmail('nope@')).toBe(false);
    expect(isStrongPassword('Password123!')).toBe(true);
    expect(isStrongPassword('Құпиясөз1')).toBe(true);
    expect(isStrongPassword('short1')).toBe(false);
    expect(isStrongPassword('nodigitshere')).toBe(false);
  });
});

describe('assignment status', () => {
  it('derives overdue from the deadline instead of storing it', () => {
    expect(effectiveStatus({ status: 'assigned', due_date: daysFromNow(-1) })).toBe('overdue');
    expect(effectiveStatus({ status: 'in_progress', due_date: daysFromNow(3) })).toBe('in_progress');
    expect(effectiveStatus({ status: 'completed', due_date: daysFromNow(-10) })).toBe('completed');
    expect(effectiveStatus({ status: 'cancelled', due_date: daysFromNow(-10) })).toBe('cancelled');
  });
});

describe('flashcard scheduling', () => {
  const card = { id: 'c', topic: 'general' as const, front: 'q', back: 'a', due_date: daysFromNow(0), repetitions: 2, interval_days: 3 };
  it('doubles the interval when known and resets it when repeated', () => {
    const known = scheduleCard(card, true);
    expect(known.interval_days).toBe(6);
    expect(known.repetitions).toBe(3);
    expect(known.due_date).toBe(daysFromNow(6));
    const again = scheduleCard(card, false);
    expect(again.interval_days).toBe(1);
    expect(again.repetitions).toBe(2);
  });
});
