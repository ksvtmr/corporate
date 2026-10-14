import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth, Button, Input, Card } from '@iclever/frontend-kit';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [jobTitle, setJobTitle] = useState('Head of HR');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      const success = await register({
        email,
        password,
        first_name: firstName,
        last_name: lastName,
        org_name: orgName,
        job_title: jobTitle,
      });

      if (success) {
        navigate('/corporate/dashboard');
      } else {
        setError('Не удалось создать компанию. Проверьте введенные данные.');
      }
    } catch {
      setError('Ошибка регистрации на сервере');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-indigo-600 text-white font-bold text-2xl mb-3 shadow-md shadow-indigo-200">
            iC
          </div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">Регистрация компании</h2>
          <p className="text-sm text-slate-500 mt-1">Создайте корпоративное пространство iClever</p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-3">
            {error && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700">
                {error}
              </div>
            )}

            <Input
              label="Название компании"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              placeholder="ООО Ромашка или Fintech Corp"
              required
            />

            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Имя"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label="Фамилия"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <Input
              label="Должность"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
            />

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

            <Button type="submit" variant="primary" className="w-full mt-2" isLoading={isLoading}>
              Создать организацию
            </Button>

            <div className="text-center text-xs text-slate-500 pt-2">
              Уже есть аккаунт?{' '}
              <Link to="/login" className="text-indigo-600 font-medium hover:underline">
                Войти
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
