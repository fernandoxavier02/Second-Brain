import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Mic, Square, Play, Pause, Brain, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type SmartContent = Record<string, unknown>;

interface SmartRecorderProps {
  onContentCreated: (
    type: 'note' | 'task' | 'thought',
    content: SmartContent
  ) => void;
}

type RecordingType = 'note' | 'task' | 'thought';

export const SmartRecorder = ({ onContentCreated }: SmartRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [recordingType, setRecordingType] = useState<RecordingType>('note');
  const [isProcessing, setIsProcessing] = useState(false);
  const [generatedContent, setGeneratedContent] = useState<string>('');
  const [showAdjustmentDialog, setShowAdjustmentDialog] = useState(false);
  const [adjustmentPrompt, setAdjustmentPrompt] = useState('');
  const [isAdjusting, setIsAdjusting] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        toast({
          title: "Navegador não suportado",
          description: "Seu navegador não suporta gravação de áudio",
          variant: "destructive",
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        }
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : undefined
      });
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Process the audio automatically
        await processAudio(blob);
        
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Gravação iniciada",
        description: `Gravando ${recordingType === 'note' ? 'nota' : recordingType === 'task' ? 'tarefa' : 'pensamento'}...`,
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Erro",
        description: error instanceof Error && error.name === 'NotAllowedError' 
          ? "Permissão negada para usar o microfone. Por favor, permita o acesso."
          : "Não foi possível acessar o microfone",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      
      toast({
        title: "Processando gravação",
        description: "A IA está analisando sua gravação...",
      });
    }
  };

  const processAudio = async (blob: Blob) => {
    setIsProcessing(true);
    try {
      // Convert blob to base64 safely
      const buffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      const chunkSize = 0x8000; // 32KB chunks to prevent stack overflow
      
      for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binary += String.fromCharCode.apply(null, Array.from(chunk));
      }
      
      const base64Audio = btoa(binary);

      const { data, error } = await supabase.functions.invoke('create-smart-content', {
        body: {
          audio: base64Audio,
          contentType: recordingType
        }
      });

      if (error) throw error;

      setGeneratedContent(data.content);
      
      toast({
        title: "Conteúdo gerado!",
        description: `${recordingType === 'note' ? 'Nota' : recordingType === 'task' ? 'Tarefa' : 'Pensamento'} criado(a) com sucesso.`,
      });
    } catch (error) {
      console.error('Error processing audio:', error);
      toast({
        title: "Erro",
        description: "Não foi possível processar a gravação",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleContentSave = () => {
    if (!generatedContent) return;

    try {
      const content = JSON.parse(generatedContent);
      onContentCreated(recordingType, content);
      
      // Reset state
      setGeneratedContent('');
      setAudioUrl(null);
      setDuration(0);
      
      toast({
        title: "Salvo!",
        description: `${recordingType === 'note' ? 'Nota' : recordingType === 'task' ? 'Tarefa' : 'Pensamento'} salvo(a) com sucesso.`,
      });
    } catch (error) {
      console.error('Error saving content:', error);
      toast({
        title: "Erro",
        description: "Erro ao salvar conteúdo",
        variant: "destructive",
      });
    }
  };

  const handleAdjustContent = async () => {
    if (!adjustmentPrompt.trim() || !generatedContent) return;
    
    setIsAdjusting(true);
    try {
      const { data, error } = await supabase.functions.invoke('adjust-smart-content', {
        body: {
          originalContent: generatedContent,
          adjustmentPrompt: adjustmentPrompt,
          contentType: recordingType
        }
      });

      if (error) throw error;

      setGeneratedContent(data.adjustedContent);
      setShowAdjustmentDialog(false);
      setAdjustmentPrompt('');
      
      toast({
        title: "Conteúdo ajustado!",
        description: "O conteúdo foi modificado conforme solicitado.",
      });
    } catch (error) {
      console.error('Error adjusting content:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ajustar o conteúdo",
        variant: "destructive",
      });
    } finally {
      setIsAdjusting(false);
    }
  };

  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl) return;
    
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getRecordingTypeLabel = (type: RecordingType) => {
    switch (type) {
      case 'note': return 'Nota Inteligente';
      case 'task': return 'Tarefa com Checklist';
      case 'thought': return 'Pensamento';
    }
  };

  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  return (
    <>
      <Card className="bg-gradient-card border-border/50 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Gravação Inteligente
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
            <label className="text-sm font-medium mb-2 block">
              Tipo de Conteúdo
            </label>
            <Select value={recordingType} onValueChange={(value: RecordingType) => setRecordingType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="note">📝 Nota Inteligente</SelectItem>
                <SelectItem value="task">✅ Tarefa com Checklist</SelectItem>
                <SelectItem value="thought">💡 Pensamento</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col items-center space-y-4">
            <div className="flex items-center space-x-4">
              {!isRecording ? (
                <Button
                  onClick={startRecording}
                  size="lg"
                  variant="default"
                  className="h-16 w-16 rounded-full bg-gradient-primary hover:shadow-glow transition-all"
                  disabled={isProcessing}
                >
                  <Mic className="h-6 w-6" />
                </Button>
              ) : (
                <Button
                  onClick={stopRecording}
                  size="lg"
                  variant="destructive"
                  className="h-16 w-16 rounded-full animate-pulse-soft"
                >
                  <Square className="h-6 w-6" />
                </Button>
              )}
              
              {audioUrl && !isProcessing && (
                <Button
                  onClick={togglePlayback}
                  variant="outline"
                  size="lg"
                  className="h-12 w-12 rounded-full"
                >
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
              )}
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-mono font-bold text-foreground">
                {formatTime(duration)}
              </div>
              <p className="text-sm text-muted-foreground">
                {isRecording ? `Gravando ${getRecordingTypeLabel(recordingType)}...` : 
                 isProcessing ? 'Processando com IA...' :
                 audioUrl ? 'Gravação concluída' : 
                 `Pronto para gravar ${getRecordingTypeLabel(recordingType)}`}
              </p>
            </div>
            
            {isRecording && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <div className="w-2 h-2 bg-destructive rounded-full animate-pulse-soft"></div>
                <span>REC</span>
              </div>
            )}

            {isProcessing && (
              <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Processando com IA...</span>
              </div>
            )}
          </div>

          {generatedContent && (
            <div className="space-y-4 p-4 bg-accent/50 rounded-lg">
              <h4 className="font-medium">Conteúdo Gerado:</h4>
              <div className="text-sm text-muted-foreground bg-background p-3 rounded border">
                <pre className="whitespace-pre-wrap font-sans">
                  {JSON.stringify(JSON.parse(generatedContent), null, 2)}
                </pre>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleContentSave} size="sm">
                  Salvar
                </Button>
                <Button 
                  onClick={() => setShowAdjustmentDialog(true)} 
                  variant="outline" 
                  size="sm"
                >
                  Ajustar com IA
                </Button>
              </div>
            </div>
          )}
          
          {audioUrl && (
            <audio
              ref={audioRef}
              src={audioUrl}
              onEnded={() => setIsPlaying(false)}
              className="hidden"
            />
          )}
        </CardContent>
      </Card>

      <Dialog open={showAdjustmentDialog} onOpenChange={setShowAdjustmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajustar Conteúdo com IA</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              value={adjustmentPrompt}
              onChange={(e) => setAdjustmentPrompt(e.target.value)}
              placeholder="Descreva como gostaria de ajustar o conteúdo..."
              rows={4}
            />
            <div className="flex gap-2">
              <Button 
                onClick={handleAdjustContent} 
                disabled={isAdjusting || !adjustmentPrompt.trim()}
              >
                {isAdjusting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Ajustando...
                  </>
                ) : (
                  'Ajustar'
                )}
              </Button>
              <Button 
                variant="outline" 
                onClick={() => setShowAdjustmentDialog(false)}
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};