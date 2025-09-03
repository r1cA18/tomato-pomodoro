const { exec, execFile } = require('child_process');
const chalk = require('chalk');

function sendNotification(title, message, sound = true) {
  const soundFlag = sound ? 'sound name "Glass"' : '';

  // Escape for AppleScript string literals (double quotes and backslashes)
  const escAS = (s) => (s ?? '')
    .toString()
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"');

  const script = `display notification "${escAS(message)}" with title "${escAS(title)}" ${soundFlag}`;

  // Use execFile to avoid shell quoting issues with apostrophes in text
  execFile('osascript', ['-e', script], (error) => {
    if (error) {
      console.error(chalk.red('Failed to send notification:'), error.message);
    }
  });

  // Also show in terminal for visibility
  console.log('\n' + chalk.bgBlue.white.bold(` ${title} `) + ' ' + chalk.cyan(message) + '\n');
}

function playSound() {
  exec('afplay /System/Library/Sounds/Glass.aiff', (error) => {
    if (error) {
      // Silently fail if sound doesn't play
    }
  });
}

module.exports = {
  sendNotification,
  playSound
};
