import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Mic, Square, Play, Pause } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface AudioRecorderProps {
  onRecordingComplete: (blob: Blob, duration: number) => void;
}

export const AudioRecorder = ({ onRecordingComplete }: AudioRecorderProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      // Check browser support
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
      
      // Check MediaRecorder support
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        console.warn('audio/webm not supported, using default type');
      }
      
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
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/wav' });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        onRecordingComplete(blob, duration);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setDuration(0);
      
      // Start duration counter
      intervalRef.current = setInterval(() => {
        setDuration(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Gravação iniciada",
        description: "A reunião está sendo gravada...",
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
        title: "Gravação finalizada",
        description: `Duração: ${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}`,
      });
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
    <Card className="bg-gradient-card border-border/50 shadow-md">
      <CardContent className="p-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="flex items-center space-x-4">
            {!isRecording ? (
              <Button
                onClick={startRecording}
                size="lg"
                variant="default"
                className="h-16 w-16 rounded-full bg-gradient-primary hover:shadow-glow transition-all"
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
            
            {audioUrl && (
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
              {isRecording ? 'Gravando...' : audioUrl ? 'Gravação concluída' : 'Pronto para gravar'}
            </p>
          </div>
          
          {isRecording && (
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <div className="w-2 h-2 bg-destructive rounded-full animate-pulse-soft"></div>
              <span>REC</span>
            </div>
          )}
        </div>
        
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
  );
};