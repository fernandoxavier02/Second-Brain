import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';
import { toast } from 'sonner';
import { sanitizeInput, validateFileSize, validateAudioType, validateAudioContent } from '@/lib/security';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants: string[];
  audio_url?: string;
  transcript?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

export function useMeetings() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchMeetings();
    }
  }, [user]);

  const fetchMeetings = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setMeetings(data || []);
    } catch (error) {
      console.error('Error fetching meetings:', error);
      toast.error('Erro ao carregar reuniões');
    } finally {
      setLoading(false);
    }
  };

  const addMeeting = async (meeting: Omit<Meeting, 'id'>) => {
    if (!user) return;

    try {
      const sanitizedMeeting = {
        ...meeting,
        title: sanitizeInput(meeting.title, 200),
        participants: meeting.participants.map(p => sanitizeInput(p, 100)),
        transcript: meeting.transcript ? sanitizeInput(meeting.transcript, 50000) : undefined,
        user_id: user.id,
      };

      const { data, error } = await supabase
        .from('meetings')
        .insert([sanitizedMeeting])
        .select()
        .single();

      if (error) throw error;
      setMeetings(prev => [data, ...prev]);
      toast.success('Reunião salva com sucesso!');
      return data;
    } catch (error) {
      console.error('Error adding meeting:', error);
      toast.error('Erro ao salvar reunião');
    }
  };

  const updateMeeting = async (id: string, updates: Partial<Meeting>) => {
    if (!user) return;

    try {
      const sanitizedUpdates = { ...updates };
      if (sanitizedUpdates.title) {
        sanitizedUpdates.title = sanitizeInput(sanitizedUpdates.title, 200);
      }
      if (sanitizedUpdates.participants) {
        sanitizedUpdates.participants = sanitizedUpdates.participants.map(p => sanitizeInput(p, 100));
      }
      if (sanitizedUpdates.transcript) {
        sanitizedUpdates.transcript = sanitizeInput(sanitizedUpdates.transcript, 50000);
      }

      const { data, error } = await supabase
        .from('meetings')
        .update(sanitizedUpdates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      setMeetings(prev => prev.map(meeting => 
        meeting.id === id ? data : meeting
      ));
      toast.success('Reunião atualizada!');
      return data;
    } catch (error) {
      console.error('Error updating meeting:', error);
      toast.error('Erro ao atualizar reunião');
    }
  };

  const deleteMeeting = async (id: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('meetings')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMeetings(prev => prev.filter(meeting => meeting.id !== id));
      toast.success('Reunião excluída!');
    } catch (error) {
      console.error('Error deleting meeting:', error);
      toast.error('Erro ao excluir reunião');
    }
  };

  const uploadAudio = async (audioBlob: Blob, meetingId: string) => {
    if (!user) return;

    try {
      // Use centralized security validations
      if (!validateFileSize(audioBlob, 50)) {
        throw new Error('Arquivo de áudio muito grande. Tamanho máximo: 50MB');
      }

      if (!validateAudioType(audioBlob)) {
        throw new Error('Tipo de arquivo inválido. Apenas arquivos de áudio são permitidos');
      }

      if (!(await validateAudioContent(audioBlob))) {
        throw new Error('Arquivo de áudio inválido ou corrompido');
      }

      const fileName = `${user.id}/${meetingId}.webm`;
      const { data, error } = await supabase.storage
        .from('audio-recordings')
        .upload(fileName, audioBlob, {
          cacheControl: '3600',
          upsert: true,
        });

      if (error) throw error;

      // Since bucket is now private, generate signed URL with 24 hour expiry
      const { data: signedUrlData, error: signedUrlError } = await supabase.storage
        .from('audio-recordings')
        .createSignedUrl(fileName, 86400); // 24 hours expiry

      if (signedUrlError) {
        console.error('Error creating signed URL:', signedUrlError);
        throw signedUrlError;
      }

      return signedUrlData.signedUrl;
    } catch (error) {
      console.error('Error uploading audio:', error);
      toast.error('Erro ao fazer upload do áudio');
      throw error;
    }
  };

  return {
    meetings,
    loading,
    addMeeting,
    updateMeeting,
    deleteMeeting,
    uploadAudio,
    refresh: fetchMeetings,
  };
}