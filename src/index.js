#!/usr/bin/env node

const { program } = require('commander');
const chalk = require('chalk');
const boxen = require('boxen').default;
const { startTimer, pauseTimer, resumeTimer, stopTimer, getStatus } = require('./timer');
const { getConfig, setConfig, resetConfig } = require('./config');
const InteractiveTimer = require('./interactive-blessed');

console.log(boxen(
  chalk.bold.red('🍅 Tomato Pomodoro'),
  {
    padding: 1,
    margin: 1,
    borderStyle: 'round',
    borderColor: 'red'
  }
));

program
  .name('pomodoro')
  .description('🍅 Tomato Pomodoro - A modern CLI productivity timer with elegant UI and smart notifications')
  .version('1.0.0');

program
  .command('start')
  .description('Start a new Tomato Pomodoro session (interactive mode)')
  .option('--classic', 'Use classic non-interactive mode')
  .action((options) => {
    if (options.classic) {
      startTimer();
    } else {
      // Hide the banner in interactive mode
      console.clear();
      const timer = new InteractiveTimer();
      timer.run();
    }
  });

program
  .command('interactive')
  .alias('i')
  .description('Start interactive mode with real-time display')
  .action(() => {
    console.clear();
    const timer = new InteractiveTimer();
    timer.run();
  });

program
  .command('pause')
  .description('Pause the current timer (classic mode)')
  .action(() => {
    pauseTimer();
  });

program
  .command('resume')
  .description('Resume a paused timer (classic mode)')
  .action(() => {
    resumeTimer();
  });

program
  .command('stop')
  .description('Stop and reset the current timer (classic mode)')
  .action(() => {
    stopTimer();
  });

program
  .command('status')
  .description('Show current timer status (classic mode)')
  .action(() => {
    getStatus();
  });

program
  .command('config')
  .description('Configure Tomato Pomodoro settings')
  .option('-w, --work <minutes>', 'Set work session duration (default: 25)')
  .option('-s, --short <minutes>', 'Set short break duration (default: 5)')
  .option('-l, --long <minutes>', 'Set long break duration (default: 15)')
  .option('-c, --cycles <count>', 'Set work cycles before long break (default: 4)')
  .option('--show', 'Show current configuration')
  .option('--reset', 'Reset to default configuration')
  .action((options) => {
    if (options.reset) {
      resetConfig();
      console.log(chalk.green('✓ Configuration reset to defaults'));
      return;
    }
    
    if (options.show) {
      const config = getConfig();
      console.log(boxen(
        `${chalk.bold('Current Configuration')}\n\n` +
        `Work Session: ${chalk.cyan(config.workDuration)} minutes\n` +
        `Short Break: ${chalk.green(config.shortBreakDuration)} minutes\n` +
        `Long Break: ${chalk.blue(config.longBreakDuration)} minutes\n` +
        `Cycles before Long Break: ${chalk.yellow(config.cyclesBeforeLongBreak)}`,
        {
          padding: 1,
          borderStyle: 'round',
          borderColor: 'cyan'
        }
      ));
      return;
    }
    
    const updates = {};
    if (options.work) updates.workDuration = parseInt(options.work);
    if (options.short) updates.shortBreakDuration = parseInt(options.short);
    if (options.long) updates.longBreakDuration = parseInt(options.long);
    if (options.cycles) updates.cyclesBeforeLongBreak = parseInt(options.cycles);
    
    if (Object.keys(updates).length > 0) {
      setConfig(updates);
      console.log(chalk.green('✓ Configuration updated'));
    } else {
      program.commands.find(c => c.name() === 'config').help();
    }
  });

program.parse(process.argv);

if (!process.argv.slice(2).length) {
  program.outputHelp();
}