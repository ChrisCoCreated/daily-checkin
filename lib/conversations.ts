import { Contact } from './db';

export interface ConversationSetData {
  name: string;
  description: string;
  greeting_template: string;
  follow_up_template: string | null;
  closing_template: string;
}

export interface TemplateVariables {
  name?: string;
  organisation?: string;
  escalation_name?: string;
  escalation_number?: string;
}

/**
 * Replace template variables in a string with actual values
 * Supports {name}, {organisation}, {escalation_name}, {escalation_number}
 */
export function renderTemplate(
  template: string,
  contact: Contact | null
): string {
  if (!contact) {
    // If no contact, replace variables with empty strings or fallbacks
    return template
      .replace(/{name}/g, '')
      .replace(/{organisation}/g, '')
      .replace(/{escalation_name}/g, '')
      .replace(/{escalation_number}/g, '')
      .trim();
  }

  return template
    .replace(/{name}/g, contact.name || '')
    .replace(/{organisation}/g, contact.organisation || '')
    .replace(/{escalation_name}/g, contact.escalation_name || '')
    .replace(/{escalation_number}/g, contact.escalation_number || '')
    .trim();
}

/**
 * Default conversation sets
 */
export const DEFAULT_CONVERSATION_SETS: ConversationSetData[] = [
  {
    name: 'current',
    description: 'Simple, straightforward check-in (original)',
    greeting_template: 'Hello! This is your daily check-in call. How are you feeling today?',
    follow_up_template: null, // Use AI-generated
    closing_template: 'Thanks for chatting with me today. Take care and have a good day.',
  },
  {
    name: 'personalized',
    description: 'Personalized greeting with name and organisation mention',
    greeting_template: 'Hello {name}, this is an automated call to see how you\'re doing. If needed, we can escalate to {organisation}. How are you feeling today?',
    follow_up_template: null, // Use AI-generated
    closing_template: 'Thanks for chatting with me today, {name}. Take care and have a good day.',
  },
  {
    name: 'formal',
    description: 'Professional and formal tone',
    greeting_template: 'Good day. This is an automated wellbeing check-in call. How are you doing today?',
    follow_up_template: null, // Use AI-generated
    closing_template: 'Thank you for your time. We appreciate you taking this call. Have a pleasant day.',
  },
  {
    name: 'casual',
    description: 'Friendly and casual tone',
    greeting_template: 'Hey there! Just calling to check in and see how you\'re doing today. What\'s going on?',
    follow_up_template: null, // Use AI-generated
    closing_template: 'Alright, thanks for chatting! Take it easy and have a great day!',
  },
];

/**
 * Get default conversation set by name
 */
export function getDefaultConversationSet(name: string): ConversationSetData | undefined {
  return DEFAULT_CONVERSATION_SETS.find(set => set.name === name);
}

/**
 * Get the default "current" conversation set
 */
export function getDefaultCurrentSet(): ConversationSetData {
  return DEFAULT_CONVERSATION_SETS.find(set => set.name === 'current')!;
}

