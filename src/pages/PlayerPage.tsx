import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  CheckCircle2,
  Clock,
  Award,
  ChevronLeft,
  ChevronRight,
  BookOpen,
  HelpCircle,
  Video,
  FileText,
  AlertCircle,
  Save,
  RotateCcw,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Button, Card, Badge, Modal } from '@iclever/frontend-kit';

export const PlayerPage: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState<'track' | 'test' | 'results'>('track');
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [isVideoPlaying, setIsVideoPlaying] = useState(false);
  const [isCourseCompleteModalOpen, setIsCourseCompleteModalOpen] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('view') === 'test') {
      setActiveView('test');
    }
  }, [location.search]);

  // Test mode state
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [openAnswer, setOpenAnswer] = useState('');
  const [timeLeft, setTimeLeft] = useState(1200); // 20 minutes
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState(false);
  const [isEvaluating, setIsEvaluating] = useState(false);

  // Timer simulation
  useEffect(() => {
    if (activeView === 'test' && timeLeft > 0) {
      const timer = setInterval(() => setTimeLeft((t) => t - 1), 1000);
      return () => clearInterval(timer);
    }
  }, [activeView, timeLeft]);

  const blocks = [
    {
      id: 'blk-1',
      title: '1. Регламент чистой архитектуры Go сервисов',
      type: 'material',
      content: 'Чистая архитектура (Clean Architecture) предполагает строгое разделение ответственности по слоям: Domain, Use Case (Business Logic), Repository/Adapter (Storage) и Transport (HTTP/gRPC/NATS). Внутренние слои не должны зависеть от внешних библиотек и СУБД.',
    },
    {
      id: 'blk-2',
      title: '2. Видеоматериал: Transactional Outbox & NATS',
      type: 'video',
      content: 'Практическая видео-лекция по созданию отказоустойчивой отправки событий в очередь через outbox-таблицу в единой ACID транзакции с бизнес-данными.',
    },
    {
      id: 'blk-3',
      title: '3. Контрольное тестирование по стандартам платформы',
      type: 'test',
      content: 'Контрольный тест из 3 вопросов с ограничением по времени и автосохранением ответов.',
    },
    {
      id: 'blk-4',
      title: '4. Подтверждение ознакомления с политиками ИБ',
      type: 'acknowledgment',
      content: 'Я подтверждаю, что ознакомился с регламентом разработки и политиками безопасности, обязуюсь следовать стандартам чистого кода и защищать конфиденциальные данные компании.',
    },
  ];

  const testQuestions = [
    {
      id: 1,
      text: 'В каком слое Clean Architecture располагается определение интерфейсов репозиториев?',
      options: ['В слое Use Case (или Domain)', 'В слое Transport / HTTP', 'В файле main.go', 'В инфраструктурном драйвере'],
      correct: 0,
    },
    {
      id: 2,
      text: 'Какую проблему гарантированно решает Transactional Outbox паттерн?',
      options: ['Атомарность сохранения в БД и отправки в шину сообщений без дублирования', 'Увеличение скорости работы HTTP запросов', 'Кэширование сессий пользователей в браузере'],
      correct: 0,
    },
    {
      id: 3,
      text: 'Развернутый ответ: почему доменный слой не должен импортировать SQL драйверы или ORM структуры?',
      isOpen: true,
    },
  ];

  const handleSelectOption = (optIndex: number) => {
    setAnswers({ ...answers, [currentQuestionIndex]: String(optIndex) });
  };

  const handleSubmitTest = () => {
    setIsSubmitModalOpen(false);
    setIsEvaluating(true);
    setActiveView('results');
    setTimeout(() => {
      setIsEvaluating(false);
    }, 1500);
  };

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;

  return (
    <div className="space-y-6">
      {/* View Switcher Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">
            Учебный плеер сотрудника • Онбординг Go Backend разработчика
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-1">
            {activeView === 'track' ? 'Прохождение учебной программы' : activeView === 'test' ? 'Контрольное тестирование' : 'Результаты аттестации'}
          </h1>
        </div>

        {activeView === 'test' && (
          <div className="flex items-center space-x-2 px-3.5 py-1.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-800 text-xs font-semibold">
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
            <span>Осталось времени: {minutes}:{seconds < 10 ? '0' : ''}{seconds}</span>
          </div>
        )}
      </div>

      {/* TRACK PLAYER VIEW */}
      {activeView === 'track' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Blocks navigation sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Блоки программы</h4>
            {blocks.map((blk, i) => (
              <div
                key={blk.id}
                onClick={() => setCurrentBlockIndex(i)}
                className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                  currentBlockIndex === i
                    ? 'bg-indigo-50 border-indigo-600 text-indigo-900 font-semibold shadow-sm'
                    : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-bold text-slate-600">
                    {i + 1}
                  </span>
                  <span className="truncate">{blk.title}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Block content area */}
          <div className="lg:col-span-3 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-6">
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Блок {currentBlockIndex + 1} из {blocks.length}
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-1">{blocks[currentBlockIndex].title}</h2>
            </div>

            {/* Block Type Renderers */}
            {blocks[currentBlockIndex].type === 'material' && (
              <div className="prose prose-sm max-w-none text-slate-700 text-sm leading-relaxed p-4 bg-slate-50 rounded-xl border border-slate-200">
                <p>{blocks[currentBlockIndex].content}</p>
                <div className="mt-4 p-3 bg-white rounded-lg border border-slate-200 text-xs">
                  <strong>Ключевой вывод:</strong> Бизнес-правила домена должны быть протестированы юнит-тестами без поднятия базы данных и внешних сетевых соединений.
                </div>
              </div>
            )}

            {blocks[currentBlockIndex].type === 'video' && (
              <div className="space-y-3">
                <div className="aspect-video bg-slate-900 rounded-xl flex flex-col items-center justify-center text-white space-y-3 p-6 relative overflow-hidden group">
                  <div
                    onClick={() => setIsVideoPlaying(!isVideoPlaying)}
                    className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer z-10"
                  >
                    {isVideoPlaying ? <Pause className="w-6 h-6 text-white" /> : <Play className="w-6 h-6 text-white ml-1" />}
                  </div>
                  <span className="text-xs text-slate-300 z-10">
                    {isVideoPlaying ? '▶ Воспроизведение видео-лекции: Transactional Outbox & NATS' : 'Видеоматериал платформы iClever (18:40)'}
                  </span>
                  {isVideoPlaying && (
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-700">
                      <div className="h-full bg-indigo-500 animate-pulse" style={{ width: '65%' }} />
                    </div>
                  )}
                </div>
                <p className="text-xs text-slate-500">{blocks[currentBlockIndex].content}</p>
              </div>
            )}

            {blocks[currentBlockIndex].type === 'test' && (
              <div className="p-5 bg-indigo-50/70 border border-indigo-200 rounded-xl space-y-4">
                <div className="flex items-center space-x-3">
                  <div className="p-3 bg-indigo-600 rounded-xl text-white">
                    <Award className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-indigo-950">Готовы пройти контрольное тестирование?</h3>
                    <p className="text-xs text-indigo-700">3 вопроса, 20 минут, проходной балл 80%</p>
                  </div>
                </div>
                <Button variant="primary" onClick={() => setActiveView('test')}>
                  Начать тестирование сейчас
                  <ArrowRight className="w-4 h-4 ml-1.5" />
                </Button>
              </div>
            )}

            {blocks[currentBlockIndex].type === 'acknowledgment' && (
              <div className="space-y-4 p-5 bg-slate-50 border border-slate-200 rounded-xl">
                <p className="text-xs text-slate-700 leading-relaxed">{blocks[currentBlockIndex].content}</p>
                <div className="flex items-center space-x-2 pt-2">
                  <input
                    type="checkbox"
                    id="ack"
                    checked={acknowledged}
                    onChange={(e) => setAcknowledged(e.target.checked)}
                    className="rounded text-indigo-600 focus:ring-indigo-500 h-4 w-4"
                  />
                  <label htmlFor="ack" className="text-xs font-semibold text-slate-900 cursor-pointer">
                    С регламентом ознакомлен(а) и согласен(на)
                  </label>
                </div>
              </div>
            )}

            {/* Bottom block navigation */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <Button
                variant="secondary"
                disabled={currentBlockIndex === 0}
                onClick={() => setCurrentBlockIndex(currentBlockIndex - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Назад
              </Button>
              {currentBlockIndex < blocks.length - 1 ? (
                <Button
                  variant="primary"
                  onClick={() => setCurrentBlockIndex(currentBlockIndex + 1)}
                >
                  Далее
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              ) : (
                <Button
                  variant="primary"
                  disabled={!acknowledged}
                  onClick={() => setIsCourseCompleteModalOpen(true)}
                >
                  Завершить курс
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TEST TAKING VIEW */}
      {activeView === 'test' && (
        <div className="max-w-3xl mx-auto space-y-6 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          {/* Question Navigator Dots */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 text-xs">
            <span className="font-semibold text-slate-700">Вопрос {currentQuestionIndex + 1} из {testQuestions.length}</span>
            <div className="flex space-x-1.5">
              {testQuestions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentQuestionIndex(i)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition-all ${
                    currentQuestionIndex === i
                      ? 'bg-indigo-600 text-white shadow'
                      : answers[i] || (i === 2 && openAnswer)
                      ? 'bg-green-100 text-green-800 border border-green-300'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </div>

          {/* Question Text */}
          <div className="space-y-4">
            <h3 className="text-base font-bold text-slate-900">{testQuestions[currentQuestionIndex].text}</h3>

            {testQuestions[currentQuestionIndex].options ? (
              <div className="space-y-2">
                {testQuestions[currentQuestionIndex].options?.map((opt, optIdx) => {
                  const isSelected = answers[currentQuestionIndex] === String(optIdx);
                  return (
                    <div
                      key={optIdx}
                      onClick={() => handleSelectOption(optIdx)}
                      className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all flex items-center space-x-3 ${
                        isSelected
                          ? 'border-indigo-600 bg-indigo-50/70 text-indigo-950 font-medium'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50'
                      }`}
                    >
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-[10px] font-bold ${
                        isSelected ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-slate-600'
                      }`}>
                        {String.fromCharCode(65 + optIdx)}
                      </span>
                      <span>{opt}</span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="space-y-2">
                <textarea
                  rows={4}
                  value={openAnswer}
                  onChange={(e) => setOpenAnswer(e.target.value)}
                  placeholder="Введите ваш развернутый ответ для проверки AI и методистом..."
                  className="w-full rounded-xl border border-slate-300 p-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <span className="text-[11px] text-slate-400">
                  Ответ будет проанализирован семантической моделью и передан куратору.
                </span>
              </div>
            )}
          </div>

          {/* Footer actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="secondary"
              disabled={currentQuestionIndex === 0}
              onClick={() => setCurrentQuestionIndex(currentQuestionIndex - 1)}
            >
              Предыдущий
            </Button>

            {currentQuestionIndex < testQuestions.length - 1 ? (
              <Button
                variant="primary"
                onClick={() => setCurrentQuestionIndex(currentQuestionIndex + 1)}
              >
                Следующий
              </Button>
            ) : (
              <Button variant="primary" onClick={() => setIsSubmitModalOpen(true)}>
                Завершить тест
              </Button>
            )}
          </div>
        </div>
      )}

      {/* RESULTS VIEW */}
      {activeView === 'results' && (
        <div className="max-w-2xl mx-auto space-y-6 bg-white p-8 rounded-2xl border border-slate-200 shadow-sm text-center">
          {isEvaluating ? (
            <div className="py-12 space-y-4">
              <span className="inline-block animate-spin h-10 w-10 border-4 border-indigo-600 border-t-transparent rounded-full" />
              <h3 className="text-base font-bold text-slate-900">AI оценивает ваш развернутый ответ...</h3>
              <p className="text-xs text-slate-500">Сверка критериев, извлечение ключевых понятий и расчет баллов</p>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto shadow-sm">
                <Award className="w-8 h-8" />
              </div>

              <div>
                <Badge variant="success">Тестирование успешно сдано</Badge>
                <h2 className="text-2xl font-black text-slate-900 mt-2">92% из 100%</h2>
                <p className="text-xs text-slate-500 mt-1">Порог сдачи: 80% • Пройдено за 14 минут</p>
              </div>

              {/* Topic Breakdown */}
              <div className="text-left space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <h4 className="font-bold text-slate-900">Разбивка по темам:</h4>
                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Clean Architecture в Go</span>
                    <span className="font-semibold text-green-600">100% (Отлично)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>NATS JetStream & Outbox паттерн</span>
                    <span className="font-semibold text-green-600">100% (Отлично)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-green-500 h-full" style={{ width: '100%' }} />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-slate-600 mb-1">
                    <span>Развернутый кейс (AI Оценка)</span>
                    <span className="font-semibold text-indigo-600">18 / 20 баллов (90%)</span>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div className="bg-indigo-600 h-full" style={{ width: '90%' }} />
                  </div>
                </div>
              </div>

              <div className="pt-2 flex justify-center space-x-3">
                <Button variant="secondary" onClick={() => setActiveView('track')}>
                  Вернуться к программе
                </Button>
                <Button variant="primary" onClick={() => navigate('/corporate/dashboard')}>
                  В личный кабинет
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Confirm Submit Modal */}
      {isSubmitModalOpen && (
        <Modal
          isOpen={isSubmitModalOpen}
          onClose={() => setIsSubmitModalOpen(false)}
          title="Завершение тестирования"
          size="sm"
        >
          <div className="space-y-3 text-xs py-2 text-slate-700">
            <p>Вы ответили на все вопросы. Желаете отправить тест на итоговую проверку?</p>
            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="secondary" onClick={() => setIsSubmitModalOpen(false)}>Отмена</Button>
              <Button variant="primary" onClick={handleSubmitTest}>Отправить на проверку</Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Course Complete Celebration Modal */}
      {isCourseCompleteModalOpen && (
        <Modal
          isOpen={isCourseCompleteModalOpen}
          onClose={() => setIsCourseCompleteModalOpen(false)}
          title="Поздравляем с завершением курса!"
          size="sm"
        >
          <div className="space-y-4 text-xs py-2 text-slate-700 text-center">
            <div className="w-12 h-12 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <p className="font-semibold text-slate-900">
              Вы успешно завершили все обязательные блоки программы «Онбординг Go Backend разработчика 2026».
            </p>
            <p className="text-[11px] text-slate-500">
              Ваш результат и отметка о прохождении автоматически зафиксированы в корпоративном журнале аттестаций.
            </p>
            <div className="flex justify-center space-x-2 pt-2">
              <Button variant="secondary" onClick={() => setIsCourseCompleteModalOpen(false)}>Закрыть</Button>
              <Button variant="primary" onClick={() => navigate('/corporate/dashboard')}>В дашборд</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
