import React, { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, BookOpen, Trash2, Bot, User, Copy, Check } from 'lucide-react';
import { api, Button, ConfirmDialog, ErrorState, LOCALE_LABELS, Locale, normalizeLocale, useApiErrorMessage, useI18n, ApiError } from '@iclever/frontend-kit';

interface Citation {
  source_id: string;
  title: string;
  section: string;
  snippet: string;
}

interface AssistantAnswer {
  id: string;
  locale: Locale;
  answer: string;
  citations: Citation[];
  not_enough_context: boolean;
  blocked?: boolean;
}

type ChatMessage =
  | { id: string; sender: 'user'; text: string }
  | { id: string; sender: 'ai'; text: string; locale: Locale; citations: Citation[]; notEnoughContext: boolean };

const SCOPES = ['all', 'dev', 'security', 'sales'] as const;
const SAMPLE_KEYS = ['outbox', 'passwords', 'cleanArch', 'incident'] as const;
const MAX_LENGTH = 2000;

/** Guards against malformed AI output: the UI only renders a validated structure. */
function parseAnswer(value: unknown): AssistantAnswer | null {
  const v = value as AssistantAnswer;
  if (!v || typeof v.answer !== 'string' || !v.answer.trim() || !Array.isArray(v.citations) || typeof v.not_enough_context !== 'boolean') return null;
  const locale = normalizeLocale(v.locale);
  if (!locale) return null;
  const citations = v.citations.filter((c) => c && typeof c.title === 'string' && typeof c.snippet === 'string').slice(0, 5);
  return { ...v, locale, citations };
}

export const AiChatPage: React.FC = () => {
  const { t, locale } = useI18n();
  const errorMessage = useApiErrorMessage();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [scope, setScope] = useState<(typeof SCOPES)[number]>('all');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<{ error: ApiError | null; text: string } | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isTyping]);

  const send = async (raw: string) => {
    const text = raw.trim().slice(0, MAX_LENGTH);
    if (!text || isTyping) return;
    setError(null);
    setInputText('');
    setMessages((prev) => [...prev, { id: `u-${Date.now()}`, sender: 'user', text }]);
    setIsTyping(true);
    const res = await api.post<AssistantAnswer>('/ai/assistant/chat', { message: text, scope, locale }, { timeoutMs: 60_000 });
    setIsTyping(false);
    const parsed = res.success ? parseAnswer(res.data) : null;
    if (!parsed) {
      // Failed or malformed responses never enter the history; the question can be retried.
      setMessages((prev) => prev.slice(0, -1));
      setInputText(text);
      setError({ error: res.success ? { code: 'AI_INVALID', message: '' } : res.error ?? null, text });
      return;
    }
    setMessages((prev) => [
      ...prev,
      { id: parsed.id || `a-${Date.now()}`, sender: 'ai', text: parsed.answer, locale: parsed.locale, citations: parsed.citations, notEnoughContext: parsed.not_enough_context },
    ]);
  };

  const copySnippet = async (snippet: string, key: string) => {
    await navigator.clipboard?.writeText(snippet).catch(() => undefined);
    setCopiedId(key);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shrink-0">
            <Sparkles className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-slate-900">{t('aiChat.title')}</h1>
            <p className="text-[11px] text-slate-500">{t('aiChat.subtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label htmlFor="ai-scope" className="text-slate-500">
            {t('aiChat.scope.label')}
          </label>
          <select id="ai-scope" value={scope} onChange={(e) => setScope(e.target.value as typeof scope)} className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium">
            {SCOPES.map((s) => (
              <option key={s} value={s}>
                {t(`aiChat.scope.${s}`)}
              </option>
            ))}
          </select>
          <Button variant="ghost" size="sm" onClick={() => setConfirmClear(true)} disabled={messages.length === 0} aria-label={t('aiChat.clear')} title={t('aiChat.clear')}>
            <Trash2 className="w-4 h-4 text-slate-400" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 text-[11px] font-medium">{t('aiChat.samplesLabel')}</span>
        {SAMPLE_KEYS.map((k) => (
          <button
            key={k}
            type="button"
            disabled={isTyping}
            onClick={() => void send(t(`aiChat.samples.${k}`))}
            className="px-2.5 py-1 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 text-slate-700 hover:text-indigo-700 transition text-[11px] font-medium disabled:opacity-50"
          >
            {t(`aiChat.samples.${k}`)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 min-h-[360px] max-h-[60vh] overflow-y-auto space-y-4" role="log" aria-live="polite" aria-label={t('aiChat.logLabel')}>
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 rounded-full flex items-center justify-center bg-slate-100 shrink-0" aria-hidden="true">
            <Bot className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="p-4 rounded-2xl max-w-xl text-xs leading-relaxed bg-slate-50 border border-slate-200 text-slate-800">{t('aiChat.greeting')}</div>
        </div>

        {messages.map((msg) => (
          <div key={msg.id} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.sender === 'user' ? 'bg-indigo-600 text-white' : 'bg-slate-100'}`} aria-hidden="true">
              {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4 text-indigo-600" />}
            </div>
            <div
              lang={msg.sender === 'ai' ? msg.locale : undefined}
              className={`p-4 rounded-2xl max-w-xl text-xs leading-relaxed space-y-2.5 break-words ${
                msg.sender === 'user' ? 'bg-indigo-600 text-white' : msg.notEnoughContext ? 'bg-amber-50 border border-amber-200 text-amber-900' : 'bg-slate-50 border border-slate-200 text-slate-800'
              }`}
            >
              <span className="sr-only">{msg.sender === 'user' ? t('aiChat.you') : t('aiChat.assistant')}: </span>
              <p className="whitespace-pre-line">{msg.text}</p>
              {msg.sender === 'ai' && msg.locale !== locale && (
                <p className="text-[10px] text-slate-400">{t('aiChat.answeredIn', { language: LOCALE_LABELS[msg.locale].native })}</p>
              )}
              {msg.sender === 'ai' && msg.citations.length > 0 && (
                <div className="pt-2 border-t border-slate-200/80 space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 flex items-center">
                    <BookOpen className="w-3.5 h-3.5 mr-1" aria-hidden="true" /> {t('aiChat.sources')}
                  </div>
                  {msg.citations.map((c, i) => {
                    const key = `${msg.id}-${i}`;
                    return (
                      <div key={key} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] text-slate-600 space-y-1">
                        <div className="font-semibold text-slate-900 flex items-center justify-between gap-2">
                          <span>
                            {c.title} • {c.section}
                          </span>
                          <button type="button" onClick={() => void copySnippet(c.snippet, key)} className="text-slate-400 hover:text-indigo-600 p-0.5 transition" aria-label={t('aiChat.copyQuote')} title={t('aiChat.copyQuote')}>
                            {copiedId === key ? <Check className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" /> : <Copy className="w-3.5 h-3.5" aria-hidden="true" />}
                          </button>
                        </div>
                        <blockquote className="italic text-slate-500">{c.snippet}</blockquote>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center space-x-2 text-xs text-slate-500 p-2" role="status">
            <span className="inline-block animate-spin h-3.5 w-3.5 border-2 border-indigo-600 border-t-transparent rounded-full" aria-hidden="true" />
            <span>{t('aiChat.typing')}</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {error && (
        <ErrorState
          message={error.error?.code === 'AI_INVALID' ? t('errors.aiInvalidResponse') : errorMessage(error.error)}
          onRetry={() => {
            const text = error.text;
            setError(null);
            void send(text);
          }}
        />
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send(inputText);
        }}
        className="flex items-center gap-2"
      >
        <label htmlFor="ai-input" className="sr-only">
          {t('aiChat.inputLabel')}
        </label>
        <input
          id="ai-input"
          type="text"
          value={inputText}
          maxLength={MAX_LENGTH}
          disabled={isTyping}
          onChange={(e) => setInputText(e.target.value)}
          placeholder={t('aiChat.placeholder')}
          className="flex-1 min-w-0 bg-white rounded-xl border border-slate-300 px-4 py-3 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm disabled:bg-slate-50"
        />
        <Button type="submit" variant="primary" disabled={!inputText.trim() || isTyping}>
          <Send className="w-4 h-4 sm:mr-1.5" aria-hidden="true" />
          <span className="hidden sm:inline">{t('aiChat.send')}</span>
        </Button>
      </form>
      <p className="text-[11px] text-slate-400">{t('aiChat.disclaimer')}</p>

      <ConfirmDialog
        isOpen={confirmClear}
        title={t('aiChat.clearConfirmTitle')}
        message={t('aiChat.clearConfirmMessage')}
        confirmLabel={t('aiChat.clear')}
        onConfirm={() => {
          setMessages([]);
          setError(null);
          setConfirmClear(false);
        }}
        onCancel={() => setConfirmClear(false)}
      />
    </div>
  );
};
