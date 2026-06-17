# Summer Internship 2026 – Cornell University

### XRP Emotion Framework

**Author:** Miguel Roa

This repository contains the work developed during the Summer 2026 internship at Cornell University for the XRP Emotion Framework project.

The goal of this project is to provide an emotion system for the XRP robot that allows students to create, load, modify, and execute emotional behaviors through both the XRP IDE and MicroPython.

---

# Repository Structure

```text
XRP-Emotion-System/
│
├── XRPWeb/
├── XRP_MicroPython/
├── assets/
├── docs/
├── demos/
└── README.md
```

---

# Project Components

## XRPWeb

The `XRPWeb` folder contains the web-based XRP IDE and Dashboard.

This is where users can:

* Create and edit Emotion Definitions
* Configure Emotion Hardware behaviors
* Upload custom sprite sheets
* Manage emotion packs
* Visualize robot emotions in the Dashboard
* Send emotion data to the XRP robot

Main technologies:

* React
* TypeScript
* Vite
* Blockly
* XRP Dashboard

### Relevant Features Added

* Emotion Framework Dashboard
* Emotion Configuration Editor
* Emotion Hardware Configuration
* Emotion Storage and Management
* Sprite Sheet Support
* Emotion Import / Export
* Dashboard Emotion Visualization

---

## XRP_MicroPython

The `XRP_MicroPython` folder contains the firmware-side implementation that runs directly on the XRP robot.

This includes:

* Emotion execution logic
* Emotion definitions
* Dashboard communication
* Robot hardware integration
* Line follower demo
* Sound playback
* OLED display support

### Main Modules

```text
EmotionLib/
│
├── emotion.py
├── emotion_definition.py
├── emotion_hardware.py
├── emotion_motion.py
├── emotion_voice.py
└── emotion_xpp.py
```

Responsibilities:

| Module                | Purpose                       |
| --------------------- | ----------------------------- |
| emotion.py            | Core emotion class            |
| emotion_definition.py | Emotion definition data model |
| emotion_hardware.py   | Hardware configuration system |
| emotion_motion.py     | Motion control integration    |
| emotion_voice.py      | Audio and sound support       |
| emotion_xpp.py        | Dashboard communication       |

---

# Installation

## 1. Clone Repository

```bash
git clone <YOUR_REPOSITORY_URL>
cd XRP-Emotion-System
```

---

# Running XRPWeb

## Install Dependencies

```bash
cd XRPWeb
npm install
```

or

```bash
npm ci
```

## Start Development Server

```bash
npm run dev
```

The IDE should now be available in your browser.

---

## Build Production Version

```bash
npm run build
```

---

# Running XRP_MicroPython

## Open XRP IDE

Connect the XRP robot using:

* USB
* Bluetooth (if supported)

---

## Upload Emotion Library

Copy the EmotionLib folder into the XRP filesystem.

Required structure:

```text
EmotionLib/
├── __init__.py
├── emotion.py
├── emotion_definition.py
├── emotion_hardware.py
├── emotion_motion.py
├── emotion_voice.py
└── emotion_xpp.py
```

---

## Execute Demo Programs

Example:

```python
from EmotionLib import *

# Load emotion
emotion = Emotion(...)

# Execute emotion
emotion.execute()
```

---

# Typical Development Workflow

## Dashboard Development

Terminal 1:

```bash
cd XRPWeb
npm run dev
```

---

## Firmware Development

Edit files inside:

```text
XRP_MicroPython/
```

Upload modified files to the XRP robot and test directly on hardware.

---

# Demo Flow

Current demonstration workflow:

1. Connect XRP robot
2. Open XRPWeb
3. Load emotion pack
4. Configure hardware mappings
5. Start demo program
6. Observe:

   * Dashboard emotion changes
   * OLED display updates
   * Robot motion reactions
   * Sound playback

---

# Assets

The `assets` folder stores:

```text
assets/
│
├── sample-emotion-packs/
├── sprites/
└── sounds/
```

These files can be imported into XRPWeb and used as examples for students.

---

# Documentation

Additional documentation can be found in:

```text
docs/
```

Suggested contents:

```text
docs/
├── ARCHITECTURE.md
├── DEMO_CHECKLIST.md
├── UPSTREAM.md
└── DEVELOPMENT_NOTES.md
```

---

# Educational Goal

The XRP Emotion Framework is designed to help students learn:

* Programming
* Robotics
* Human-Robot Interaction
* State Machines
* Event-Driven Systems
* Emotional Computing Concepts

Students can create their own emotional behaviors, upload custom sprite sheets, and extend the framework with new emotions and interactions.

---

# Summer 2026 Internship

Developed during the Summer 2026 Cornell University internship project focused on extending the XRP educational robotics ecosystem with emotional and interactive behaviors.
