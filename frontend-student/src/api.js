const BASE = '/api';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}${path}`, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail || `Request failed: ${res.status}`);
  }
  return res.json();
}

// Students
export async function registerStudent(name, password) {
  return request('/students/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  });
}

export async function loginStudent(studentId, password) {
  return request('/students/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId, password }),
  });
}

export async function getStudent(studentId) {
  return request(`/students/${studentId}`);
}

// Classes
export async function listClasses() {
  return request('/classes/');
}

export async function joinClass(classId, studentId) {
  return request(`/classes/${classId}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ student_id: studentId }),
  });
}

export async function getStudentClasses(studentId) {
  return request(`/classes/student/${studentId}`);
}

// Contexts (assignments)
export async function listContexts() {
  return request('/context/');
}

export async function getClass(classId) {
  return request(`/classes/${classId}`);
}

// Submit
export async function submitWork(contextId, files, mode = 'quiz', numQuestions = 3, studentId = null, classId = null) {
  const form = new FormData();
  form.append('context_id', contextId);
  form.append('mode', mode);
  form.append('num_questions', numQuestions);
  if (studentId) form.append('student_id', studentId);
  if (classId) form.append('class_id', classId);
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

// Submissions
export async function saveSubmission(data) {
  return request('/submissions/', { method: 'POST', ...data });
}

export async function updateSubmissionQuiz(submissionId, quizResults) {
  return request(`/submissions/${submissionId}/quiz`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quizResults),
  });
}

export async function listSubmissions(studentId) {
  return request(`/submissions/?student_id=${studentId}`);
}
