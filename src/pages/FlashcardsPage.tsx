import React, { useState } from 'react';
import {
  BookOpen,
  RotateCw,
  CheckCircle2,
  XCircle,
  Clock,
  Sparkles,
  ChevronRight,
  RotateCcw,
  Plus,
  Shuffle,
  Filter
} from 'lucide-react';
import { Button, Card, Badge, Modal, Input } from '@iclever/frontend-kit';

interface Flashcard {
  id: string;
  front: string;
  back: string;
  topic: string;
  next_review: string;
  repetitions: number;
}

const initialCards: Flashcard[] = [
  {
    id: 'fc-1',
    topic: 'Архитектура Go',
    front: 'Что такое Transactional Outbox?',
    back: 'Шаблон проектирования, при котором исходящие сообщения сохраняются в специальную таблицу БД внутри той же ACID-транзакции, что и бизнес-данные, а отдельный процесс ретранслирует их в шину.',
    next_review: 'Сегодня',
    repetitions: 3,
  },
  {
    id: 'fc-2',
    topic: 'Информационная безопасность',
    front: 'В чем ключевое отличие 2FA от MFA?',
    back: '2FA использует ровно два независимых фактора проверки (например, пароль + TOTP), тогда как MFA может включать три и более (биометрия, геолокация, смарт-карты).',
    next_review: 'Завтра',
    repetitions: 5,
  },
  {
    id: 'fc-3',
    topic: 'Инженерия',
    front: 'Какова цель идемпотентного консьюмера в NATS?',
    back: 'Гарантировать, что повторная обработка одного и того же события при сбоях сети не приведет к дублированию побочных эффектов в базе данных.',
    next_review: 'Через 3 дня',
    repetitions: 1,
  },
  {
    id: 'fc-4',
    topic: 'Архитектура Go',
    front: 'Почему доменный слой не должен зависеть от ORM и SQL драйверов?',
    back: 'Для обеспечения чистоты бизнес-правил, независимости от инфраструктуры и возможности изолированного модульного тестирования без поднятия СУБД.',
    next_review: 'Сегодня',
    repetitions: 2,
  },
  {
    id: 'fc-5',
    topic: 'Информационная безопасность',
    front: 'Что делать сотруднику при подозрении на фишинговое письмо?',
    back: 'Не переходить по ссылкам, не открывать вложения, немедленно нажать кнопку «Сообщить о фишинге» и оповестить дежурного инженера ИБ.',
    next_review: 'Сегодня',
    repetitions: 4,
  },
];

export const FlashcardsPage: React.FC = () => {
  const [cards, setCards] = useState<Flashcard[]>(initialCards);
  const [selectedTopic, setSelectedTopic] = useState('all');
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [completed, setCompleted] = useState(false);

  // New Card Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTopic, setNewTopic] = useState('Архитектура Go');
  const [newFront, setNewFront] = useState('');
  const [newBack, setNewBack] = useState('');

  const filteredCards = cards.filter((c) => selectedTopic === 'all' || c.topic === selectedTopic);
  const currentCard = filteredCards[currentIndex] || filteredCards[0];

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < filteredCards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setIsFlipped(false);
    setCompleted(false);
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    handleRestart();
  };

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFront.trim() || !newBack.trim()) return;

    const card: Flashcard = {
      id: 'fc-' + Date.now(),
      topic: newTopic,
      front: newFront.trim(),
      back: newBack.trim(),
      next_review: 'Сегодня',
      repetitions: 0,
    };

    setCards([card, ...cards]);
    setIsCreateModalOpen(false);
    setNewFront('');
    setNewBack('');
    handleRestart();
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Интервальное повторение (Flashcards)</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Закрепление регламентов, терминов и стандартов с алгоритмом интервальных повторений
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <Button variant="outline" size="sm" onClick={handleShuffle} title="Перемешать порядок карточек">
            <Shuffle className="w-3.5 h-3.5 mr-1" />
            Перемешать
          </Button>
          <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1" />
            Добавить
          </Button>
        </div>
      </div>

      {/* Filter and stats controls */}
      <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center space-x-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-500 font-medium">Тема:</span>
          <select
            value={selectedTopic}
            onChange={(e) => {
              setSelectedTopic(e.target.value);
              setCurrentIndex(0);
              setIsFlipped(false);
              setCompleted(false);
            }}
            className="rounded-lg border border-slate-300 bg-white px-2 py-1 text-xs text-slate-700 font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value="all">Все темы ({cards.length})</option>
            <option value="Архитектура Go">Архитектура Go</option>
            <option value="Информационная безопасность">Информационная безопасность</option>
            <option value="Инженерия">Инженерия</option>
          </select>
        </div>

        <div className="text-slate-500">
          Карточек в колоде: <strong className="text-indigo-600">{filteredCards.length}</strong>
        </div>
      </div>

      {!completed && currentCard ? (
        <div className="space-y-6">
          {/* Progress bar */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Карточка {currentIndex + 1} из {filteredCards.length}</span>
            <span className="font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {currentCard.topic}
            </span>
          </div>
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full transition-all duration-300"
              style={{ width: `${((currentIndex + 1) / filteredCards.length) * 100}%` }}
            />
          </div>

          {/* Interactive Card with smooth flip */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="min-h-[280px] bg-white rounded-2xl border border-slate-200 shadow-md p-8 flex flex-col justify-between cursor-pointer hover:border-indigo-400 hover:shadow-lg transition-all text-center select-none group"
          >
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Повторений: {currentCard.repetitions}</span>
              <span className="flex items-center text-indigo-600 font-medium group-hover:underline">
                <RotateCw className="w-3.5 h-3.5 mr-1" />
                Нажмите для переворота
              </span>
            </div>

            <div className="py-6">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-3">
                {isFlipped ? 'ОТВЕТ / РЕГЛАМЕНТ' : 'ВОПРОС ДЛЯ ПОВТОРЕНИЯ'}
              </span>
              <p className={`font-semibold leading-relaxed transition-colors ${isFlipped ? 'text-sm text-indigo-950 bg-indigo-50/50 p-4 rounded-xl border border-indigo-100' : 'text-base text-slate-900'}`}>
                {isFlipped ? currentCard.back : currentCard.front}
              </p>
            </div>

            <div className="text-[11px] text-slate-400 flex items-center justify-center space-x-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Следующее повторение: <strong className="text-slate-600">{currentCard.next_review}</strong></span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-center space-x-4">
            <Button
              variant="outline"
              className="w-40 border-red-200 text-red-700 hover:bg-red-50"
              onClick={handleNext}
            >
              <XCircle className="w-4 h-4 mr-1.5 text-red-500" />
              Повторить снова
            </Button>
            <Button
              variant="primary"
              className="w-40 bg-emerald-600 hover:bg-emerald-700"
              onClick={handleNext}
            >
              <CheckCircle2 className="w-4 h-4 mr-1.5" />
              Знаю ответ
            </Button>
          </div>
        </div>
      ) : (
        <div className="p-8 bg-white rounded-2xl border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-14 h-14 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-slate-900">Колода успешно пройдена!</h2>
          <p className="text-xs text-slate-500">Все выбранные карточки интервального повторения на сегодня изучены.</p>
          <div className="pt-2 flex justify-center space-x-2">
            <Button variant="secondary" onClick={handleRestart}>
              <RotateCcw className="w-4 h-4 mr-1.5" />
              Пройти снова
            </Button>
            <Button variant="primary" onClick={handleShuffle}>
              <Shuffle className="w-4 h-4 mr-1.5" />
              Перемешать и повторить
            </Button>
          </div>
        </div>
      )}

      {/* Modal: Create Card */}
      {isCreateModalOpen && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Новая карточка Flashcards"
          subtitle="Создайте термин или правило для интервального повторения"
        >
          <form onSubmit={handleCreateCard} className="space-y-4 py-2 text-xs">
            <div>
              <label className="block text-slate-700 font-medium mb-1">Тема / Раздел</label>
              <select
                value={newTopic}
                onChange={(e) => setNewTopic(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs"
              >
                <option value="Архитектура Go">Архитектура Go</option>
                <option value="Информационная безопасность">Информационная безопасность</option>
                <option value="Инженерия">Инженерия</option>
                <option value="Общие регламенты">Общие регламенты</option>
              </select>
            </div>

            <Input
              label="Вопрос или термин (Лицевая сторона)"
              placeholder="Например: Что такое Outbox паттерн?"
              value={newFront}
              onChange={(e) => setNewFront(e.target.value)}
              required
            />

            <div>
              <label className="block text-slate-700 font-medium mb-1">Правильный ответ / Определение (Оборот)</label>
              <textarea
                rows={3}
                placeholder="Например: Паттерн надежной доставки сообщений..."
                value={newBack}
                onChange={(e) => setNewBack(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:ring-2 focus:ring-indigo-500"
                required
              />
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button variant="secondary" type="button" onClick={() => setIsCreateModalOpen(false)}>Отмена</Button>
              <Button variant="primary" type="submit">Создать карточку</Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};
