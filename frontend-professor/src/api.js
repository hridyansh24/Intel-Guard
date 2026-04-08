const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Context (assignments)
export async function createContext(title, files) {
  const form = new FormData();
  form.append('title', title);
  for (const f of files) form.append('files', f);
  return request('/context/', { method: 'POST', body: form });
}

export async function listContexts() {
  return request('/context/');
}

export async function getContext(id) {
  return request(`/context/${id}`);
}

// Classes
export async function createClass(name) {
  return request('/classes/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name }),
  });
}

export async function listClasses() {
  return request('/classes/');
}

export async function getClass(classId) {
  return request(`/classes/${classId}`);
}

export async function getClassStudents(classId) {
  return request(`/classes/${classId}/students`);
}

export async function addContextToClass(classId, contextId, skipDetection = false) {
  return request(`/classes/${classId}/context`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context_id: contextId, skip_detection: skipDetection }),
  });
}

export async function updateContextSettings(classId, contextId, skipDetection) {
  return request(`/classes/${classId}/context/${contextId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ skip_detection: skipDetection }),
  });
}

export async function getClassSubmissions(classId, contextId = null) {
  let url = `/classes/${classId}/submissions`;
  if (contextId) url += `?context_id=${contextId}`;
  return request(url);
}

// Analyze
export async function analyzeSubmission(contextId, files, studentId = null) {
  const form = new FormData();
  form.append('context_id', contextId);
  if (studentId) form.append('student_id', studentId);
  for (const f of files) form.append('files', f);
  return request('/analyze/', { method: 'POST', body: form });
}

// Style
export async function updateStyle(studentId, contextId, files) {
  const form = new FormData();
  form.append('student_id', studentId);
  form.append('context_id', contextId);
  for (const f of files) form.append('files', f);
  return request('/style/update', { method: 'POST', body: form });
}

export async function getStyleProfile(studentId) {
  return request(`/style/${studentId}`);
}

export async function listStyleProfiles() {
  return request('/style/profiles');
}

export async function compareStyle(studentId, contextId, files, aiProbability = null) {
  const form = new FormData();
  form.append('student_id', studentId);
  form.append('context_id', contextId);
  for (const f of files) form.append('files', f);
  if (aiProbability !== null) form.append('ai_probability', aiProbability);
  return request('/style/compare', { method: 'POST', body: form });
}

// Submissions
export async function listSubmissions(classId, studentId, contextId) {
  const params = new URLSearchParams();
  if (classId) params.set('class_id', classId);
  if (studentId) params.set('student_id', studentId);
  if (contextId) params.set('context_id', contextId);
  return request(`/submissions/?${params}`);
}
