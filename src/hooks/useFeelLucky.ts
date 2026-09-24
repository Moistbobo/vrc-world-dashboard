import { useCallback, useRef, useState } from 'react';
import { useNavigate } from '../lib/navigation';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { fetchHealth, fetchWorlds } from '../api/client';

interface UseFeelLuckyResult {
  loading: boolean;
  feelLucky: () => Promise<void>;
}

export function useFeelLucky(): UseFeelLuckyResult {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  // Synchronous lock: state updates are batched, so two clicks in the same
  // tick would otherwise both see loading=false. The ref flips immediately.
  const inFlightRef = useRef(false);

  const feelLucky = useCallback(async () => {
    if (inFlightRef.current) return;
    inFlightRef.current = true;
    setLoading(true);
    try {
      const { worldCount } = await fetchHealth();
      if (!worldCount) {
        toast.error(t('worlds.loadError', { message: 'no worlds' }));
        return;
      }
      const offset = Math.floor(Math.random() * worldCount);
      const { worlds } = await fetchWorlds({ limit: 1, offset });
      const randomWorld = worlds[0];
      if (!randomWorld) {
        toast.error(t('worlds.loadError', { message: 'no worlds' }));
        return;
      }
      navigate(`/worlds/${encodeURIComponent(randomWorld.worldId)}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast.error(t('worlds.loadError', { message }));
    } finally {
      setLoading(false);
      inFlightRef.current = false;
    }
  }, [navigate, t]);

  return { loading, feelLucky };
}
