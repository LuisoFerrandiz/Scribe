import type {
  AttachmentRow,
  CaseFull,
  CaseSummary,
  EventRow,
  Extraction,
  Kind,
  NewCaseInput,
  PartyRow,
  ResourceDetail,
  ResourceRow,
  SearchResponse,
  Sections,
  SessionUser,
  SuggestResponse,
  WitnessRow,
} from './types';

// `window.__API_URL__` is written at container start by the nginx entrypoint (API_URL env);
// Vite's build-time env is the fallback for `npm run dev`.
declare global {
  interface Window {
    __API_URL__?: string;
  }
}
const API_URL = window.__API_URL__ ?? import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

// Any 401 from the API: not logged in, or the session expired. App falls back to the login screen.
export class AuthError extends Error {
  constructor() {
    super('not authenticated');
  }
}

// The server answered with an error status. A network failure is a plain TypeError from fetch.
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly body: string,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  // Fastify rejects a request that declares JSON with no body, so the header goes out only with a JSON body
  // (a FormData upload sets its own multipart header).
  const headers = typeof options?.body === 'string' ? { 'Content-Type': 'application/json' } : undefined;
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { ...headers, ...options?.headers },
  });
  if (res.status === 401 && path !== '/auth/login') throw new AuthError();
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, body, `${options?.method ?? 'GET'} ${path} failed: ${res.status} ${body}`);
  }
  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

// The `{"error": "..."}` body of a failed request, as plain text for the user.
export function serverError(e: unknown): string {
  const message = e instanceof Error ? e.message : String(e);
  const json = message.indexOf('{');
  if (json !== -1) {
    try {
      const parsed = JSON.parse(message.slice(json)) as { error?: string };
      if (parsed.error) return parsed.error;
    } catch {
      /* not JSON: fall through */
    }
  }
  return message;
}

const send = <T>(method: string, path: string, data: unknown) =>
  request<T>(path, { method, body: JSON.stringify(data) });

export const api = {
  me: () => request<SessionUser | null>('/auth/me'),
  login: (username: string, password: string) => send<SessionUser>('POST', '/auth/login', { username, password }),
  logout: () => request<void>('/auth/logout', { method: 'POST' }),

  listEvents: () => request<EventRow[]>('/events'),
  createEvent: (data: { name: string; timezone: string }) => send<EventRow>('POST', '/events', data),

  listCases: () => request<CaseSummary[]>('/cases'),
  getCase: (id: number) => request<CaseFull>(`/cases/${id}`),
  saveDoc: (caseId: number, updatedAt: string, sections: Sections) =>
    send<{ updated_at: string }>('PATCH', `/cases/${caseId}/doc`, { updated_at: updatedAt, ...sections }),
  suggest: (params: { q: string; box: string; caseId: number; text: string }, signal: AbortSignal) => {
    const qs = new URLSearchParams({ q: params.q, box: params.box, case_id: String(params.caseId), text: params.text });
    return request<SuggestResponse>(`/suggest?${qs}`, { signal });
  },
  search: (q: string, caseId: number, signal: AbortSignal) =>
    request<SearchResponse>(`/search?${new URLSearchParams({ q, case_id: String(caseId) })}`, { signal }),
  createCase: (data: NewCaseInput) => send<CaseFull>('POST', '/cases', data),
  patchCase: (caseId: number, data: { case_number?: string; race?: string; kinds?: Kind[]; hearing_at?: string | null }) =>
    send<CaseFull>('PATCH', `/cases/${caseId}`, data),
  setParties: (caseId: number, parties: Omit<PartyRow, 'id'>[] | (Omit<PartyRow, 'id'> & { id?: number })[]) =>
    send<PartyRow[]>('PUT', `/cases/${caseId}/parties`, { parties }),
  listAttachments: (caseId: number) => request<AttachmentRow[]>(`/cases/${caseId}/attachments`),
  uploadAttachment: (caseId: number, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request<AttachmentRow>(`/cases/${caseId}/attachments`, { method: 'POST', body });
  },
  deleteAttachment: (id: number) => request<void>(`/attachments/${id}`, { method: 'DELETE' }),
  extract: (caseId: number) => request<Extraction>(`/cases/${caseId}/extract`, { method: 'POST' }),
  deleteCase: (id: number) => request<void>(`/cases/${id}`, { method: 'DELETE' }),
  listRules: () => request<ResourceRow[]>('/resources?kind=rule'),
  getResource: (id: number) => request<ResourceDetail>(`/resources/${id}`),
  uploadResource: (form: FormData) => request<ResourceRow>('/resources', { method: 'POST', body: form }),
  acceptResource: (id: number) => request<ResourceRow>(`/resources/${id}/accept`, { method: 'POST' }),
  rejectResource: (id: number) => request<void>(`/resources/${id}/reject`, { method: 'POST' }),
  deleteResource: (id: number) => request<void>(`/resources/${id}`, { method: 'DELETE' }),
  setWitnesses: (caseId: number, witnesses: { name: string; supports_party_id: number | null }[]) =>
    send<WitnessRow[]>('PUT', `/cases/${caseId}/witnesses`, { witnesses }),
};
