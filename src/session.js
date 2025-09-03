const Conf = require('conf').default;
const chalk = require('chalk');

const sessionStore = new Conf({
  projectName: 'tomato-pomodoro-session'
});

function saveSession(session) {
  sessionStore.set('currentSession', {
    ...session,
    savedAt: Date.now(),
    startTime: session.startTime,
    pausedAt: session.pausedAt
  });
}

function loadSession() {
  const session = sessionStore.get('currentSession');
  
  if (!session) {
    return null;
  }
  
  // Check if session is too old (more than 24 hours)
  const age = Date.now() - session.savedAt;
  if (age > 24 * 60 * 60 * 1000) {
    clearSession();
    return null;
  }
  
  // Adjust remaining time based on elapsed time if session was running
  if (session.isRunning && !session.isPaused && session.startTime) {
    const elapsed = Math.floor((Date.now() - session.startTime) / 1000);
    const originalSeconds = getOriginalDuration(session) * 60;
    session.remainingSeconds = Math.max(0, originalSeconds - elapsed);
    
    if (session.remainingSeconds === 0) {
      // Session expired while app was closed
      return {
        ...session,
        isExpired: true
      };
    }
  }
  
  // If paused, keep the remaining seconds as saved
  return session;
}

function getOriginalDuration(session) {
  const { getConfig } = require('./config');
  const config = getConfig();
  
  switch(session.sessionType) {
    case 'work':
      return config.workDuration;
    case 'shortBreak':
      return config.shortBreakDuration;
    case 'longBreak':
      return config.longBreakDuration;
    default:
      return config.workDuration;
  }
  
  return session;
}

function clearSession() {
  sessionStore.delete('currentSession');
}

function hasActiveSession() {
  const session = loadSession();
  return session && !session.isExpired;
}

module.exports = {
  saveSession,
  loadSession,
  clearSession,
  hasActiveSession
};