import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
interface Note {
  id: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
  tags: string[];
  color?: string;
  pinned?: boolean;
}

export function useNotes() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchNotes();
    }
  }, [user]);

  const fetchNotes = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notes')
        .select('*')
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setNotes(data || []);
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Erro ao carregar notas');
    } finally {
      setLoading(false);
    }
  };

  const addNote = async (note: Omit<Note, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([{
          ...note,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      setNotes(prev => [data, ...prev]);
      toast.success('Nota criada!');
      return data;
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Erro ao criar nota');
    }
  };

  const updateNote = async (id: string, updates: Partial<Note>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('notes')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setNotes(prev => prev.map(note => 
        note.id === id ? data : note
      ));
      toast.success('Nota atualizada!');
      return data;
    } catch (error) {
      console.error('Error updating note:', error);
      toast.error('Erro ao atualizar nota');
    }
  };

  const deleteNote = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('notes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setNotes(prev => prev.filter(note => note.id !== id));
      toast.success('Nota excluída!');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Erro ao excluir nota');
    }
  };

  return {
    notes,
    loading,
    addNote,
    updateNote,
    deleteNote,
    refresh: fetchNotes,
  };
}