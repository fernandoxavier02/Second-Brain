import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
interface Thought {
  id: string;
  content: string;
  created_at: string;
  mood?: string;
  tags: string[];
}

export function useThoughts() {
  const [thoughts, setThoughts] = useState<Thought[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchThoughts();
    }
  }, [user]);

  const fetchThoughts = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('thoughts')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setThoughts(data || []);
    } catch (error) {
      console.error('Error fetching thoughts:', error);
      toast.error('Erro ao carregar pensamentos');
    } finally {
      setLoading(false);
    }
  };

  const addThought = async (thought: Omit<Thought, 'id' | 'created_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('thoughts')
        .insert([{
          ...thought,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      setThoughts(prev => [data, ...prev]);
      toast.success('Pensamento salvo!');
      return data;
    } catch (error) {
      console.error('Error adding thought:', error);
      toast.error('Erro ao salvar pensamento');
    }
  };

  const updateThought = async (id: string, updates: Partial<Thought>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('thoughts')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setThoughts(prev => prev.map(thought => 
        thought.id === id ? data : thought
      ));
      toast.success('Pensamento atualizado!');
      return data;
    } catch (error) {
      console.error('Error updating thought:', error);
      toast.error('Erro ao atualizar pensamento');
    }
  };

  const deleteThought = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('thoughts')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setThoughts(prev => prev.filter(thought => thought.id !== id));
      toast.success('Pensamento excluído!');
    } catch (error) {
      console.error('Error deleting thought:', error);
      toast.error('Erro ao excluir pensamento');
    }
  };

  return {
    thoughts,
    loading,
    addThought,
    updateThought,
    deleteThought,
    refresh: fetchThoughts,
  };
}