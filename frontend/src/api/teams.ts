import { api } from './client';
import type { Team } from '../types';

export const teamsApi = {
  list: () =>
    api.get<{ data: { teams: Team[] } }>('/teams'),

  getById: (id: string) =>
    api.get<{ data: { team: Team } }>(`/teams/${id}`),
};
