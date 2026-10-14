import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Download,
  Clock,
  CheckCircle2,
  FileText,
  FileDown,
  Filter,
  History,
  Sparkles,
  ArrowRight,
  Search,
  Check
} from 'lucide-react';
import { Button, Card, Badge, Input, Modal, Table } from '@iclever/frontend-kit';

interface ExportJob {
  id: string;
  report_type: string;
  format: 'pdf' | 'xlsx' | 'csv';
  status: 'processing' | 'ready' | 'failed';
  created_at: string;
  file_size_mb?: number;
  download_url?: string;
}

const initialJobs: ExportJob[] = [
  {
    id: 'exp-001',
    report_type: 'Итоги онбординга и аттестации Q3 2026',
    format: 'xlsx',
    status: 'ready',
    created_at: '2026-09-02 12:30:15',
    file_size_mb: 2.4,
    download_url: '#download',
  },
  {
    id: 'exp-002',
    report_type: 'Журнал событий честности (Integrity Flags)',
    format: 'pdf',
    status: 'ready',
    created_at: '2026-09-01 18:45:00',
    file_size_mb: 1.1,
    download_url: '#download',
  },
  {
    id: 'exp-003',
    report_type: 'Выгрузка реестра сотрудников компании',
    format: 'csv',
    status: 'ready',
    created_at: '2026-08-28 09:10:22',
    file_size_mb: 0.4,
    download_url: '#download',
  },
];

export const ReportsPage: React.FC = () => {
  const [jobs, setJobs] = useState<ExportJob[]>(initialJobs);
  const [selectedFormat, setSelectedFormat] = useState<'pdf' | 'xlsx' | 'csv'>('xlsx');
  const [selectedType, setSelectedType] = useState('Сводный отчет успеваемости по отделам');
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [historySearch, setHistorySearch] = useState('');
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  const reportTypes = [
    { title: 'Сводный отчет успеваемости по отделам', desc: 'Детальная разбивка по подразделениям, проценту завершения и средним баллам' },
    { title: 'Реестр просроченных дедлайнов и эскалаций', desc: 'Список сотрудников с сорванными сроками сдачи программ и тестов' },
    { title: 'Аналитический срез по компетенциям (Matrix)', desc: 'Оценка hard skills и сопоставление с грейдами инженеров' },
    { title: 'Журнал анти-чит и событий честности', desc: 'Логи потери фокуса окна, копирования и подозрительных сессий' },
    { title: 'Реестр сотрудников и статус аккаунтов', desc: 'Экспорт полного кадрового состава со статусами инвайтов' },
  ];

  const handleGenerateReport = () => {
    setIsGenerating(true);
    setProgress(10);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(interval);
          setIsGenerating(false);

          const newJob: ExportJob = {
            id: 'exp-' + Math.random().toString(36).substring(2, 7),
            report_type: selectedType,
            format: selectedFormat,
            status: 'ready',
            created_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
            file_size_mb: 1.8,
            download_url: '#download',
          };
          setJobs([newJob, ...jobs]);
          setDownloadToast(`Отчет «${selectedType}» сформирован! Нажмите «Скачать» в таблице ниже.`);
          setTimeout(() => setDownloadToast(null), 4000);
          return 0;
        }
        return prev + 25;
      });
    }, 350);
  };

  const handleDownloadFile = (job: ExportJob) => {
    let mime = 'text/csv;charset=utf-8;';
    let ext = job.format;
    let content = '';

    if (job.format === 'csv') {
      mime = 'text/csv;charset=utf-8;';
      content = '\uFEFF' + `Отчет: ${job.report_type}\nДата: ${job.created_at}\nСтатус: ${job.status}\n\nФИО,Подразделение,Трек,Прогресс,Статус\nМарат Жумабаев,Инженерия и разработка,Онбординг Go,75%,В процессе\nАлександр Петров,Инженерия и разработка,Онбординг Go,40%,В процессе\nНурлан Сейтов,Инженерия и разработка,Архитектурный стандарт,95%,Сдано\nДина Сабитова,Инженерия и разработка,Информационная безопасность,100%,Сдано\nАлексей Смирнов,Инженерия и разработка,Входное тестирование,10%,Просрочено\n`;
    } else if (job.format === 'xlsx') {
      mime = 'application/vnd.ms-excel;charset=utf-8;';
      content = `Отчет: ${job.report_type}\tДата: ${job.created_at}\nФИО\tПодразделение\tПрогресс\nМарат Жумабаев\tИнженерия\t75%\nВиктор Ким\tИнженерия\t100%\n`;
    } else {
      mime = 'text/plain;charset=utf-8;';
      content = `iClever Corporate Platform - Официальный отчет\n=========================================\nТип отчета: ${job.report_type}\nДата генерации: ${job.created_at}\nФормат: ${job.format.toUpperCase()}\nОрганизация: Fintech Innovations Corp\n\nСводка показателей:\nВсего сотрудников: 142\nCompletion Rate: 88.4%\nСредний балл тестирования: 89.4/100\n`;
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${job.id}.${ext === 'pdf' ? 'txt' : ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadToast(`Файл отчета report_${job.id}.${job.format} загружен на ваше устройство!`);
    setTimeout(() => setDownloadToast(null), 3000);
  };

  const filteredJobs = jobs.filter((j) =>
    j.report_type.toLowerCase().includes(historySearch.toLowerCase()) ||
    j.format.toLowerCase().includes(historySearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {downloadToast && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <span className="flex items-center">
            <Check className="w-4 h-4 mr-2 text-emerald-600" />
            {downloadToast}
          </span>
          <button onClick={() => setDownloadToast(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Экспорт корпоративных отчетов</h1>
          <p className="text-xs text-slate-500 mt-1">
            Формирование сводных выгрузок в PDF, XLSX и CSV с безопасными ссылками скачивания
          </p>
        </div>
      </div>

      {/* Generator Card */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-2">1. Выберите тип отчета</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {reportTypes.map((t) => (
              <div
                key={t.title}
                onClick={() => setSelectedType(t.title)}
                className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                  selectedType === t.title
                    ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-medium ring-2 ring-indigo-100'
                    : 'border-slate-200 hover:border-slate-300 bg-slate-50/50'
                }`}
              >
                <div className="font-semibold text-slate-900">{t.title}</div>
                <div className="text-[11px] text-slate-500 mt-1">{t.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Format Selector */}
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-2">2. Формат документа</h3>
          <div className="flex space-x-3 text-xs">
            {(['xlsx', 'pdf', 'csv'] as const).map((fmt) => (
              <button
                key={fmt}
                onClick={() => setSelectedFormat(fmt)}
                className={`px-4 py-2 rounded-xl border font-bold uppercase transition-all flex items-center space-x-2 ${
                  selectedFormat === fmt
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                <FileDown className="w-4 h-4" />
                <span>{fmt}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Async Job Progress Bar */}
        {isGenerating && (
          <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 space-y-2 text-xs">
            <div className="flex justify-between font-semibold text-indigo-900">
              <span>Генерация отчета и расчет агрегаций...</span>
              <span>{progress}%</span>
            </div>
            <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
              <div className="bg-indigo-600 h-full transition-all duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        )}

        <div className="pt-2 flex justify-end">
          <Button
            variant="primary"
            disabled={isGenerating}
            onClick={handleGenerateReport}
          >
            <Download className="w-4 h-4 mr-1.5" />
            {isGenerating ? 'Формирование отчета...' : 'Сформировать отчет'}
          </Button>
        </div>
      </div>

      {/* Export History Table */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-slate-900">История сформированных отчетов</h3>
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск по названию или формату..."
              value={historySearch}
              onChange={(e) => setHistorySearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-300 text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <Table headers={['Отчет', 'Формат', 'Размер', 'Дата формирования', 'Статус', 'Скачать']}>
            {filteredJobs.map((job) => (
              <tr key={job.id} className="hover:bg-slate-50 text-xs text-slate-700 transition-colors">
                <td className="p-3 font-semibold text-slate-900">{job.report_type}</td>
                <td className="p-3 uppercase font-bold text-slate-600">{job.format}</td>
                <td className="p-3 text-slate-500">{job.file_size_mb} MB</td>
                <td className="p-3 text-slate-500">{job.created_at}</td>
                <td className="p-3">
                  <Badge variant="success">Готов</Badge>
                </td>
                <td className="p-3 text-right">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleDownloadFile(job)}
                  >
                    <Download className="w-3.5 h-3.5 mr-1" />
                    Скачать
                  </Button>
                </td>
              </tr>
            ))}
          </Table>
        </div>
      </div>
    </div>
  );
};
