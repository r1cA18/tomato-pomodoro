const chalk = require('chalk');
const ora = require('ora');
const inquirer = require('inquirer');
const boxen = require('boxen').default;
const { getConfig } = require('./config');
const { sendNotification, playSound } = require('./notifier');
const { saveSession, loadSession, clearSession, hasActiveSession } = require('./session');

let currentTimer = null;
let spinner = null;

const SESSION_TYPES = {
  WORK: 'work',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak'
};

class PomodoroTimer {
  constructor() {
    this.config = getConfig();
    this.sessionType = SESSION_TYPES.WORK;
    this.completedCycles = 0;
    this.remainingSeconds = this.config.workDuration * 60;
    this.isRunning = false;
    this.isPaused = false;
    this.interval = null;
    this.startTime = null;
    this.pausedAt = null;
  }
  
  createProgressBar() {
    const totalSeconds = this.getOriginalDuration() * 60;
    const progress = (totalSeconds - this.remainingSeconds) / totalSeconds;
    const barLength = 25;
    const filled = Math.floor(barLength * progress);
    const empty = barLength - filled;
    
    return '[' + '█'.repeat(filled) + '░'.repeat(empty) + '] ' + Math.floor(progress * 100) + '%';
  }
  
  static async restore() {
    const session = loadSession();
    
    if (!session) {
      return new PomodoroTimer();
    }
    
    const timer = new PomodoroTimer();
    timer.sessionType = session.sessionType;
    timer.completedCycles = session.completedCycles;
    timer.remainingSeconds = session.remainingSeconds;
    timer.isPaused = session.isPaused;
    timer.isRunning = session.isRunning;
    timer.startTime = session.startTime;
    timer.pausedAt = session.pausedAt;
    
    if (session.isExpired) {
      console.log(chalk.yellow('⚠️  Your previous session expired while you were away'));
      await timer.handleSessionComplete();
      return timer;
    }
    
    if (session.isRunning && !session.isPaused) {
      console.log(chalk.cyan('↺ Session already running...'));
      console.log(chalk.gray('Use "pomodoro status" to check progress'));
      // Start background checking for completion
      timer.startBackgroundTimer();
    } else if (session.isPaused) {
      console.log(chalk.yellow('⏸  Previous session is paused. Use "resume" to continue.'));
    }
    
    return timer;
  }
  
  formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  
  getSessionEmoji() {
    switch(this.sessionType) {
      case SESSION_TYPES.WORK: return '🍅';
      case SESSION_TYPES.SHORT_BREAK: return '☕';
      case SESSION_TYPES.LONG_BREAK: return '🌴';
    }
  }
  
  getSessionName() {
    switch(this.sessionType) {
      case SESSION_TYPES.WORK: return 'Work Session';
      case SESSION_TYPES.SHORT_BREAK: return 'Short Break';
      case SESSION_TYPES.LONG_BREAK: return 'Long Break';
    }
  }
  
  getSessionColor() {
    switch(this.sessionType) {
      case SESSION_TYPES.WORK: return 'red';
      case SESSION_TYPES.SHORT_BREAK: return 'green';
      case SESSION_TYPES.LONG_BREAK: return 'blue';
    }
  }
  
  saveState() {
    saveSession({
      sessionType: this.sessionType,
      completedCycles: this.completedCycles,
      remainingSeconds: this.remainingSeconds,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      startTime: this.startTime,
      pausedAt: this.pausedAt
    });
  }
  
  start() {
    if (this.isRunning && !this.isPaused) {
      console.log(chalk.yellow('Timer is already running!'));
      this.showStatus();
      return;
    }
    
    this.isRunning = true;
    this.isPaused = false;
    this.startTime = Date.now();
    
    const sessionName = this.getSessionName();
    const emoji = this.getSessionEmoji();
    const color = this.getSessionColor();
    
    console.log('\n' + boxen(
      `${emoji} ${chalk.bold(sessionName)} Started!\n` +
      chalk.gray(`Duration: ${this.formatTime(this.remainingSeconds)}`),
      {
        padding: 1,
        borderStyle: 'round',
        borderColor: color
      }
    ));
    
    console.log(chalk.gray('\n💡 Timer is running in the background'));
    console.log(chalk.cyan('   Use "pomodoro status" to check progress'));
    console.log(chalk.cyan('   Use "pomodoro pause" to pause'));
    console.log(chalk.cyan('   Use "pomodoro stop" to cancel\n'));
    
    // Start background timer
    this.startBackgroundTimer();
    
    this.saveState();
  }
  
  startBackgroundTimer() {
    // Don't actually start a timer - just save the state
    // The timer will be checked when status is called
    // This allows the process to exit cleanly
  }
  
  updateRemainingTime() {
    if (this.isPaused || !this.isRunning) return;
    
    const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
    const originalSeconds = this.getOriginalDuration() * 60;
    this.remainingSeconds = Math.max(0, originalSeconds - elapsed);
  }
  
  getOriginalDuration() {
    switch(this.sessionType) {
      case SESSION_TYPES.WORK:
        return this.config.workDuration;
      case SESSION_TYPES.SHORT_BREAK:
        return this.config.shortBreakDuration;
      case SESSION_TYPES.LONG_BREAK:
        return this.config.longBreakDuration;
      default:
        return this.config.workDuration;
    }
  }
  
  tick() {
    // Deprecated - kept for compatibility
    this.remainingSeconds--;
    if (this.remainingSeconds <= 0) {
      this.handleSessionComplete();
    } else if (this.remainingSeconds % 5 === 0) {
      this.saveState();
    }
  }
  
  async handleSessionComplete() {
    this.stop(false);
    
    const sessionName = this.getSessionName();
    sendNotification(
      `${sessionName} Complete! ${this.getSessionEmoji()}`,
      this.sessionType === SESSION_TYPES.WORK 
        ? "Time for a break! Great work! 🎉"
        : "Break's over! Ready to focus? 💪"
    );
    
    // Determine next session
    if (this.sessionType === SESSION_TYPES.WORK) {
      this.completedCycles++;
      
      if (this.completedCycles >= this.config.cyclesBeforeLongBreak) {
        this.sessionType = SESSION_TYPES.LONG_BREAK;
        this.completedCycles = 0;
      } else {
        this.sessionType = SESSION_TYPES.SHORT_BREAK;
      }
    } else {
      this.sessionType = SESSION_TYPES.WORK;
    }
    
    // Set duration for next session
    switch(this.sessionType) {
      case SESSION_TYPES.WORK:
        this.remainingSeconds = this.config.workDuration * 60;
        break;
      case SESSION_TYPES.SHORT_BREAK:
        this.remainingSeconds = this.config.shortBreakDuration * 60;
        break;
      case SESSION_TYPES.LONG_BREAK:
        this.remainingSeconds = this.config.longBreakDuration * 60;
        break;
    }
    
    // Ask user if they want to continue
    const nextSessionName = this.getSessionName();
    const { continueTimer } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'continueTimer',
        message: `Ready to start ${nextSessionName}?`,
        default: true
      }
    ]);
    
    if (continueTimer) {
      this.start();
    } else {
      console.log(chalk.gray('Timer stopped. Use "pomodoro start" to begin again.'));
      clearSession();
    }
  }
  
  pause() {
    if (!this.isRunning) {
      console.log(chalk.yellow('No timer is running!'));
      return;
    }
    
    if (this.isPaused) {
      console.log(chalk.yellow('Timer is already paused!'));
      return;
    }
    
    // Update remaining time before pausing
    this.updateRemainingTime();
    this.isPaused = true;
    this.pausedAt = Date.now();
    
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    console.log(chalk.yellow(`⏸  Timer paused at ${this.formatTime(this.remainingSeconds)}`));
    this.saveState();
  }
  
  resume() {
    if (!this.isRunning || !this.isPaused) {
      console.log(chalk.yellow('No paused timer to resume!'));
      return;
    }
    
    console.log(chalk.green(`▶️  Resuming timer at ${this.formatTime(this.remainingSeconds)}`));
    
    // Adjust start time to account for pause duration
    const pauseDuration = Date.now() - this.pausedAt;
    this.startTime += pauseDuration;
    this.isPaused = false;
    
    console.log(chalk.gray('\n💡 Timer is running in the background'));
    console.log(chalk.cyan('   Use "pomodoro status" to check progress\n'));
    
    // Restart background timer
    this.startBackgroundTimer();
    
    this.saveState();
  }
  
  stop(showMessage = true) {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    
    this.isRunning = false;
    this.isPaused = false;
    clearSession();
    
    if (showMessage) {
      console.log(chalk.red('⏹  Timer stopped and reset'));
    }
  }
  
  showStatus() {
    if (!this.isRunning) {
      console.log(chalk.gray('No timer is currently running'));
      console.log(chalk.gray(`Next session: ${this.getSessionEmoji()} ${this.getSessionName()}`));
      console.log(chalk.gray(`Completed cycles: ${this.completedCycles}/${this.config.cyclesBeforeLongBreak}`));
    } else {
      // Update remaining time for accurate display
      if (!this.isPaused) {
        this.updateRemainingTime();
      }
      
      const status = this.isPaused ? chalk.yellow('PAUSED') : chalk.green('RUNNING');
      const progressBar = this.createProgressBar();
      
      console.log(boxen(
        `${this.getSessionEmoji()} ${chalk.bold(this.getSessionName())}\n\n` +
        `Status: ${status}\n` +
        `Time Remaining: ${chalk.cyan(this.formatTime(this.remainingSeconds))}\n` +
        `Progress: ${progressBar}\n` +
        `Completed Cycles: ${this.completedCycles}/${this.config.cyclesBeforeLongBreak}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: this.getSessionColor()
        }
      ));
      
      // Check if session is complete
      if (this.remainingSeconds <= 0 && !this.isPaused) {
        this.handleSessionComplete();
      }
    }
  }
}

async function startTimer() {
  if (currentTimer && currentTimer.isRunning) {
    console.log(chalk.yellow('A timer is already running!'));
    currentTimer.showStatus();
    return;
  }
  
  currentTimer = await PomodoroTimer.restore();
  
  if (!currentTimer.isRunning) {
    currentTimer.start();
  }
}

async function pauseTimer() {
  const session = loadSession();
  if (!session || !session.isRunning) {
    console.log(chalk.yellow('No timer is running!'));
    return;
  }
  
  currentTimer = await PomodoroTimer.restore();
  currentTimer.pause();
}

async function resumeTimer() {
  const session = loadSession();
  if (!session || !session.isPaused) {
    console.log(chalk.yellow('No paused timer to resume!'));
    return;
  }
  
  currentTimer = await PomodoroTimer.restore();
  currentTimer.resume();
}

async function stopTimer() {
  const session = loadSession();
  if (!session) {
    console.log(chalk.gray('No timer to stop'));
    return;
  }
  
  currentTimer = await PomodoroTimer.restore();
  currentTimer.stop();
  currentTimer = null;
}

async function getStatus() {
  const session = loadSession();
  if (!session) {
    console.log(chalk.gray('No active timer session'));
    return;
  }
  
  currentTimer = await PomodoroTimer.restore();
  currentTimer.showStatus();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  if (currentTimer && currentTimer.isRunning) {
    currentTimer.saveState();
    console.log('\n' + chalk.cyan('Timer state saved. Session will resume when you return.'));
  }
  process.exit(0);
});

module.exports = {
  startTimer,
  pauseTimer,
  resumeTimer,
  stopTimer,
  getStatus
};