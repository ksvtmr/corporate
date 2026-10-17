import React from 'react';
import { useI18n } from '../i18n/I18nProvider';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (item: T) => React.ReactNode;
  className?: string;
}

export interface TableProps<T = any> {
  columns?: Column<T>[];
  data?: T[];
  keyExtractor?: (item: T) => string;
  isLoading?: boolean;
  emptyText?: string;
  headers?: string[];
  children?: React.ReactNode;
}

export function Table<T = any>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyText,
  headers,
  children,
}: TableProps<T>) {
  const { t } = useI18n();
  if (headers && children) {
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
          <thead className="bg-slate-50">
            <tr>
              {headers.map((h, i) => (
                <th
                  key={i}
                  scope="col"
                  className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">{children}</tbody>
        </table>
      </div>
    );
  }

  const safeColumns = columns || [];
  const safeData = data || [];

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {safeColumns.map((col) => (
              <th
                key={col.key}
                scope="col"
                className={`px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 ${col.className || ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white" aria-busy={isLoading}>
          {isLoading ? (
            <tr>
              <td colSpan={safeColumns.length} className="px-4 py-8 text-center text-slate-500">
                <span className="inline-block animate-spin mr-2 h-5 w-5 border-2 border-indigo-600 border-t-transparent rounded-full" aria-hidden="true" />
                {t('common.states.loadingData')}
              </td>
            </tr>
          ) : safeData.length === 0 ? (
            <tr>
              <td colSpan={safeColumns.length} className="px-4 py-8 text-center text-slate-500">
                {emptyText ?? t('common.states.noData')}
              </td>
            </tr>
          ) : (
            safeData.map((item, index) => (
              <tr key={keyExtractor ? keyExtractor(item) : index} className="hover:bg-slate-50 transition-colors">
                {safeColumns.map((col) => (
                  <td key={col.key} className={`px-4 py-3 text-slate-800 ${col.className || ''}`}>
                    {col.render ? col.render(item) : (item as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
