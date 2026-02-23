import { useEffect, useState } from 'react';
import { ProfileService } from '../services/ProfileService';
import { useAuth } from '../contexts/AuthContext';

export const useActiveProfileId = (): string | null => {
  const { isGuest, user } = useAuth();
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    const refreshProfileId = async () => {
      try {
        const resolvedId = await ProfileService.getActiveProfileId();
        if (!mounted) return;
        setProfileId(resolvedId);
      } catch (error) {
        console.warn('useActiveProfileId: Failed to resolve active profile', error);
        if (mounted) {
          setProfileId(null);
        }
      }
    };

    refreshProfileId();

    return () => {
      mounted = false;
    };
  }, [isGuest, user?.id]);

  return profileId;
};
