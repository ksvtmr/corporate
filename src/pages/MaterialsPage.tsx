import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  ExternalLink,
  Sparkles,
  ChevronRight,
  Shield,
  Layers,
  RotateCcw,
  Tag,
  BookOpen,
  ArrowRight,
  Trash2,
  Split,
  Merge,
  Download
} from 'lucide-react';
import { Button, Card, Badge, Input, Modal, Tabs, FileUploader } from '@iclever/frontend-kit';

interface MaterialItem {
  id: string;
  title: string;
  category: string;
  format: 'pdf' | 'docx' | 'pptx' | 'video' | 'markdown';
  status: 'uploaded' | 'queued' | 'processing' | 'ready_for_review' | 'published' | 'failed';
  confidentiality: 'internal' | 'confidential' | 'strictly_confidential';
  access_level: 'public_within_organization' | 'restricted_by_department' | 'restricted_by_role' | 'admins_only';
  topics_count: number;
  ai_summary?: string;
  version: number;
  uploaded_by: string;
  uploaded_at: string;
  file_size_mb: number;
  topics: Array<{ id: string; name: string; priority: 'high' | 'medium' | 'low'; is_required: boolean }>;
}

const initialMaterials: MaterialItem[] = [
  {
    id: 'mat-001',
    title: 'Регламент информационной безопасности и работы с персональными данными 2026',
    category: 'Комплаенс и безопасность',
    format: 'pdf',
    status: 'published',
    confidentiality: 'confidential',
    access_level: 'public_within_organization',
    topics_count: 5,
    version: 2,
    uploaded_by: 'Алина Садыкова',
    uploaded_at: '2026-08-20',
    file_size_mb: 4.8,
    ai_summary: 'Ключевые политики парольной защиты, двухфакторной аутентификации, запрет пересылки клиентских баз во внешние мессенджеры и протоколы эскалации инцидентов.',
    topics: [
      { id: 'top-1', name: 'Парольная политика и 2FA', priority: 'high', is_required: true },
      { id: 'top-2', name: 'Работа с персональными данными (152-ФЗ / РК)', priority: 'high', is_required: true },
      { id: 'top-3', name: 'Предотвращение фишинга и социнженерии', priority: 'medium', is_required: true },
      { id: 'top-4', name: 'Порядок действий при утечке данных', priority: 'high', is_required: true },
      { id: 'top-5', name: 'Использование личных устройств (BYOD)', priority: 'low', is_required: false },
    ],
  },
  {
    id: 'mat-002',
    title: 'Архитектурный стандарт микросервисов Go и NATS JetStream',
    category: 'Разработка ПО',
    format: 'markdown',
    status: 'ready_for_review',
    confidentiality: 'internal',
    access_level: 'restricted_by_department',
    topics_count: 4,
    version: 1,
    uploaded_by: 'Виктор Ким',
    uploaded_at: '2026-08-28',
    file_size_mb: 1.2,
    ai_summary: 'Принципы чистой архитектуры (Clean Architecture), паттерны работы с распределенными транзакциями Outbox, идемпотентность консьюмеров NATS и стандарты метрик Prometheus.',
    topics: [
      { id: 'top-6', name: 'Clean Architecture и доменные границы', priority: 'high', is_required: true },
      { id: 'top-7', name: 'NATS JetStream: Publisher/Consumer', priority: 'high', is_required: true },
      { id: 'top-8', name: 'Transactional Outbox & Idempotency', priority: 'high', is_required: true },
      { id: 'top-9', name: 'Трассировка OpenTelemetry & логгирование', priority: 'medium', is_required: false },
    ],
  },
  {
    id: 'mat-003',
    title: 'Презентация продукта iClever Corporate для корпоративных продаж B2B',
    category: 'Продажи',
    format: 'pptx',
    status: 'processing',
    confidentiality: 'internal',
    access_level: 'restricted_by_role',
    topics_count: 3,
    version: 1,
    uploaded_by: 'Дарья Романова',
    uploaded_at: '2026-09-02',
    file_size_mb: 14.5,
    ai_summary: 'Идет извлечение семантических эмбеддингов, распознавание слайдов и генерация конспектов...',
    topics: [
      { id: 'top-10', name: 'Ценностное предложение платформы', priority: 'high', is_required: true },
      { id: 'top-11', name: 'Тарифные сетки и расчет ROI', priority: 'medium', is_required: false },
      { id: 'top-12', name: 'Обработка частых возражений безопасности', priority: 'high', is_required: true },
    ],
  },
  {
    id: 'mat-004',
    title: 'Видеозапись: Демонстрация конструктора тестов и RAG ассистента',
    category: 'Обучение',
    format: 'video',
    status: 'published',
    confidentiality: 'internal',
    access_level: 'public_within_organization',
    topics_count: 2,
    version: 1,
    uploaded_by: 'Елена Воронова',
    uploaded_at: '2026-08-15',
    file_size_mb: 240.0,
    ai_summary: 'Практический воркшоп для методистов по созданию тестовых вопросов с AI-генерацией и настройке прокторинга.',
    topics: [
      { id: 'top-13', name: 'Создание банка вопросов', priority: 'medium', is_required: false },
      { id: 'top-14', name: 'Настройка RAG промптов', priority: 'low', is_required: false },
    ],
  },
];

export const MaterialsPage: React.FC = () => {
  const [materials, setMaterials] = useState<MaterialItem[]>(initialMaterials);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState<'date_desc' | 'title_asc' | 'size_desc'>('date_desc');
  const [selectedMaterial, setSelectedMaterial] = useState<MaterialItem | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [downloadToast, setDownloadToast] = useState<string | null>(null);

  // New Upload Form State
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadCategory, setUploadCategory] = useState('Разработка ПО');
  const [uploadConfidentiality, setUploadConfidentiality] = useState<MaterialItem['confidentiality']>('internal');
  const [uploadAccess, setUploadAccess] = useState<MaterialItem['access_level']>('public_within_organization');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  const handleDownloadMaterial = (mat: MaterialItem) => {
    const content = `# ${mat.title}\n\n**Категория**: ${mat.category}\n**Конфиденциальность**: ${mat.confidentiality}\n**Версия**: v${mat.version}\n**Автор**: ${mat.uploaded_by} (${mat.uploaded_at})\n\n## Краткое содержание\n${mat.ai_summary || ''}\n\n## Ключевые разделы\n${mat.topics.map((t, idx) => `${idx + 1}. ${t.name} (Приоритет: ${t.priority}, ${t.is_required ? 'Обязательный' : 'Факультативный'})`).join('\n')}\n`;
    const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${mat.title.replace(/[^a-zA-Zа-яА-Я0-9_-]/g, '_').substring(0, 40)}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    setDownloadToast(`Файл «${mat.title.substring(0, 30)}...» успешно скачан!`);
    setTimeout(() => setDownloadToast(null), 3000);
  };

  // Filtered and sorted materials
  const filtered = materials
    .filter((m) => {
      const matchSearch = m.title.toLowerCase().includes(search.toLowerCase()) || m.category.toLowerCase().includes(search.toLowerCase());
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchCategory = categoryFilter === 'all' || m.category === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    })
    .sort((a, b) => {
      if (sortOrder === 'title_asc') return a.title.localeCompare(b.title, 'ru');
      if (sortOrder === 'size_desc') return b.file_size_mb - a.file_size_mb;
      return new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime();
    });

  const handleStartUpload = () => {
    if (!uploadTitle) return;
    setIsUploading(true);
    setUploadProgress(20);

    const timer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(timer);
          setIsUploading(false);
          setIsUploadModalOpen(false);

          const newMat: MaterialItem = {
            id: 'mat-' + Math.random().toString(36).substring(2, 7),
            title: uploadTitle,
            category: uploadCategory,
            format: (uploadedFile?.name.split('.').pop() as any) || 'pdf',
            status: 'ready_for_review',
            confidentiality: uploadConfidentiality,
            access_level: uploadAccess,
            topics_count: 3,
            version: 1,
            uploaded_by: 'Текущий методист',
            uploaded_at: new Date().toISOString().split('T')[0],
            file_size_mb: uploadedFile ? +(uploadedFile.size / (1024 * 1024)).toFixed(1) : 3.5,
            ai_summary: 'AI успешно распознал структуру документа, выделил ключевые темы и сгенерировал драфт конспекта.',
            topics: [
              { id: 'top-' + Math.random(), name: 'Вводные положения', priority: 'high', is_required: true },
              { id: 'top-' + Math.random(), name: 'Основной рабочий процесс', priority: 'high', is_required: true },
              { id: 'top-' + Math.random(), name: 'Контрольные чек-листы', priority: 'medium', is_required: false },
            ],
          };

          setMaterials([newMat, ...materials]);
          setSelectedMaterial(newMat);
          return 0;
        }
        return prev + 25;
      });
    }, 400);
  };

  const handlePublish = (id: string) => {
    setMaterials(materials.map((m) => (m.id === id ? { ...m, status: 'published' } : m)));
    if (selectedMaterial?.id === id) {
      setSelectedMaterial({ ...selectedMaterial, status: 'published' });
    }
  };

  const statusBadges: Record<MaterialItem['status'], { label: string; variant: 'success' | 'warning' | 'info' | 'danger' }> = {
    uploaded: { label: 'Загружен', variant: 'info' },
    queued: { label: 'В очереди', variant: 'warning' },
    processing: { label: 'AI Анализ...', variant: 'warning' },
    ready_for_review: { label: 'Готов к ревью', variant: 'info' },
    published: { label: 'Опубликован', variant: 'success' },
    failed: { label: 'Ошибка обработки', variant: 'danger' },
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">База знаний и учебные материалы</h1>
          <p className="text-xs text-slate-500 mt-1">
            Загрузка регламентов, извлечение топиков с помощью AI, версионирование и публикация
          </p>
        </div>
        <Button variant="primary" size="sm" onClick={() => setIsUploadModalOpen(true)}>
          <Upload className="w-4 h-4 mr-1.5" />
          Загрузить материал
        </Button>
      </div>

      {/* Pipeline Status Overview Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">{materials.length}</div>
            <div className="text-[11px] text-slate-500">Всего файлов</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-green-50 text-green-600">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {materials.filter((m) => m.status === 'published').length}
            </div>
            <div className="text-[11px] text-slate-500">Опубликовано</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
            <Clock className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {materials.filter((m) => m.status === 'ready_for_review').length}
            </div>
            <div className="text-[11px] text-slate-500">На согласовании</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {materials.filter((m) => m.status === 'processing').length}
            </div>
            <div className="text-[11px] text-slate-500">AI Обработка</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded-xl border border-slate-200 flex items-center space-x-3">
          <div className="p-2 rounded-lg bg-red-50 text-red-600">
            <AlertCircle className="w-4 h-4" />
          </div>
          <div>
            <div className="text-lg font-bold text-slate-900">
              {materials.filter((m) => m.status === 'failed').length}
            </div>
            <div className="text-[11px] text-slate-500">Ошибки</div>
          </div>
        </div>
      </div>

      {downloadToast && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center justify-between shadow-sm animate-fadeIn">
          <span>{downloadToast}</span>
          <button onClick={() => setDownloadToast(null)} className="text-emerald-700 hover:text-emerald-900">✕</button>
        </div>
      )}

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Поиск по названию регламента или категории..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto text-xs">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Все категории</option>
            <option value="Разработка ПО">Разработка ПО</option>
            <option value="Комплаенс и безопасность">Комплаенс и безопасность</option>
            <option value="Продажи">Продажи</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Все статусы</option>
            <option value="published">Опубликовано</option>
            <option value="ready_for_review">Готово к ревью</option>
            <option value="processing">В обработке AI</option>
          </select>

          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value as any)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="date_desc">Сортировка: Сначала новые</option>
            <option value="title_asc">По названию (А — Я)</option>
            <option value="size_desc">По размеру файла</option>
          </select>
        </div>
      </div>

      {/* Materials List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((mat) => {
          const badge = statusBadges[mat.status];
          return (
            <div
              key={mat.id}
              onClick={() => setSelectedMaterial(mat)}
              className={`bg-white rounded-xl border p-4 shadow-sm hover:shadow-md transition-all cursor-pointer flex flex-col justify-between ${
                selectedMaterial?.id === mat.id ? 'border-indigo-600 ring-2 ring-indigo-100' : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                    {mat.category}
                  </span>
                  <Badge variant={badge.variant}>{badge.label}</Badge>
                </div>
                <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-2">{mat.title}</h3>
                <p className="text-xs text-slate-500 line-clamp-2 mb-3">{mat.ai_summary}</p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-slate-600">{mat.format.toUpperCase()}</span>
                  <span>•</span>
                  <span>{mat.file_size_mb} MB</span>
                  <span>•</span>
                  <span>v{mat.version}</span>
                </div>
                <span className="text-indigo-600 font-medium flex items-center">
                  Детали <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Material Detail Modal / Drawer */}
      {selectedMaterial && (
        <Modal
          isOpen={!!selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
          title="Сведения о материале"
          size="lg"
        >
          <div className="space-y-5 text-xs text-slate-700">
            {/* Title & Status */}
            <div className="flex items-start justify-between gap-4 pb-3 border-b border-slate-100">
              <div>
                <span className="text-[10px] uppercase font-bold text-indigo-600 tracking-wider">
                  {selectedMaterial.category} • v{selectedMaterial.version}
                </span>
                <h2 className="text-base font-bold text-slate-900 mt-1">{selectedMaterial.title}</h2>
                <div className="flex items-center space-x-3 text-slate-400 mt-1">
                  <span>Загрузил: {selectedMaterial.uploaded_by}</span>
                  <span>•</span>
                  <span>Дата: {selectedMaterial.uploaded_at}</span>
                  <span>•</span>
                  <span>Размер: {selectedMaterial.file_size_mb} MB</span>
                </div>
              </div>
              <Badge variant={statusBadges[selectedMaterial.status].variant}>
                {statusBadges[selectedMaterial.status].label}
              </Badge>
            </div>

            {/* AI Summary Block */}
            <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl space-y-1.5">
              <div className="flex items-center text-indigo-900 font-semibold">
                <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
                AI-Конспект и семантический разбор
              </div>
              <p className="text-slate-700 leading-relaxed">{selectedMaterial.ai_summary}</p>
            </div>

            {/* Extracted Topics Editor */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-slate-900 flex items-center">
                  <Tag className="w-4 h-4 mr-1 text-slate-500" />
                  Извлеченные топики и разделы ({selectedMaterial.topics.length})
                </h4>
                <div className="flex items-center space-x-2">
                  <Button variant="secondary" size="sm">
                    <Merge className="w-3.5 h-3.5 mr-1" />
                    Объединить
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                {selectedMaterial.topics.map((t, idx) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between p-2.5 bg-slate-50 rounded-lg border border-slate-200"
                  >
                    <div className="flex items-center space-x-2.5">
                      <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold">
                        {idx + 1}
                      </span>
                      <span className="font-medium text-slate-800">{t.name}</span>
                      {t.is_required && <Badge variant="warning">Обязательный</Badge>}
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] text-slate-400 capitalize">Приоритет: {t.priority}</span>
                      <button className="text-slate-400 hover:text-red-600 p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Permissions & Actions Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-slate-500">
                <Shield className="w-4 h-4 text-slate-400" />
                <span>Доступ: <strong className="text-slate-700">Вся организация</strong></span>
              </div>

              <div className="flex items-center space-x-2">
                <Button variant="outline" onClick={() => handleDownloadMaterial(selectedMaterial)}>
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Скачать конспект
                </Button>
                <Button variant="secondary" onClick={() => setSelectedMaterial(null)}>Закрыть</Button>
                {selectedMaterial.status !== 'published' && (
                  <Button variant="primary" onClick={() => handlePublish(selectedMaterial.id)}>
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    Утвердить и опубликовать
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <Modal
          isOpen={isUploadModalOpen}
          onClose={() => !isUploading && setIsUploadModalOpen(false)}
          title="Загрузка учебного регламента"
          size="md"
        >
          <div className="space-y-4 text-xs py-2">
            <Input
              label="Название материала / регламента"
              value={uploadTitle}
              onChange={(e) => setUploadTitle(e.target.value)}
              placeholder="Например: Стандарт онбординга инженеров 2026"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Категория</label>
                <select
                  value={uploadCategory}
                  onChange={(e) => setUploadCategory(e.target.value)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="Разработка ПО">Разработка ПО</option>
                  <option value="Комплаенс и безопасность">Комплаенс и безопасность</option>
                  <option value="Продажи и клиентский сервис">Продажи и клиентский сервис</option>
                  <option value="People & HR">People & HR</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Конфиденциальность</label>
                <select
                  value={uploadConfidentiality}
                  onChange={(e) => setUploadConfidentiality(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs bg-white"
                >
                  <option value="internal">Внутренний документ (Internal)</option>
                  <option value="confidential">Конфиденциально (Confidential)</option>
                  <option value="strictly_confidential">Строго конфиденциально</option>
                </select>
              </div>
            </div>

            <FileUploader
              onFileSelected={(file) => {
                setUploadedFile(file);
                if (!uploadTitle) setUploadTitle(file.name.replace(/\.[^/.]+$/, ''));
              }}
              isProcessing={isUploading}
            />

            {isUploading && (
              <div className="space-y-1.5 p-3 bg-indigo-50 rounded-xl border border-indigo-100">
                <div className="flex justify-between text-indigo-900 font-semibold text-[11px]">
                  <span>AI Извлечение структуры и эмбеддингов...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-indigo-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-indigo-600 h-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            <div className="pt-2 flex justify-end space-x-2">
              <Button variant="secondary" disabled={isUploading} onClick={() => setIsUploadModalOpen(false)}>
                Отмена
              </Button>
              <Button variant="primary" disabled={isUploading || !uploadTitle} onClick={handleStartUpload}>
                {isUploading ? 'Обработка...' : 'Запустить AI-анализ'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
