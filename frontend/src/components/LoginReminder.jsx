import { useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

const buildMessages = (name) => [
  `${getGreeting()}, ${name}! Ready to make today productive?`,
  'Please complete your daily follow-ups.',
  "Don't forget to update the status on your pending records.",
  'Keep pushing towards your daily target!',
  'Remember to add a comment after every call you make.',
  'Check your Follow Up tab for anything due today.',
  'Stay consistent — small, steady effort adds up fast.',
  'Try to clear your "Pending" records before the day ends.',
  "You're doing great — keep up the momentum!",
  "Let's finish strong today!",
];

// First 2 messages (greeting + follow-up reminder) arrive quickly, close
// together. Every message after that arrives spaced 10 minutes apart, so
// reminders trickle in gently across the day instead of all at once.
const FIRST_DELAY_MS = 800;
const SHORT_GAP_MS = 4500;
const LONG_GAP_MS = 10 * 60 * 1000;

export default function LoginReminder() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const hasRun = useRef(false);
  const userId = user?.id;
  const userName = user?.name;

  useEffect(() => {
    if (!userId || hasRun.current) return;

    const today = new Date().toISOString().slice(0, 10);
    const storageKey = `reminder_shown_${userId}_${today}`;

    if (localStorage.getItem(storageKey)) return;

    hasRun.current = true;
    localStorage.setItem(storageKey, 'true');

    const messages = buildMessages(userName || 'there');

    messages.forEach((msg, i) => {
      let delay;
      if (i === 0) delay = FIRST_DELAY_MS;
      else if (i === 1) delay = FIRST_DELAY_MS + SHORT_GAP_MS;
      else delay = FIRST_DELAY_MS + SHORT_GAP_MS + (i - 1) * LONG_GAP_MS;

      setTimeout(() => showToast(msg, 'success'), delay);
    });
    // Deliberately no cleanup — see note in previous version about Strict
    // Mode double-invoke; the hasRun guard already prevents double-scheduling.
  }, [userId, userName, showToast]);

  return null;
}