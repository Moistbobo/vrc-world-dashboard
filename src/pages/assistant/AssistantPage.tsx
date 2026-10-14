import { useCallback } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { WorldsAgentPanel } from '../../components/worlds-agent-panel';
import { toWhereParam } from '../../api/agentClient';
import { useMe } from '../../hooks/useApi';
import { useCanManageCurator } from '../../hooks/useCanManageCurator';
import { usePageTitle } from '../../hooks/usePageTitle';
import type { WorldsQuery } from '../../types';

export function AssistantPage() {
  const { t } = useTranslation();
  usePageTitle(t('agent.title'));
  const canManageCurator = useCanManageCurator();
  const { isFetching } = useMe();
  const navigate = useNavigate();

  const handleViewAll = useCallback(
    (query: WorldsQuery) => navigate(`/worlds?where=${toWhereParam(query)}`),
    [navigate],
  );

  if (!canManageCurator && isFetching) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white">{t('agent.title')}</h1>
        <p role="status" className="text-sm text-slate-500 dark:text-slate-400">
          {t('common.loading')}
        </p>
      </div>
    );
  }
  if (!canManageCurator) return <Navigate to="/worlds" replace />;

  return <WorldsAgentPanel onViewAll={handleViewAll} />;
}
