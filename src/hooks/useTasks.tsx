import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: string;
  due_date?: string;
  created_at: string;
  updated_at: string;
  tags: string[];
}

export function useTasks() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchTasks();
    }
  }, [user]);

  const fetchTasks = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('completed', { ascending: true })
        .order('priority', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTasks(data || []);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      toast.error('Erro ao carregar tarefas');
    } finally {
      setLoading(false);
    }
  };

  const addTask = async (task: Omit<Task, 'id' | 'created_at' | 'updated_at'>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert([{
          ...task,
          user_id: user.id,
        }])
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => [data, ...prev]);
      toast.success('Tarefa criada!');
      return data;
    } catch (error) {
      console.error('Error adding task:', error);
      toast.error('Erro ao criar tarefa');
    }
  };

  const updateTask = async (id: string, updates: Partial<Task>) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setTasks(prev => prev.map(task => 
        task.id === id ? data : task
      ));
      toast.success('Tarefa atualizada!');
      return data;
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Erro ao atualizar tarefa');
    }
  };

  const deleteTask = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('tasks')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setTasks(prev => prev.filter(task => task.id !== id));
      toast.success('Tarefa excluída!');
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Erro ao excluir tarefa');
    }
  };

  return {
    tasks,
    loading,
    addTask,
    updateTask,
    deleteTask,
    refresh: fetchTasks,
  };
}