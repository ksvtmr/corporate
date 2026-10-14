import React, { useState } from 'react';
import {
  BarChart3,
  TrendingUp,
  AlertTriangle,
  Sparkles,
  Users,
  Clock,
  Award,
  Filter,
  CheckCircle2,
  ChevronDown
} from 'lucide-react';
import { Button, Card, Badge } from '@iclever/frontend-kit';
import { useAuth } from '@iclever/frontend-kit';

export const AnalyticsPage: React.FC = () => {
  const { activeMember } = useAuth();
  const [level, setLevel] = useState<'organization' | 'department' | 'team'>('organization');
  const [timeRange, setTimeRange] = useState('30d');

  const isManager = activeMember?.role === 'manager';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">HR-Аналитика и образовательные метрики</h1>
          <p className="text-xs text-slate-500 mt-1">
            {isManager
              ? 'Срезы прохождения обучения команды Инженерии и разработки'
              : 'Комплексный срез по компании: прогресс онбординга, просрочки, AI-инсайты по сложным темам'}
          </p>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          {!isManager && (
            <select
              value={level}
              onChange={(e) => setLevel(e.target.value as any)}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700"
            >
              <option value="organization">Вся организация</option>
              <option value="department">По подразделениям</option>
              <option value="team">По командам</option>
            </select>
          )}

          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 font-medium text-slate-700"
          >
            <option value="7d">Последние 7 дней</option>
            <option value="30d">Последние 30 дней</option>
            <option value="90d">Квартал Q3 2026</option>
          </select>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Процент завершения (Completion)</span>
          <div className="text-2xl font-black text-slate-900">88.4%</div>
          <span className="text-[10px] text-green-600 font-semibold flex items-center">
            <TrendingUp className="w-3 h-3 mr-0.5" /> +4.2% за прошлый период
          </span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Успешная сдача тестов (Pass Rate)</span>
          <div className="text-2xl font-black text-slate-900">91.2%</div>
          <span className="text-[10px] text-slate-500">Средний балл: 86/100</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Просрочено дедлайнов (Overdue)</span>
          <div className="text-2xl font-black text-red-600">7 чел.</div>
          <span className="text-[10px] text-red-500 font-medium">4.9% от всех назначений</span>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-[11px] text-slate-400 font-medium">Среднее время онбординга</span>
          <div className="text-2xl font-black text-indigo-600">11.4 дня</div>
          <span className="text-[10px] text-green-600 font-medium">-2 дня к целевому KPI</span>
        </div>
      </div>

      {/* Charts & Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Department performance */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900">Прогресс онбординга по отделам</h3>
            <span className="text-xs text-slate-400">Целевой показатель: 85%</span>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Инженерия и разработка (32 сотр.)</span>
                <span className="text-green-600 font-bold">92.8%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full rounded-full" style={{ width: '92.8%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Финансы и комплаенс (9 сотр.)</span>
                <span className="text-green-600 font-bold">88.9%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-green-500 h-full rounded-full" style={{ width: '88.9%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>People & HR (6 сотр.)</span>
                <span className="text-indigo-600 font-bold">83.3%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full rounded-full" style={{ width: '83.3%' }} />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-slate-700 font-medium mb-1">
                <span>Продажи и клиентский сервис (18 сотр.)</span>
                <span className="text-amber-600 font-bold">72.2%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div className="bg-amber-500 h-full rounded-full" style={{ width: '72.2%' }} />
              </div>
            </div>
          </div>
        </div>

        {/* AI Educational Insights Panel */}
        <div className="lg:col-span-1 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 rounded-2xl border border-indigo-100 shadow-sm space-y-4">
          <div className="flex items-center space-x-2 text-indigo-900 font-bold text-sm">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            <span>AI-Инсайты обучения</span>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 space-y-1">
              <span className="font-semibold text-red-600 flex items-center">
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Сложный топик: NATS JetStream
              </span>
              <p className="text-slate-600 text-[11px]">
                38% ошибок в вопросе про идемпотентность консьюмеров. Рекомендуется добавить видео-разбор в трек.
              </p>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 space-y-1">
              <span className="font-semibold text-amber-600 flex items-center">
                <Clock className="w-3.5 h-3.5 mr-1" />
                Риск дедлайнов: Отдел продаж
              </span>
              <p className="text-slate-600 text-[11px]">
                5 сотрудников имеют задержку более 4 дней в курсе B2B переговоров.
              </p>
            </div>

            <div className="p-3 bg-white/80 rounded-xl border border-indigo-100 space-y-1">
              <span className="font-semibold text-indigo-600 flex items-center">
                <Award className="w-3.5 h-3.5 mr-1" />
                Популярный материал
              </span>
              <p className="text-slate-600 text-[11px]">
                «Регламент ИБ 2026» генерирует 64% всех запросов к корпоративному AI-чату.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
