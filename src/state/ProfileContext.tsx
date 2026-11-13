import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, ApiError } from '../lib/api';
import { useAuth } from './AuthContext';
import { ProfileOption } from '../components/ui/ProfileSelector';

function describeError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'No se pudo conectar con el servidor.';
}

export interface ApiProfile {
  id: number;
  user_id: number;
  name: string;
  birth_date: string | null;
  relationship: string | null;
  avatar_color: string | null;
}

function toProfileOption(profile: ApiProfile, index: number): ProfileOption {
  return {
    id: String(profile.id),
    label: profile.name,
    icon: index === 0 ? 'heart' : 'users',
  };
}

interface ProfileContextValue {
  profiles: readonly ProfileOption[];
  isLoading: boolean;
  /** Mensaje legible del último error al cargar/crear perfiles, o null si no hay. */
  error: string | null;
  selectedProfileId: string;
  selectedProfile: ProfileOption | undefined;
  /** El primer perfil creado (equivalente a "Mi Salud"); usado para distinguir vistas propias de familiares. */
  primaryProfileId: string | undefined;
  setSelectedProfileId: (profileId: string) => void;
  createProfile: (name: string, relationship?: string) => Promise<void>;
  refreshProfiles: () => Promise<void>;
}

const ProfileContext = createContext<ProfileContextValue | undefined>(undefined);

export const ProfileProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [profiles, setProfiles] = useState<readonly ProfileOption[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refreshProfiles = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      let apiProfiles = await api.get<ApiProfile[]>('/profiles');

      if (apiProfiles.length === 0) {
        const created = await api.post<ApiProfile>('/profiles', { name: 'Mi Salud' });
        apiProfiles = [created];
      }

      const options = apiProfiles.map(toProfileOption);
      setProfiles(options);
      setSelectedProfileId((current) =>
        options.some((p) => p.id === current) ? current : options[0]?.id ?? ''
      );
    } catch (err) {
      setError(describeError(err));
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      void refreshProfiles();
    } else {
      setProfiles([]);
      setSelectedProfileId('');
      setIsLoading(false);
    }
  }, [isAuthenticated, refreshProfiles]);

  const createProfile = useCallback(async (name: string, relationship?: string) => {
    setError(null);
    try {
      const created = await api.post<ApiProfile>('/profiles', { name, relationship });
      setProfiles((prev) => [...prev, toProfileOption(created, prev.length)]);
    } catch (err) {
      setError(describeError(err));
      throw err;
    }
  }, []);

  const value = useMemo<ProfileContextValue>(() => {
    const selectedProfile = profiles.find((profile) => profile.id === selectedProfileId);
    return {
      profiles,
      isLoading,
      error,
      selectedProfileId,
      selectedProfile,
      primaryProfileId: profiles[0]?.id,
      setSelectedProfileId,
      createProfile,
      refreshProfiles,
    };
  }, [profiles, isLoading, error, selectedProfileId, createProfile, refreshProfiles]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
};

export function useProfile(): ProfileContextValue {
  const context = useContext(ProfileContext);
  if (!context) {
    throw new Error('useProfile debe utilizarse dentro de un <ProfileProvider>');
  }
  return context;
}
