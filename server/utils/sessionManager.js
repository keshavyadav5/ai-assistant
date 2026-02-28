const sessions = new Map();

export const createSession = (sessionId, systemPrompt) => {
  sessions.set(sessionId, [
    { role: "system", content: systemPrompt }
  ]);
};

export const addMessage = (sessionId, role, content) => {
  const messages = sessions.get(sessionId);
  if (!messages) return;
  messages.push({ role, content });
};

export const getMessages = (sessionId) => {
  return sessions.get(sessionId);
};

export const sessionExists = (sessionId) => {
  return sessions.has(sessionId);
};