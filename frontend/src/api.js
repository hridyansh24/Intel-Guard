const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Context
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

// Analyze
export async function analyzeSubmission(contextId, files) {
  const form = new FormData();
  form.append('context_id', contextId);
  for (const f of files) form.append('files', f);
  return request('/analyze/', { method: 'POST', body: form });
}

// Submit (combined endpoint)
export async function submitWork(contextId, files, mode = 'quiz', skipDetection = false, numQuestions = 3) {
  const form = new FormData();
  form.append('context_id', contextId);
  form.append('mode', mode);
  form.append('skip_detection', skipDetection);
  form.append('num_questions', numQuestions);
  for (const f of files) form.append('files', f);
  return request('/submit/', { method: 'POST', body: form });
}

// Quiz
export async function evaluateAnswer(contextId, submissionText, question, studentAnswer) {
  return request('/quiz/evaluate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      context_id: contextId,
      submission_text: submissionText,
      question,
      student_answer: studentAnswer,
    }),
  });
}
