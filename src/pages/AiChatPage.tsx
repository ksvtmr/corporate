import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Sparkles,
  BookOpen,
  Trash2,
  ExternalLink,
  Bot,
  User,
  AlertCircle,
  Layers,
  ChevronDown,
  Copy,
  Check
} from 'lucide-react';
import { Button, Card, Badge } from '@iclever/frontend-kit';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  citations?: Array<{ title: string; section: string; snippet: string }>;
  not_enough_context?: boolean;
}

const initialMessages: ChatMessage[] = [
  {
    id: 'msg-1',
    sender: 'ai',
    text: 'Здравствуйте! Я ваш корпоративный ассистент по базе знаний iClever. Задайте любой вопрос по регламентам, стандартам разработки или политике безопасности.',
  },
  {
    id: 'msg-2',
    sender: 'user',
    text: 'Как правильно настроить консьюмер NATS JetStream для идемпотентной обработки событий?',
  },
  {
    id: 'msg-3',
    sender: 'ai',
    text: 'Для обеспечения идемпотентной обработки событий в архитектуре iClever рекомендуется использовать связку Transactional Outbox + дедупликацию по уникальному Event ID.\n\nКаждое сообщение сохраняется в таблице `processed_events` внутри единой транзакции с изменениями бизнес-сущности. Если событие уже обработано, консьюмер возвращает ACK без повторного выполнения бизнес-логики.',
    citations: [
      {
        title: 'Архитектурный стандарт микросервисов Go',
        section: '§4.2 Transactional Outbox & NATS',
        snippet: 'Таблица processed_events хранит id сообщения и timestamp для исключения повторного применения событий.',
      },
    ],
  },
];

export const AiChatPage: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [inputText, setInputText] = useState('');
  const [contextScope, setContextScope] = useState('all');
  const [isTyping, setIsTyping] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  const sampleQuestions = [
    'Как устроен Transactional Outbox?',
    'Политика паролей и 2FA в компании',
    'Стандарты Clean Architecture в сервисах Go',
    'Порядок действий при обнаружении инцидента ИБ',
  ];

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const sendMessageWithText = (textToSend: string) => {
    if (!textToSend.trim()) return;

    const userMsg: ChatMessage = {
      id: 'm-' + Date.now(),
      sender: 'user',
      text: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsTyping(true);

    setTimeout(() => {
      setIsTyping(false);
      const query = textToSend.toLowerCase();
      if (query.includes('кофе') || query.includes('погода')) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'ai-' + Date.now(),
            sender: 'ai',
            text: 'В корпоративной базе знаний недостаточно контекста для ответа на этот бытовой запрос. Пожалуйста, задайте вопрос по регламентам, учебным трекам или стандартам компании.',
            not_enough_context: true,
          },
        ]);
      } else if (query.includes('outbox') || query.includes('nats')) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'ai-' + Date.now(),
            sender: 'ai',
            text: 'Паттерн Transactional Outbox решает проблему атомарности: изменения доменных данных и событие для NATS JetStream сохраняются в одной транзакции PostgreSQL в таблицу outbox_events. Отдельный воркер считывает новые записи и публикует их в шину с подтверждением ACK.',
            citations: [
              {
                title: 'Архитектурный стандарт микросервисов Go',
                section: '§4.2 Transactional Outbox',
                snippet: 'Атомарность БД и шины достигается записью в локальную outbox-таблицу.',
              },
            ],
          },
        ]);
      } else if (query.includes('парол') || query.includes('2fa') || query.includes('безопасн')) {
        setMessages((prev) => [
          ...prev,
          {
            id: 'ai-' + Date.now(),
            sender: 'ai',
            text: 'По регламенту информационной безопасности 2026: минимальная длина пароля — 12 символов. Для всех корпоративных учетных записей обязательна двухфакторная аутентификация (TOTP/MFA). Запрещено использовать одинаковые пароли во внешних сервисах.',
            citations: [
              {
                title: 'Регламент информационной безопасности 2026',
                section: '§2.1 Парольная политика и MFA',
                snippet: 'Обязательное использование TOTP аутентификатора и смена паролей каждые 90 дней.',
              },
            ],
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            id: 'ai-' + Date.now(),
            sender: 'ai',
            text: `По регламенту компании касательно «${textToSend}»: все ключевые требования зафиксированы во внутренних стандартах разработки и комплаенса. Рекомендуется свериться с профильным разделом базы знаний или обратиться к куратору направления.`,
            citations: [
              {
                title: 'Корпоративная база знаний iClever',
                section: 'Раздел общей документации',
                snippet: 'Актуальные инструкции утверждаются HR-лидом и CISO организации.',
              },
            ],
          },
        ]);
      }
    }, 900);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessageWithText(inputText);
  };

  const handleCopySnippet = (snippet: string, citationKey: string) => {
    navigator.clipboard.writeText(snippet);
    setCopiedId(citationKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearHistory = () => {
    setMessages([
      {
        id: 'msg-start',
        sender: 'ai',
        text: 'История диалога очищена. Чем я могу помочь по регламентам компании?',
      },
    ]);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top Header & Context Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">Корпоративный RAG AI-Ассистент</h1>
            <p className="text-[11px] text-slate-500">Поиск ответов со ссылками на первоисточники в регламентах</p>
          </div>
        </div>

        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Область контекста:</span>
          <select
            value={contextScope}
            onChange={(e) => setContextScope(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
          >
            <option value="all">Вся база знаний компании</option>
            <option value="dev">Регламенты разработки Go</option>
            <option value="security">Информационная безопасность</option>
            <option value="sales">B2B Продажи</option>
          </select>
          <Button variant="ghost" size="sm" onClick={handleClearHistory} title="Очистить диалог">
            <Trash2 className="w-4 h-4 text-slate-400 hover:text-red-600" />
          </Button>
        </div>
      </div>

      {/* Suggested chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-400 text-[11px] font-medium">Частые вопросы:</span>
        {sampleQuestions.map((q, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => sendMessageWithText(q)}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 transition text-[11px] font-medium"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Chat Messages Log */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 min-h-[440px] max-h-[560px] overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex items-start space-x-3 ${msg.sender === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-700'
              }`}
            >
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-indigo-600" />}
            </div>

            <div
              className={`p-4 rounded-2xl max-w-xl text-xs leading-relaxed space-y-2.5 ${
                msg.sender === 'user'
                  ? 'bg-indigo-600 text-white'
                  : msg.not_enough_context
                  ? 'bg-amber-50 border border-amber-200 text-amber-900'
                  : 'bg-slate-50 border border-slate-200 text-slate-800'
              }`}
            >
              <p className="whitespace-pre-line">{msg.text}</p>

              {/* Citations block */}
              {msg.citations && (
                <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center">
                    <BookOpen className="w-3.5 h-3.5 mr-1" /> Источники цитат:
                  </div>
                  {msg.citations.map((c, i) => {
                    const cKey = `${msg.id}-${i}`;
                    return (
                      <div key={i} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                        <div className="font-semibold text-slate-900 flex items-center justify-between">
                          <span>{c.title} • {c.section}</span>
                          <button
                            type="button"
                            onClick={() => handleCopySnippet(c.snippet, cKey)}
                            className="text-slate-400 hover:text-indigo-600 p-0.5 transition"
                            title="Скопировать цитату"
                          >
                            {copiedId === cKey ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <p className="italic text-slate-500">«{c.snippet}»</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center space-x-2 text-xs text-slate-400 p-2">
            <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-indigo-600 border-t-transparent rounded-full" />
            <span>AI ищет фрагменты в базе знаний и генерирует ответ...</span>
          </div>
        )}

        <div ref={chatBottomRef} />
      </div>

      {/* Input Form */}
      <form onSubmit={handleSendMessage} className="flex items-center space-x-2">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Спросите AI по регламентам, стандартам разработки, дедлайнам..."
          className="flex-1 bg-white rounded-xl border border-slate-300 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
        />
        <Button type="submit" variant="primary" disabled={!inputText.trim()}>
          <Send className="w-4 h-4 mr-1.5" />
          Отправить
        </Button>
      </form>
    </div>
  );
};
