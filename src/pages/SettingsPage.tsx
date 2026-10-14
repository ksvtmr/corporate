import React, { useState, useEffect } from 'react';
import { Shield, Save, Plus, X, Check } from 'lucide-react';

import { Card, Button, Input, Badge, api } from '@iclever/frontend-kit';

interface Organization {
  id: string;
  name: string;
  legal_name?: string;
  domain?: string;
  allowed_domains: string[];
  logo_url?: string;
  brand_color: string;
  timezone: string;
  default_locale: string;
}

export const SettingsPage: React.FC = () => {
  const [org, setOrg] = useState<Organization | null>(null);
  const [name, setName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [brandColor, setBrandColor] = useState('#4F46E5');
  const [timezone, setTimezone] = useState('UTC+5');
  const [defaultLocale, setDefaultLocale] = useState('ru');
  const [allowedDomains, setAllowedDomains] = useState<string[]>([]);
  const [newDomainInput, setNewDomainInput] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    api.get<Organization>('/corporate/organizations/current').then((res) => {
      if (res.success && res.data) {
        setOrg(res.data);
        setName(res.data.name || '');
        setLegalName(res.data.legal_name || '');
        setBrandColor(res.data.brand_color || '#4F46E5');
        setTimezone(res.data.timezone || 'UTC+5');
        setDefaultLocale(res.data.default_locale || 'ru');
        setAllowedDomains(res.data.allowed_domains || []);
      } else {
        // Demo fallback
        setName('Fintech Innovations Corp');
        setLegalName('ТОО "Финтех Инновации"');
        setAllowedDomains(['fintech.kz', 'fintech.corp.ai']);
      }
    });
  }, []);

  const handleAddDomain = () => {
    const trimmed = newDomainInput.trim().toLowerCase().replace(/^@/, '');
    if (trimmed && !allowedDomains.includes(trimmed)) {
      setAllowedDomains([...allowedDomains, trimmed]);
      setNewDomainInput('');
    }
  };

  const handleRemoveDomain = (domainToRemove: string) => {
    setAllowedDomains(allowedDomains.filter((d) => d !== domainToRemove));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setIsSaved(false);

    const res = await api.put('/corporate/organizations/current', {
      name,
      legal_name: legalName || undefined,
      brand_color: brandColor,
      timezone,
      default_locale: defaultLocale,
      allowed_domains: allowedDomains,
    });

    setIsLoading(false);
    if (res.success) {
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } else {
      alert(res.error?.message || 'Ошибка сохранения настроек');
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Настройки организации</h1>
        <p className="text-sm text-slate-500 mt-1">
          Параметры брендинга, политики безопасности и разрешённые почтовые домены
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Profile and Branding */}
        <Card title="Профиль и брендинг" subtitle="Основные реквизиты компании и визуальный стиль">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Название компании"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <Input
                label="Юридическое наименование"
                placeholder='ТОО "Название"'
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Цвет бренда</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-9 h-9 p-0.5 border border-slate-300 rounded-lg cursor-pointer"
                  />
                  <input
                    type="text"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="w-full text-xs font-mono rounded-lg border border-slate-300 px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Часовой пояс</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2"
                >
                  <option value="UTC+5">UTC+5 (Астана, Алматы, Ташкент)</option>
                  <option value="UTC+3">UTC+3 (Москва, Минск)</option>
                  <option value="UTC+0">UTC+0 (Лондон, GMT)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Язык по умолчанию</label>
                <select
                  value={defaultLocale}
                  onChange={(e) => setDefaultLocale(e.target.value)}
                  className="w-full text-sm rounded-lg border border-slate-300 bg-white p-2"
                >
                  <option value="ru">Русский (ru)</option>
                  <option value="kk">Қазақша (kk)</option>
                  <option value="en">English (en)</option>
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Allowed Email Domains */}
        <Card
          title="Разрешённые почтовые домены"
          subtitle="Сотрудники могут быть приглашены или импортированы только с адресов указанных доменов"
        >
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {allowedDomains.map((domain) => (
                <span
                  key={domain}
                  className="inline-flex items-center px-3 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                >
                  @{domain}
                  <button
                    type="button"
                    onClick={() => handleRemoveDomain(domain)}
                    className="ml-1.5 text-slate-400 hover:text-red-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </span>
              ))}
              {allowedDomains.length === 0 && (
                <p className="text-xs text-slate-400 italic">
                  Список доменов пуст (разрешены любые домены)
                </p>
              )}
            </div>

            <div className="flex items-center space-x-2 pt-2">
              <Input
                placeholder="например: company.com"
                value={newDomainInput}
                onChange={(e) => setNewDomainInput(e.target.value)}
                className="max-w-xs"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddDomain();
                  }
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={handleAddDomain}>
                <Plus className="w-4 h-4 mr-1" />
                Добавить домен
              </Button>
            </div>
          </div>
        </Card>

        {/* Subscription Limits */}
        <Card title="Тариф и лимиты" subtitle="Текущая квота рабочих мест и хранилища">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500">План подписки</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">Corporate Standard</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500">Рабочие места</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">142 / 200 мест</p>
            </div>
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-slate-500">Дисковая квота MinIO</span>
              <p className="text-base font-bold text-slate-900 mt-0.5">1.2 GB / 10 GB</p>
            </div>
          </div>
        </Card>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3">
          {isSaved && (
            <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 px-3 py-1.5 rounded-lg border border-green-200">
              <Check className="w-4 h-4 mr-1 text-green-600" />
              Настройки успешно сохранены
            </span>
          )}
          <Button type="submit" variant="primary" isLoading={isLoading}>
            <Save className="w-4 h-4 mr-1.5" />
            Сохранить изменения
          </Button>
        </div>
      </form>
    </div>
  );
};
