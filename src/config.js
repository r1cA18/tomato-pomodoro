const Conf = require('conf').default;

const config = new Conf({
  projectName: 'tomato-pomodoro',
  defaults: {
    workDuration: 25,
    shortBreakDuration: 5,
    longBreakDuration: 15,
    cyclesBeforeLongBreak: 4
  }
});

function getConfig() {
  return {
    workDuration: config.get('workDuration'),
    shortBreakDuration: config.get('shortBreakDuration'),
    longBreakDuration: config.get('longBreakDuration'),
    cyclesBeforeLongBreak: config.get('cyclesBeforeLongBreak')
  };
}

function setConfig(updates) {
  Object.keys(updates).forEach(key => {
    if (updates[key] !== undefined && updates[key] > 0) {
      config.set(key, updates[key]);
    }
  });
}

function resetConfig() {
  config.clear();
}

module.exports = {
  getConfig,
  setConfig,
  resetConfig
};