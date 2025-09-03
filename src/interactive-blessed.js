#!/usr/bin/env node
const blessed = require('blessed');
const contrib = require('blessed-contrib');
const chalk = require('chalk');
const { getConfig } = require('./config');
const { sendNotification } = require('./notifier');
const { saveSession, loadSession, clearSession } = require('./session');

const SESSION_TYPES = {
  WORK: 'work',
  SHORT_BREAK: 'shortBreak',
  LONG_BREAK: 'longBreak'
};

class InteractiveTimer {
  constructor() {
    this.config = getConfig();
    this.savedSession = loadSession();
    
    // Timer state - restore from saved session if available
    this.sessionType = this.savedSession?.sessionType || SESSION_TYPES.WORK;
    this.completedCycles = this.savedSession?.completedCycles || 0;
    this.isRunning = false;  // Always start paused for user control
    this.isPaused = false;
    this.remainingSeconds = this.savedSession?.remainingSeconds || this.config.workDuration * 60;
    this.waitingForStart = true;  // Always require explicit start
    this.showConfirm = false;
    
    // UI state
    this.messages = [];
    
    // Create screen
    this.screen = blessed.screen({
      smartCSR: true,
      title: '🍅 Tomato Pomodoro',
      fullUnicode: true,
      dockBorders: true
    });
    
    this.setupUI();
    this.setupCommands();
    this.startTimer();
  }
  
  setupUI() {
    // Main container - transparent to match terminal
    this.container = blessed.box({
      parent: this.screen,
      width: '100%',
      height: '100%'
    });
    
    // Timer display box - reduced height for cleaner display
    this.timerBox = blessed.box({
      parent: this.container,
      top: 0,
      left: 2,
      right: 2,
      height: 7,
      border: {
        type: 'line',
        fg: this.getSessionColor()
      },
      style: {
        border: {
          fg: this.getSessionColor()
        }
      },
      align: 'center',
      valign: 'middle',
      tags: true
    });
    
    // Timer content - keep inside borders with padding
    this.timerContent = blessed.text({
      parent: this.timerBox,
      align: 'center',
      top: 1,
      left: 1,
      right: 1,
      bottom: 1,
      tags: true,
      content: this.getTimerDisplay()
    });
    
    // Progress and status info box (legacy; hidden as progress is inside timer)
    this.progressBox = blessed.box({
      parent: this.container,
      top: 6,
      left: 2,
      right: 2,
      height: 3,
      hidden: true,
      style: {
        fg: 'white'
      },
      align: 'center',
      valign: 'middle',
      tags: true
    });
    
    // Progress content
    this.progressContent = blessed.text({
      parent: this.progressBox,
      align: 'center',
      valign: 'middle',
      content: ''
    });
    
    // Message log - flexible size
    this.messageBox = blessed.box({
      parent: this.container,
      top: 8,
      left: 2,
      right: 2,
      bottom: 3,  // Leave space for command box
      border: {
        type: 'line',
        fg: '#00bfa5'
      },
      label: ' Messages ',
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      keys: true,
      vi: true,
      style: {
        border: {
          fg: '#00bfa5'
        }
      }
    });
    
    this.messageLog = blessed.log({
      parent: this.messageBox,
      tags: true,
      scrollable: true,
      alwaysScroll: true,
      mouse: true,
      // Keep log content within borders to avoid right-edge overflow
      top: 1,
      left: 1,
      right: 1,
      bottom: 1
    });
    
    // Input box - single line
    this.inputBox = blessed.box({
      parent: this.container,
      bottom: 0,
      left: 2,
      right: 2,
      height: 3,  // Border + 1 line
      border: {
        type: 'line',
        fg: '#4caf50'
      },
      label: ' Command ',
      style: {
        border: {
          fg: '#4caf50'
        }
      }
    });
    
    this.input = blessed.textbox({
      parent: this.inputBox,
      inputOnFocus: true,
      keys: true,
      mouse: true,
      // Keep text within the bordered area
      height: 1,
      top: 0,
      left: 1,
      right: 1,
      style: {
        fg: 'white',
        focus: {
          fg: 'cyan'
        }
      }
    });
    
    // Focus on input
    this.input.focus();
    
    // Initial message with session recovery info
    if (this.savedSession) {
      this.addMessage('Welcome back! Session restored from previous run.', 'success');
      this.addMessage(`Current: ${this.getSessionName()} - ${this.formatTime(this.remainingSeconds)} remaining`, 'info');
      this.addMessage('Type /start to continue or /stop to reset.', 'info');
    } else {
      this.addMessage('Welcome to 🍅 Tomato Pomodoro! Type /help for commands.', 'info');
      this.addMessage('Type /start to begin your first productivity session.', 'info');
    }
  }
  
  setupCommands() {
    // Handle input submission
    this.input.on('submit', (value) => {
      this.handleCommand(value);
      this.input.clearValue();
      this.input.focus();
      this.screen.render();
    });
    
    // Handle escape/quit
    this.screen.key(['escape', 'q', 'C-c'], () => {
      if (this.isRunning) {
        this.saveState();
      }
      process.exit(0);
    });
    
    // Keep input focused
    this.screen.key(['enter'], () => {
      this.input.focus();
    });
  }
  
  handleCommand(cmd) {
    const trimmedCmd = cmd.trim().toLowerCase();
    
    if (this.showConfirm) {
      if (trimmedCmd === 'y' || trimmedCmd === 'yes') {
        this.showConfirm = false;
        this.isRunning = true;
        this.waitingForStart = false;
        // Clear and refresh UI for the new session to prevent layout drift
        this.prepareNextSessionUI();
        this.addMessage(`Starting ${this.getSessionName()}...`, 'success');
      } else if (trimmedCmd === 'n' || trimmedCmd === 'no') {
        this.showConfirm = false;
        this.addMessage('Timer stopped. Type /start to begin again.', 'info');
        clearSession();
      }
      return;
    }
    
    if (this.waitingForStart && trimmedCmd === '/start') {
      this.waitingForStart = false;
      this.isRunning = true;
      if (this.savedSession) {
        this.addMessage('🍅 Session resumed! Stay focused! 🚀', 'success');
      } else {
        this.addMessage('🍅 Tomato Timer started! Stay focused! 🚀', 'success');
      }
      return;
    }
    
    switch(trimmedCmd) {
      case '/pause':
        if (this.isRunning && !this.isPaused) {
          this.isPaused = true;
          this.addMessage('⏸  Timer paused', 'warning');
        } else {
          this.addMessage('Timer is not running or already paused', 'error');
        }
        break;
        
      case '/resume':
        if (this.isRunning && this.isPaused) {
          this.isPaused = false;
          this.addMessage('▶️  Timer resumed', 'success');
        } else {
          this.addMessage('No paused timer to resume', 'error');
        }
        break;
        
      case '/stop':
        this.isRunning = false;
        this.isPaused = false;
        this.remainingSeconds = this.getTotalSeconds();
        clearSession();
        this.addMessage('⏹  Timer stopped and reset', 'warning');
        this.waitingForStart = true;
        // Keep the interface tidy when user stops mid-session
        this.prepareNextSessionUI();
        break;
        
      case '/skip':
        if (this.isRunning) {
          this.handleSessionComplete();
        } else {
          this.addMessage('No active timer to skip', 'error');
        }
        break;
        
      case '/status':
        const status = this.isPaused ? 'PAUSED' : (this.isRunning ? 'RUNNING' : 'STOPPED');
        this.addMessage(`Status: ${status} | ${this.getSessionName()} | Cycles: ${this.completedCycles}/${this.config.cyclesBeforeLongBreak}`, 'info');
        break;
        
      case '/config':
        this.addMessage(`Work: ${this.config.workDuration}min | Short: ${this.config.shortBreakDuration}min | Long: ${this.config.longBreakDuration}min`, 'info');
        break;
        
      case '/help':
        this.addMessage('🍅 Tomato Pomodoro Commands:', 'info');
        this.addMessage('  /start  - Start/Resume the timer', 'info');
        this.addMessage('  /pause  - Pause the timer', 'info');
        this.addMessage('  /resume - Resume a paused timer', 'info');
        this.addMessage('  /stop   - Stop and reset timer', 'info');
        this.addMessage('  /skip   - Skip to next session', 'info');
        this.addMessage('  /status - Show current status', 'info');
        this.addMessage('  /config - Show configuration', 'info');
        this.addMessage('  /exit   - Save & exit (auto-resumes next time)', 'info');
        this.addMessage('  /help   - Show this help', 'info');
        break;
        
      case '/exit':
      case '/quit':
        if (this.isRunning) {
          this.saveState();
          this.addMessage('Session saved! Will resume next time.', 'success');
        }
        setTimeout(() => process.exit(0), 100);  // Brief delay to show message
        break;
        
      default:
        if (trimmedCmd.startsWith('/')) {
          this.addMessage(`Unknown command: ${trimmedCmd}. Type /help for available commands.`, 'error');
        }
    }
  }
  
  startTimer() {
    setInterval(() => {
      if (this.isRunning && !this.isPaused && this.remainingSeconds > 0) {
        this.remainingSeconds--;
        
        if (this.remainingSeconds <= 0) {
          this.handleSessionComplete();
        }
        
        // Save state every 5 seconds
        if (this.remainingSeconds % 5 === 0) {
          this.saveState();
        }
      }
      
      this.updateDisplay();
    }, 1000);
  }
  
  handleSessionComplete() {
    this.isRunning = false;
    
    const completionTitle = `${this.getSessionName()} Complete! ${this.getSessionEmoji()}`;
    const completionBody = this.sessionType === SESSION_TYPES.WORK 
      ? "Time for a break! Great work! 🎉"
      : "Break's over! Ready to focus? 💪";
    
    // Send system notification and mirror the same content in Messages pane
    sendNotification(completionTitle, completionBody);
    this.addMessage(`${completionTitle}  ${completionBody}`, 'success');
    
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
    
    this.remainingSeconds = this.getTotalSeconds();
    this.showConfirm = true;
    // Keep a clear prompt for the next action
    this.addMessage('🎉 Session complete!', 'success');
    this.addMessage(`Ready for ${this.getSessionName()}? (y/n)`, 'info');
    
    // Force UI refresh to maintain layout
    this.updateDisplay();
    this.input.focus();
    this.screen.render();
  }
  
  updateDisplay() {
    this.timerContent.setContent(this.getTimerDisplay());
    
    const color = this.getSessionColor();
    this.timerBox.style.border.fg = color;
    this.timerBox.border.fg = color;
    // Ensure all elements maintain their positions
    this.screen.render();
  }
  
  // Prepare a clean UI between sessions without rebuilding the whole screen
  prepareNextSessionUI() {
    // Clear log area to avoid cumulative growth affecting layout
    if (this.messageLog) {
      this.messageLog.setContent('');
      if (typeof this.messageLog.setScroll === 'function') {
        try { this.messageLog.setScroll(0); } catch (_) {}
      }
    }

    // Refresh timer visuals for the upcoming session
    if (this.timerContent) {
      this.timerContent.setContent(this.getTimerDisplay());
    }
    const color = this.getSessionColor();
    if (this.timerBox) {
      this.timerBox.style.border.fg = color;
      this.timerBox.border.fg = color;
    }

    // Keep input focused and redraw
    if (this.input && typeof this.input.focus === 'function') {
      this.input.focus();
    }
    this.screen.render();
  }
  
  getTimerDisplay() {
    const emoji = this.getSessionEmoji();
    const name = this.getSessionName();
    const time = this.formatTime(this.remainingSeconds);
    
    // Title + status/time + progress + cycle (always show gauge)
    const title = `${emoji} ${chalk.bold(name.toUpperCase())}`;
    const status = this.waitingForStart
      ? chalk.gray('Type /start to begin')
      : chalk.bold.cyan(time) + (this.isPaused ? chalk.yellow(' (PAUSED)') : '');

    const progress = this.getProgress();
    const progressBar = this.generateProgressBar();
    const cycleInfo = `Cycle ${this.completedCycles + (this.sessionType === SESSION_TYPES.WORK ? 1 : 0)}/${this.config.cyclesBeforeLongBreak}`;
    return `${title}\n${status}\n${progressBar} ${progress}%\n${chalk.gray(cycleInfo)}`;
  }
  
  generateProgressBar() {
    const progress = this.getProgress();
    // Dynamically size bar to avoid overflow while keeping a good visual length
    const sw = (this.screen && this.screen.width) ? this.screen.width : 80;
    const innerWidth = Math.max(10, sw - 10); // account for borders and padding
    const barLength = Math.max(10, Math.min(40, innerWidth - 8)); // leave room for " 100%"
    const filled = Math.floor((progress / 100) * barLength);
    const empty = barLength - filled;
    
    return chalk.green('█'.repeat(filled)) + chalk.gray('░'.repeat(empty));
  }
  
  getProgress() {
    const total = this.getTotalSeconds();
    if (total === 0) return 0;
    return Math.round(((total - this.remainingSeconds) / total) * 100);
  }
  
  getTotalSeconds() {
    switch(this.sessionType) {
      case SESSION_TYPES.WORK: return this.config.workDuration * 60;
      case SESSION_TYPES.SHORT_BREAK: return this.config.shortBreakDuration * 60;
      case SESSION_TYPES.LONG_BREAK: return this.config.longBreakDuration * 60;
      default: return this.config.workDuration * 60;
    }
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
      default: return '🍅';
    }
  }
  
  getSessionName() {
    switch(this.sessionType) {
      case SESSION_TYPES.WORK: return 'Work Session';
      case SESSION_TYPES.SHORT_BREAK: return 'Short Break';
      case SESSION_TYPES.LONG_BREAK: return 'Long Break';
      default: return 'Work Session';
    }
  }
  
  getSessionColor() {
    switch(this.sessionType) {
      case SESSION_TYPES.WORK: return '#ff5252'; // Modern red
      case SESSION_TYPES.SHORT_BREAK: return '#4caf50'; // Modern green
      case SESSION_TYPES.LONG_BREAK: return '#448aff'; // Modern blue
      default: return '#ff5252';
    }
  }
  
  addMessage(text, type = 'info') {
    const timestamp = new Date().toLocaleTimeString('en-US', { 
      hour12: false, 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit' 
    });
    
    let color = 'white';
    switch(type) {
      case 'success': color = 'green'; break;
      case 'error': color = 'red'; break;
      case 'warning': color = 'yellow'; break;
      case 'info': color = 'cyan'; break;
    }
    
    const message = `{gray-fg}${timestamp}{/} {${color}-fg}${text}{/}`;
    this.messageLog.log(message);
    this.screen.render();
  }
  
  saveState() {
    saveSession({
      sessionType: this.sessionType,
      completedCycles: this.completedCycles,
      remainingSeconds: this.remainingSeconds,
      isRunning: this.isRunning,
      isPaused: this.isPaused
    });
  }
  
  run() {
    this.screen.render();
  }
}

// Export for use
module.exports = InteractiveTimer;
