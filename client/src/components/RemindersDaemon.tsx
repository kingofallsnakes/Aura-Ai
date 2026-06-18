import { useEffect, useState, useRef } from 'react';
import toast from 'react-hot-toast';
import { remindersAPI } from '../lib/api';

let globalAudioCtx: AudioContext | null = null;

const initAudio = () => {
  if (globalAudioCtx) return;
  try {
    const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    globalAudioCtx = new AudioContextClass();
  } catch (e) {
    console.error('Failed to init audio context', e);
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('click', initAudio, { once: true });
  window.addEventListener('keydown', initAudio, { once: true });
}

export default function RemindersDaemon() {
  const [upcomingReminders, setUpcomingReminders] = useState<{ id: string; title: string; remind_at: string }[]>([]);
  const fetchedRef = useRef(false);

  // Play a native soft "ding" using Web Audio API
  const playDing = () => {
    try {
      if (!globalAudioCtx) initAudio();
      const audioCtx = globalAudioCtx;
      if (!audioCtx) return;
      
      // Resume context if suspended (common browser autoplay policy)
      if (audioCtx.state === 'suspended') {
        audioCtx.resume();
      }
      
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      // Create a pleasant double-chime
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, audioCtx.currentTime); // A5
      oscillator.frequency.setValueAtTime(1108.73, audioCtx.currentTime + 0.15); // C#6
      
      gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
      gainNode.gain.linearRampToValueAtTime(0.5, audioCtx.currentTime + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      console.error('Audio play failed', e);
    }
  };

  const fetchReminders = async () => {
    try {
      const { data } = await remindersAPI.getAll({ upcoming: 'true' });
      setUpcomingReminders(data.reminders || []);
    } catch (err) {
      console.error('Failed to fetch daemon reminders', err);
    }
  };

  // Initial fetch and poll every 1 minute
  useEffect(() => {
    if (!fetchedRef.current) {
      fetchReminders();
      fetchedRef.current = true;
    }
    const interval = setInterval(fetchReminders, 60000);
    
    // Listen for manual updates (e.g. from RemindersPage)
    const handleUpdate = () => fetchReminders();
    window.addEventListener('reminders-updated', handleUpdate);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('reminders-updated', handleUpdate);
    };
  }, []);

  // Check every 5 seconds if a reminder is due
  useEffect(() => {
    if (upcomingReminders.length === 0) return;

    const checkInterval = setInterval(() => {
      const now = new Date().getTime();
      let triggeredAny = false;

      const remaining = upcomingReminders.filter((reminder) => {
        const remindTime = new Date(reminder.remind_at).getTime();
        
        // If the reminder is due (or past due by up to 5 minutes so we don't spam old ones if they just logged in)
        if (now >= remindTime && now - remindTime < 5 * 60000) {
          // Trigger!
          playDing();
          toast.success(`Reminder: ${reminder.title}`, {
            duration: 8000,
            icon: '🔔',
          });
          
          // Mark as completed on backend so it doesn't ring again
          remindersAPI.complete(reminder.id).catch(console.error);
          
          triggeredAny = true;
          return false; // Remove from local list
        }
        
        // Keep if not due yet, drop if way too old (> 5 mins past)
        return now < remindTime;
      });

      if (triggeredAny) {
        setUpcomingReminders(remaining);
      }
    }, 5000);

    return () => clearInterval(checkInterval);
  }, [upcomingReminders]);

  // Daemon renders nothing
  return null;
}
