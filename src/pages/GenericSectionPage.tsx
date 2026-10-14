import React from 'react';
import { Card, Badge, Button } from '@iclever/frontend-kit';
import { Sparkles, Plus } from 'lucide-react';

interface GenericSectionPageProps {
  title: string;
  description: string;
  sprint: string;
  actionText?: string;
  children?: React.ReactNode;
}

export const GenericSectionPage: React.FC<GenericSectionPageProps> = ({
  title,
  description,
  sprint,
  actionText,
  children,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{title}</h1>
            <Badge variant="brand">{sprint}</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">{description}</p>
        </div>
        {actionText && (
          <Button variant="primary" size="sm">
            <Plus className="w-4 h-4 mr-1.5" />
            {actionText}
          </Button>
        )}
      </div>

      {children ? (
        children
      ) : (
        <Card className="text-center py-12">
          <div className="w-12 h-12 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Sparkles className="w-6 h-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">Модуль готов к наполнению</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-4">
            Архитектура, таблицы базы данных (миграции 000001–000011) и контракты сервиса развернуты. Логика будет подключена в рамках {sprint}.
          </p>
          <Button variant="outline" size="sm">Документация API</Button>
        </Card>
      )}
    </div>
  );
};
