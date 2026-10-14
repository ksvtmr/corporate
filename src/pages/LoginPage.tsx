import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, Button, Input, Card } from '@iclever/frontend-kit';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin@corp.iclever.ai');
  const [password, setPassword] = useState('Password123!');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await login(email, password);
      if (success) {
        navigate('/corporate/dashboard');
      } else {
        setError('Неверный email или пароль');
      }
    } catch {
      setError('Ошибка авторизации, проверьте подключение к бэкенду');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-2xl mb-3 shadow-md shadow-indigo-200">
            iC
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">iClever Corporate</h2>
          <p className="text-sm text-slate-500 mt-1">Вход в корпоративную панель обучения</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <Input
              label="Рабочий Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />

            <Input
              label="Пароль"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            <Button type="submit" variant="primary" className="w-full" isLoading={isLoading}>
              Войти в систему
            </Button>

            {/* Quick-fill preset roles for instant testing */}
            <div className="pt-3 border-t border-slate-100">
              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center mb-2">
                Быстрый вход для тестирования ролей
              </p>
              <div className="space-y-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setEmail('employee@corp.iclever.ai');
                    setPassword('Password123!');
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">👤 Сотрудник (Марат Жумабаев)</span>
                    <p className="text-[10px] text-slate-500">employee@corp.iclever.ai • Дашборд, плеер, тесты, AI</p>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Выбрать →</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail('manager@corp.iclever.ai');
                    setPassword('Password123!');
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">👔 Руководитель (Виктор Ким)</span>
                    <p className="text-[10px] text-slate-500">manager@corp.iclever.ai • Команда инженеров, дедлайны</p>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Выбрать →</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setEmail('admin@corp.iclever.ai');
                    setPassword('Password123!');
                  }}
                  className="w-full text-left p-2 rounded-lg bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 border border-slate-200 transition-all flex items-center justify-between group"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">🛡️ Администратор / HR (Алина Садыкова)</span>
                    <p className="text-[10px] text-slate-500">admin@corp.iclever.ai • Полный доступ ко всем модулям</p>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-semibold opacity-0 group-hover:opacity-100 transition-opacity">Выбрать →</span>
                </button>
              </div>
            </div>

            <div className="text-center text-xs text-slate-500 pt-2">
              Нет аккаунта?{' '}
              <Link to="/register" className="text-indigo-600 font-medium hover:underline">
                Зарегистрировать компанию
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
