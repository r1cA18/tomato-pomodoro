# 🍅 Tomato Pomodoro

A modern CLI productivity timer with elegant UI and smart notifications for macOS. Enhance your focus and productivity with the time-tested Pomodoro Technique in your terminal.

![Node Version](https://img.shields.io/badge/node-%3E%3D14.0.0-brightgreen)
![License](https://img.shields.io/badge/license-ISC-blue)
![Version](https://img.shields.io/badge/version-1.0.0-orange)

## ✨ Features

- 🎨 **Modern Interactive UI** - Beautiful terminal interface powered by Blessed with real-time updates
- ⏱️ **Smart Timer Management** - Work sessions, short breaks, and long breaks with automatic transitions
- 🔔 **Native macOS Notifications** - Get notified when sessions complete with native system notifications
- 💾 **Session Persistence** - Automatically saves your progress, resume where you left off
- 🎯 **Customizable Durations** - Configure work, break, and cycle durations to match your workflow
- 🌈 **Visual Feedback** - Color-coded sessions with progress bars and status indicators
- ⌨️ **Command-based Control** - Simple commands for full timer control
- 🌙 **Dark Theme** - Modern dark theme design for reduced eye strain

## 📦 Installation

### Prerequisites
- Node.js (v14.0.0 or higher)
- npm or yarn
- macOS (for notification support)

### Install from source

```bash
# Clone the repository
git clone https://github.com/yourusername/tomato-pomodoro.git
cd tomato-pomodoro

# Install dependencies
npm install

# Link globally (optional)
npm link
```

## 🚀 Quick Start

```bash
# Start interactive mode (recommended)
npm start

# Or if linked globally
pomodoro start

# Once started, type /start to begin your first session
```

### 💾 Session Recovery

Tomato Pomodoro automatically saves your progress:

- **Auto-save**: Session is saved every 5 seconds while running
- **Exit anytime**: Use `/exit` to save and quit (or Ctrl+C)
- **Resume later**: Next time you start, your session is restored automatically
- **Continue or reset**: Choose to `/start` to continue or `/stop` to reset

```bash
# Example: Session recovery
$ npm start

Welcome back! Session restored from previous run.
Current: Work Session - 18:42 remaining
Type /start to continue or /stop to reset.

> /start  # Resume from where you left off
```

## 🎮 Interactive Mode

The interactive mode provides a beautiful, real-time terminal UI:

```
╭────────────────────────────────────────╮
│         🍅 WORK SESSION                │
│             24:35                       │
│  ████████████░░░░░░░░  58%             │
│         Cycle 1/4                       │
╰────────────────────────────────────────╯

Messages:
16:42:03 Welcome to 🍅 Tomato Pomodoro!
16:42:15 Timer started! Stay focused! 🚀

> /status   # Type commands here
```

### Available Commands

| Command | Description |
|---------|------------|
| `/start` | Begin new session or resume saved session |
| `/pause` | Pause the current timer |
| `/resume` | Resume a paused timer |
| `/stop` | Stop and reset the timer (clears saved session) |
| `/skip` | Skip to the next session |
| `/status` | Show current timer status |
| `/config` | Display current configuration |
| `/help` | Show all available commands |
| `/exit` | Save session and exit (auto-resumes next time) |

## ⚙️ Configuration

Configure your timer settings to match your workflow:

```bash
# Show current configuration
pomodoro config --show

# Set work session duration (in minutes)
pomodoro config -w 25

# Set short break duration
pomodoro config -s 5

# Set long break duration
pomodoro config -l 15

# Set number of cycles before long break
pomodoro config -c 4

# Reset to defaults
pomodoro config --reset
```

### Configuration Example

```bash
# Custom configuration for deep work
pomodoro config -w 50 -s 10 -l 30 -c 3
```

## 🍅 The Pomodoro Technique

The Pomodoro Technique is a time management method that uses a timer to break work into intervals:

1. **🍅 Work Session** (25 minutes) - Focus on your task
2. **☕ Short Break** (5 minutes) - Take a quick break
3. **🔄 Repeat** - Continue the cycle
4. **🌴 Long Break** (15 minutes) - After 4 work sessions, take a longer break

### Session Flow

```
🍅 Work → ☕ Break → 🍅 Work → ☕ Break → 🍅 Work → ☕ Break → 🍅 Work → 🌴 Long Break
```

## 🎨 UI Features

### Modern Dark Theme
The interface features a sleek dark theme optimized for long coding sessions:

- **Background**: Dark (#1a1a1a) for reduced eye strain
- **Work Sessions**: Vibrant red (#ff5252) 
- **Short Breaks**: Fresh green (#4caf50)
- **Long Breaks**: Calming blue (#448aff)
- **Modern Cyan Accents**: (#00bfa5) for UI elements

### Real-time Display
- Live countdown timer with seconds precision
- Visual progress bar
- Current cycle tracking
- Session history in message log
- Responsive layout that maintains structure

## 🛠️ Development

### Project Structure
```
tomato-pomodoro/
├── src/
│   ├── index.js              # Main entry point & CLI commands
│   ├── interactive-blessed.js # Interactive UI implementation
│   ├── timer.js              # Core timer logic
│   ├── session.js            # Session persistence
│   ├── config.js             # Configuration management
│   └── notifier.js           # macOS notification system
├── package.json
└── README.md
```

### Running in Development

```bash
# Run directly with node
node src/index.js start

# Run with npm
npm start

# Run specific commands
node src/index.js config --show
node src/index.js interactive
```

### Classic Mode

For a simpler experience without the interactive UI:

```bash
# Start in classic mode
pomodoro start --classic

# Classic mode commands
pomodoro pause
pomodoro resume
pomodoro stop
pomodoro status
```

## 🔔 Notifications

Tomato Pomodoro uses native macOS notifications to alert you when sessions complete.

### Enabling Notifications

1. Open System Preferences → Notifications & Focus
2. Allow notifications for Terminal or your terminal app
3. Set notification style to "Banners" or "Alerts"

### Notification Examples

- **Work Complete**: "🍅 Work Session Complete! Time for a break! Great work! 🎉"
- **Break Over**: "☕ Short Break Complete! Ready to focus? 💪"

## 🐛 Troubleshooting

### Command not found

```bash
# Ensure npm link was run
npm link

# Verify installation
which pomodoro

# Alternative: use direct execution
node src/index.js start
```

### Notifications not working

1. Check System Preferences → Notifications
2. Ensure Terminal has notification permissions
3. Try running with `sudo` if permission issues persist

### Session data issues

```bash
# Clear session data
rm -rf ~/.config/tomato-pomodoro/

# Restart the timer
pomodoro start
```

### UI rendering issues

- Ensure your terminal supports Unicode
- Try resizing your terminal window
- Use a modern terminal emulator (iTerm2, Hyper, etc.)

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow the existing code style
- Add tests for new features
- Update documentation as needed
- Keep commits atomic and meaningful

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Built with [Blessed](https://github.com/chjj/blessed) for the terminal UI
- [Blessed-contrib](https://github.com/yaronn/blessed-contrib) for enhanced UI components
- Inspired by Francesco Cirillo's Pomodoro Technique
- [node-notifier](https://github.com/mikaelbr/node-notifier) for system notifications
- [Commander.js](https://github.com/tj/commander.js) for CLI parsing
- [Chalk](https://github.com/chalk/chalk) for terminal styling

## 📊 Stats & Benefits

### Why Pomodoro?

- **🎯 Improved Focus**: 25-minute intervals optimize concentration
- **📈 Better Time Tracking**: Measure productivity in completed pomodoros
- **🧠 Reduced Mental Fatigue**: Regular breaks prevent burnout
- **⚡ Increased Motivation**: Small wins throughout the day

### Productivity Tips

1. **Plan your pomodoros**: List tasks before starting
2. **Avoid distractions**: Put devices on silent during work sessions
3. **Move during breaks**: Stand, stretch, or walk
4. **Stay hydrated**: Use breaks to drink water
5. **Review progress**: Check completed cycles at day's end

## 🐛 Known Issues

- Notification support is currently limited to macOS
- Terminal must support Unicode for proper emoji display
- Some terminal emulators may have color rendering differences

## 📮 Support

If you encounter any issues or have questions, please file an issue on the GitHub repository.

## 🚀 Roadmap

- [ ] Windows and Linux notification support
- [ ] Statistics and productivity tracking
- [ ] Task integration
- [ ] Sound notifications
- [ ] Web dashboard
- [ ] Mobile companion app

---

Made with 🍅 and ❤️ for productivity enthusiasts