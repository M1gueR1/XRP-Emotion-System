# AGENTS.md — XRP Emotion System

This file gives Codex durable project instructions for the XRP Emotion System repository.

Before editing anything, inspect the repository structure and identify the relevant files. Do not make changes until you understand the current architecture. For the first turn in a new session, summarize what you found and ask for the specific next task.

## Project summary
You are helping me continue an existing React + TypeScript project called XRP Emotion System.

Before editing anything, inspect the repository structure and identify the relevant files. Do not make changes until you understand the current architecture. After inspecting, summarize what you found and ask me for the specific next task.

## Project summary

This project is a web dashboard for an XRP robot / social robot. The robot can show emotions, respond to voice, use camera/vision, and chat with a student. The project is intended for classroom/children demos, so safety is important.

The main frontend app is inside:

XRPWeb/

The dashboard code is mostly inside:

XRPWeb/src/components/dashboard/

Important current widgets/features:

1. Emotion Face
- Shows the robot emotion.
- Receives emotion previews from chat, voice, and camera.
- Official emotion IDs:
  - idle: 0
  - happy: 1
  - chuckled: 2
  - excited: 3
  - celebration: 4
  - amazed: 5
  - puzzled: 6
  - frustrated: 7
  - upset: 8
  - sad: 9
  - angry: 10
  - love_it: 11
  - in_love: 12
  - delighted: 13
  - ready_to_race: 14

2. Robot Chat
- Main social chatbot widget.
- File:
  XRPWeb/src/components/dashboard/sensors/RobotChatWidget.tsx
- Supports user profiles/memory.
- Supports local reasoning.
- Supports local ML emotion classifier.
- Supports local empathy engine.
- Supports optional Gemini fallback.
- Supports custom chat keywords.
- Supports voice-to-chat input.
- Must always run child-safety checks before memory, ML, Gemini, or custom replies.

3. Voice layer
- Main files:
  XRPWeb/src/components/dashboard/voice/VoiceCommandPanel.tsx
  XRPWeb/src/components/dashboard/voice/useVoiceCommands.ts
- Voice commands can trigger movement/emotions.
- Voice can also send transcript to Robot Chat using the event:
  xrp:robot-chat-voice-input
- There is a voice-to-chat buffer/stabilizer to avoid sending fragments like “I am”, “years old”, etc. as multiple chat messages.
- Voice panel has:
  Chat voice mode:
  - Auto after pause
  - Manual send
  - Off

4. Camera Vision
- Main files:
  XRPWeb/src/components/dashboard/sensors/CameraVisionWidget.tsx
  XRPWeb/src/components/dashboard/vision/
- Camera emits dashboard emotion preview events.
- Emotion Face listens and previews emotion.

5. User memory/profile
- Main file:
  XRPWeb/src/components/dashboard/profiles/userProfileStore.ts
- The robot learns safe details like name, age, likes, pets, origin, etc.
- It must not save unsafe content.
- It should avoid fake names like “really”, “me”, “my”, “sad”, “happy”, etc.

6. Custom chat keywords
- Main file:
  XRPWeb/src/components/dashboard/keywords/customChatKeywordStore.ts
- Allows teacher-defined:
  If chat contains: ...
  Emotion: ...
  Robot reply: ...
- Custom chat keywords must only be editable in Teacher Mode.
- The system must block unsafe custom keyword phrases/replies.

7. Teacher Mode + child safety
- Main files:
  XRPWeb/src/components/dashboard/safety/childSafetyEngine.ts
  XRPWeb/src/components/dashboard/safety/childSafetyPolicyStore.ts
  XRPWeb/src/components/dashboard/safety/localSafetyClassifier.ts
- Teacher Mode is inside RobotChatWidget.
- Default demo passcode:
  teacher123
- Teacher Mode protects:
  - safety rules
  - custom chat keywords
  - Gemini settings/API key
  - robot name
  - delete active profile
- Child-safety categories:
  - weapons
  - drugs
  - alcohol
  - death
  - war
  - violence
  - self_harm
  - adult_content
  - profanity
- Safety pipeline:
  Student message / voice transcript
  → exact terms
  → fuzzy typo matching
  → synonyms/semantic examples
  → local safety classifier
  → only if safe: memory / local reasoning / local ML / Gemini / reply
- Unsafe messages should:
  - be blocked
  - not call Gemini
  - not update memory
  - not trigger custom chat keyword response
  - receive the safe classroom reply

8. Local Empathy Engine
- Main file:
  XRPWeb/src/components/dashboard/empathy/localEmpathyEngine.ts
- Purpose: avoid bad fallback replies like “I am listening.”
- It should detect emotional messages locally, even when Gemini is off.
- It should use general safe replies, not overly specific replies.
- Example:
  “My dog is sick and I am worried”
  “My father is sick and I am worried”
  should both respond generally:
  “I'm sorry you're feeling worried. That sounds really hard, and I'm here with you.”
- Do not over-assume the subject. Avoid responses like “I hope your pet feels better” unless extremely certain.
- It also has a safe name guard so fake names like “Me” are not used in replies.

9. AI response modes
Inside Teacher Mode → AI options:
- Local only
  Never calls Gemini.
- Smart Gemini fallback
  Calls Gemini when local confidence is low, but not when there is a strong local answer.
- Rescue with Gemini
  Tries local first. If the final local answer would be weak, like “I am listening.”, then Gemini rescues the answer.
- Safety must always run before any Gemini call.

## Current architecture map

The frontend is a React 18 + TypeScript application built with Vite. The main application is in `XRPWeb/`, and the dashboard is composed in:

XRPWeb/src/components/dashboard/xrp-dashboard.tsx

Robot Chat is the central coordinator for the social-robot behavior:

- `sensors/RobotChatWidget.tsx`
  - owns the chat UI and response pipeline
  - receives typed and voice-to-chat messages
  - runs child-safety checks before custom replies, memory updates, local reasoning, local ML, or Gemini
  - coordinates Teacher Mode and protected settings
- `profiles/userProfileStore.ts`
  - stores profiles, facts, structured memories, and the active profile
- `social/localSocialReasoningEngine.ts`
  - produces local context- and memory-aware responses
- `ml/localEmotionClassifier.ts`
  - classifies emotions locally and provides an additional local empathy response layer
- `empathy/localEmpathyEngine.ts`
  - detects emotional messages, produces safe general replies, and identifies weak local fallbacks
- `keywords/customChatKeywordStore.ts`
  - stores and matches teacher-defined chat rules
- `llm/geminiRobotChatAdapter.ts`
  - handles optional Gemini requests, response normalization, and proposed memory updates
- `text/chatTextNormalizer.ts`
  - normalizes chat input before reasoning

Voice-to-chat flow:

1. `voice/useVoiceCommands.ts` wraps browser speech recognition and classifies voice commands.
2. `voice/VoiceCommandPanel.tsx` owns Chat voice mode, stabilizes transcript fragments, and dispatches the `xrp:robot-chat-voice-input` browser event.
3. `sensors/RobotChatWidget.tsx` listens for that event and sends the transcript through the same safety and response pipeline as typed chat.

Teacher Mode and safety:

- Teacher Mode UI and unlocking are implemented inside `sensors/RobotChatWidget.tsx`.
- `safety/childSafetyPolicyStore.ts` manages policy persistence, categories, passcode verification, reset, import, and export.
- `safety/childSafetyEngine.ts` coordinates exact, fuzzy, semantic, classifier, and custom-term checks.
- `safety/localSafetyClassifier.ts` provides the local classification layer.
- `keywords/customChatKeywordStore.ts` contains protected custom reply rules.

The current production build passes with:

cd XRPWeb
npm run build

## Important design principles

- Do not remove existing features.
- Prefer small, targeted changes.
- Preserve the current file structure unless a refactor is explicitly requested.
- Keep UI style consistent: dark/black backgrounds, white text, white borders.
- Do not introduce external dependencies unless I explicitly approve.
- Always run:
  cd XRPWeb
  npm run build
- If build fails, fix TypeScript/build errors.
- After changes, summarize:
  - files changed
  - why changed
  - how to test
  - whether npm run build passed

## Current known priority

The project is now focused on making the robot feel like a safe, empathetic social robot for children:
- better local empathy
- safety before memory/Gemini
- Teacher Mode protected settings
- voice-to-chat working naturally
- no unsafe custom keywords
- no weak “I am listening” replies for emotional messages

First, inspect the repo and summarize the current architecture you see. Do not edit yet.
