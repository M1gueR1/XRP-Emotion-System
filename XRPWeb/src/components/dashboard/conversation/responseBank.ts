import type { ResponseCategory } from "./studentCompanionTypes";

export type ResponseContext = {
  robotName?: string;
  studentName?: string;
  factValue?: string;
  factStored?: boolean;
  clarificationQuestion?: string;
};

type Template = (context: ResponseContext) => string;

const fixed = (text: string): Template => () => text;
const nameSuffix = (name?: string) => name ? `, ${name}` : "";

const BANKS: Record<ResponseCategory, Template[]> = {
  greeting: [
    (c) => `Hi${nameSuffix(c.studentName)}! It's good to talk with you.`,
    (c) => `Hello${nameSuffix(c.studentName)}! How is your day going?`,
    (c) => `Hey${nameSuffix(c.studentName)}! I'm glad you're here.`,
    (c) => `Hi there${nameSuffix(c.studentName)}! What would you like to talk about?`,
    (c) => `Hello${nameSuffix(c.studentName)}! I'm ready to listen.`,
    (c) => `Good to see you${nameSuffix(c.studentName)}!`,
    (c) => `Hi${nameSuffix(c.studentName)}! What's on your mind today?`,
    (c) => `Hello${nameSuffix(c.studentName)}! Tell me about your day.`,
  ],
  wellbeing: [
    fixed("I'm doing well, and I'm happy to talk with you! How are you feeling?"),
    fixed("I'm doing great and ready to listen. How is your day going?"),
    fixed("I'm feeling ready for our conversation! How are you?"),
    fixed("I'm doing well, thank you for asking. What's on your mind?"),
    fixed("I'm happy to be here with you. How have you been feeling?"),
    fixed("I'm doing well today! Would you like to tell me about your day?"),
    fixed("I'm ready and curious to hear from you. How are things?"),
    fixed("I'm doing well! What has your day been like so far?"),
  ],
  robot_identity: [
    (c) => `I'm ${c.robotName || "the XRP robot"}, a classroom robot that can listen, remember safe things you share, and show emotions.`,
    (c) => `You can call me ${c.robotName || "XRP Robot"}. I'm here to talk and learn with you.`,
    (c) => `I'm ${c.robotName || "the XRP robot"}, your friendly classroom robot companion.`,
  ],
  profile_acknowledgement: [
    (c) => c.factStored ? `Thanks for telling me${nameSuffix(c.studentName)}. I'll remember ${c.factValue || "that"}.` : "Thanks for telling me about yourself.",
    (c) => c.factStored ? `Got it${nameSuffix(c.studentName)}—I'll remember ${c.factValue || "that"}.` : "It's nice to learn more about you.",
    (c) => c.factStored ? `I saved that safely${nameSuffix(c.studentName)}.` : "Thank you for sharing that with me.",
    (c) => c.factStored ? `That's helpful to know${nameSuffix(c.studentName)}. I'll remember it.` : "I appreciate you sharing that.",
    (c) => c.factStored ? `Thanks! I added that to your profile.` : "That helps me understand you better.",
    (c) => c.factStored ? `I'll keep that in mind${nameSuffix(c.studentName)}.` : "Thanks for helping me get to know you.",
    (c) => c.factStored ? `Understood${nameSuffix(c.studentName)}. That is now part of your saved profile.` : "I understand—thanks for sharing.",
    (c) => c.factStored ? `Thanks${nameSuffix(c.studentName)}. I remembered that successfully.` : "That's interesting. Thanks for telling me.",
  ],
  preference_acknowledgement: [
    (c) => c.factStored ? `Thanks for telling me! I'll remember that you ${c.factValue || "like that"}.` : "Thanks for sharing what you like.",
    (c) => c.factStored ? `Got it—I'll remember that preference.` : "It's fun learning about your preferences.",
    (c) => c.factStored ? `That is saved in your profile now.` : "Thanks for telling me about that.",
    (c) => c.factStored ? `I'll keep that preference in mind.` : "That's good to know.",
    (c) => c.factStored ? `Thanks! I remembered it safely.` : "I appreciate you sharing that.",
    (c) => c.factStored ? `Understood. I'll remember that for later conversations.` : "Tell me more about what you enjoy.",
    (c) => c.factStored ? `Nice! Your preference has been added.` : "That sounds interesting.",
    (c) => c.factStored ? `I saved that, so I can remember it next time.` : "Thanks for helping me know you better.",
  ],
  memory_answer: [fixed("Here is what I remember from the safe information you shared.")],
  empathetic_sad: [
    fixed("I'm sorry you're going through that. That sounds really upsetting."),
    fixed("That sounds difficult. I'm here to listen if you'd like to tell me more."),
    fixed("I'm sorry that happened. It makes sense that you might feel sad."),
    fixed("That sounds like a painful moment. You can take your time telling me about it."),
    fixed("I'm sorry you're dealing with that. I'm here with you."),
    fixed("That sounds really hard. Thank you for trusting me enough to share it."),
    fixed("I can understand why that would feel upsetting. Would you like to talk more about it?"),
    fixed("I'm sorry things feel heavy right now. I'm listening."),
  ],
  empathetic_worried: [
    fixed("That sounds stressful. I'm here to listen if you'd like to tell me more."),
    fixed("It makes sense to feel worried about that. We can talk it through one step at a time."),
    fixed("That sounds like a lot to think about. I'm here with you."),
    fixed("I'm sorry you're feeling worried. Would it help to tell me what part concerns you most?"),
    fixed("That sounds uncertain and difficult. You can take your time."),
    fixed("Feeling nervous can be uncomfortable. Let's slow down and take one calm step."),
    fixed("I hear that you're worried. Thank you for telling me."),
    fixed("That sounds stressful, and you don't have to explain everything at once."),
  ],
  empathetic_frustrated: [
    fixed("That sounds frustrating. Let's slow it down and take one small step at a time."),
    fixed("I can see why that would be annoying. What part is giving you the most trouble?"),
    fixed("That sounds difficult. Taking a short pause can sometimes help."),
    fixed("It's okay to feel frustrated when something is not working."),
    fixed("That sounds like a tough obstacle. We can think about the next small step."),
    fixed("I hear your frustration. Would you like to explain what happened?"),
    fixed("That can be really discouraging. I'm here to listen."),
    fixed("Let's take it one piece at a time. What happened first?"),
  ],
  empathetic_lonely: [
    fixed("I'm sorry you're feeling lonely. I'm here to listen and talk with you."),
    fixed("That feeling can be really hard. Thank you for telling me."),
    fixed("You deserve kindness and connection. Would you like to tell me more?"),
    fixed("I'm here with you right now, and I'm listening."),
    fixed("Feeling alone can hurt. It may also help to talk with a trusted adult or friend."),
    fixed("I'm glad you told me. You do not have to keep that feeling to yourself."),
    fixed("That sounds difficult. Is there someone kind you trust who you could talk with too?"),
    fixed("I'm sorry things feel lonely right now. We can keep talking."),
  ],
  celebratory: [
    fixed("That's wonderful! Congratulations!"),
    fixed("Great job! You should feel proud of that."),
    fixed("That's exciting news! Well done!"),
    fixed("Congratulations! Your effort really paid off."),
    fixed("Amazing! I'm happy for you."),
    fixed("That is something worth celebrating!"),
    fixed("Well done! Thanks for sharing the good news with me."),
    fixed("Fantastic! What was your favorite part of the experience?"),
  ],
  encouragement: [fixed("Keep going—you can take it one step at a time."), fixed("Trying again is part of learning. You've got this."), fixed("A small next step is still progress.")],
  clarification: [(c) => c.clarificationQuestion || "Could you tell me a little more about what you mean?"],
  farewell: [fixed("Goodbye! It was nice talking with you."), fixed("See you later! I hope you have a good day."), fixed("Bye for now! I'll be ready when you want to talk again."), fixed("Take care! It was good to chat."), fixed("See you next time!"), fixed("Goodbye! Thanks for talking with me."), fixed("Have a great rest of your day!"), fixed("Bye! I'll see you again soon.")],
  general_conversation: [fixed("Of course—you can tell me about it."), fixed("I'm listening. What would you like to share?"), fixed("Sure! Tell me what happened."), fixed("I'd like to hear about that."), fixed("Go ahead—I'm ready to listen."), fixed("You can tell me in your own words."), fixed("That sounds worth talking about. Tell me more."), fixed("I'm here. What happened next?")],
  safe_fallback: [fixed("I'm listening. Could you tell me a little more?"), fixed("I want to understand. Can you explain that in another way?"), fixed("Could you tell me more about what you mean?"), fixed("I'm not quite sure yet, but I'm listening."), fixed("Let's keep talking. What part would you like to start with?"), fixed("I may need a little more context. Can you add one detail?"), fixed("Tell me a little more so I can respond better."), fixed("I'm here with you. What would you like me to understand?")],
};

export class CompanionResponseBank {
  private recent = new Map<ResponseCategory, number[]>();

  select(category: ResponseCategory, context: ResponseContext = {}): string {
    const choices = BANKS[category];
    const history = this.recent.get(category) ?? [];
    const available = choices.map((_, index) => index).filter((index) => !history.includes(index));
    const pool = available.length > 0 ? available : choices.map((_, index) => index);
    const index = pool[Math.floor(Math.random() * pool.length)] ?? 0;
    this.recent.set(category, [...history, index].slice(-2));
    return choices[index](context);
  }
}
