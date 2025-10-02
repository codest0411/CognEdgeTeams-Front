import { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function useMessages(chatId) {
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!chatId) return;
    setLoading(true);
    setMessages([]);
    setError(null);
    const channel = supabase
      .channel(`messages:${chatId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `chat_id=eq.${chatId}`
      }, async (payload) => {
        const { data } = await supabase
          .from('messages')
          .select('*, user:auth.users(*)')
          .eq('id', payload.new.id)
          .single();
        setMessages(prev => [...prev, data]);
      })
      .subscribe();
    setLoading(false);
    return () => { supabase.removeChannel(channel); };
  }, [chatId]);

  const sendMessage = async (content) => {
    const user = supabase.auth.user();
    const { error } = await supabase
      .from('messages')
      .insert({ chat_id: chatId, user_id: user.id, content: content.trim() });
    return !error;
  };

  return { messages, loading, error, sendMessage, messagesEndRef, setError };
}
