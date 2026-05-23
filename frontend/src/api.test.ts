import { beforeEach, describe, expect, it, vi } from 'vitest';
import { api, clearAccessToken, setAccessToken } from './api';

describe('api client', () => {
  beforeEach(() => {
    clearAccessToken();
    localStorage.clear();
  });

  it('stores and clears access token in localStorage', () => {
    setAccessToken('jwt-token');
    expect(localStorage.getItem('kln_token')).toBe('jwt-token');

    clearAccessToken();
    expect(localStorage.getItem('kln_token')).toBeNull();
  });

  it('sends observation list query parameters and bearer token', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    vi.stubGlobal('fetch', fetchMock);
    setAccessToken('jwt-token');

    await api.observations({
      month: '2026-05',
      employeeId: 'employee-1',
      status: 'signed',
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, options] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'http://localhost:3000/api/observations?month=2026-05&employeeId=employee-1&status=signed',
    );
    expect(options.headers).toMatchObject({
      'Content-Type': 'application/json',
      Authorization: 'Bearer jwt-token',
    });
  });

  it('throws a joined validation message array from the backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        message: ['Заполните поле employeeNumber', 'Заполните поле personnelNumber'],
      }),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.createUser({
      employeeNumber: '',
      personnelNumber: '',
      lastName: 'Иванова',
      firstName: 'Дарья',
      role: 'hr',
    })).rejects.toThrow('Заполните поле employeeNumber, Заполните поле personnelNumber');
  });

  it('throws a fallback message when response body has no explicit error text', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(api.templates()).rejects.toThrow('Ошибка запроса: 503');
  });
});
