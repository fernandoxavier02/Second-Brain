import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Save, 
  Download, 
  FileText, 
  Wand2, 
  Copy,
  Check,
  ArrowLeft
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MinutesAdjustment } from './MinutesAdjustment';
import type { Meeting } from './MeetingList';

interface TranscriptEditorProps {
  meeting: Meeting;
  onSave: (meeting: Meeting) => void;
  onBack: () => void;
}

export const TranscriptEditor = ({ meeting, onSave, onBack }: TranscriptEditorProps) => {
  const [title, setTitle] = useState(meeting.title);
  const [transcript, setTranscript] = useState(meeting.transcript || '');
  const [originalTranscription, setOriginalTranscription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Convert audio blob to base64
  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  // Real AI transcription generation
  const generateTranscript = async () => {
    if (!meeting.audio_url) {
      toast({
        title: "Erro",
        description: "Nenhum áudio encontrado para transcrever.",
        variant: "destructive",
      });
      return;
    }

    console.log('Starting transcript generation for meeting:', meeting.id);
    console.log('Audio URL:', meeting.audio_url);
    
    setIsGenerating(true);
    
    try {
      // Download the audio file
      console.log('Downloading audio file...');
      const audioResponse = await fetch(meeting.audio_url);
      if (!audioResponse.ok) {
        throw new Error('Não foi possível baixar o áudio');
      }
      
      const audioBlob = await audioResponse.blob();
      console.log('Audio blob size:', audioBlob.size, 'bytes');
      
      const audioBase64 = await blobToBase64(audioBlob);
      console.log('Audio converted to base64, length:', audioBase64.length);

      // Call the transcription edge function
      console.log('Calling transcribe-audio function...');
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: {
          audio: audioBase64,
          meetingTitle: title
        }
      });

      console.log('Edge function response:', { data, error });

      if (error) {
        console.error('Transcription error:', error);
        throw new Error(error.message || 'Erro na transcrição');
      }

      if (!data || !data.meetingMinutes) {
        console.error('No meeting minutes returned:', data);
        throw new Error('Nenhuma ata foi gerada');
      }

      console.log('Meeting minutes generated successfully');
      setTranscript(data.meetingMinutes);
      setOriginalTranscription(data.transcription || '');
      setHasChanges(true);
      
      toast({
        title: "Ata gerada com sucesso!",
        description: "A IA analisou o áudio e criou uma ata estruturada.",
      });

    } catch (error) {
      console.error('Error generating transcript:', error);
      
      // Check if it's an API key error
      if (error.message?.includes('OpenAI API key')) {
        toast({
          title: "Configuração necessária",
          description: "A chave da API OpenAI precisa ser configurada no Supabase.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Erro na geração da ata",
          description: error.message || "Não foi possível gerar a ata. Tente novamente.",
          variant: "destructive",
        });
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSave = () => {
    const updatedMeeting = {
      ...meeting,
      title,
      transcript,
      status: 'completed' as const
    };
    
    onSave(updatedMeeting);
    setHasChanges(false);
    
    toast({
      title: "Ata salva!",
      description: "As alterações foram salvas com sucesso.",
    });
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      
      toast({
        title: "Copiado!",
        description: "Ata copiada para a área de transferência.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível copiar o texto.",
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!transcript.trim()) {
      toast({
        title: "Erro",
        description: "Não há conteúdo para baixar.",
        variant: "destructive",
      });
      return;
    }
    
    try {
      const element = document.createElement('a');
      const file = new Blob([transcript], { type: 'text/plain' });
      element.href = URL.createObjectURL(file);
      element.download = `ata-${title.toLowerCase().replace(/\s+/g, '-')}.txt`;
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
      URL.revokeObjectURL(element.href);
      
      toast({
        title: "Download iniciado!",
        description: "A ata está sendo baixada.",
      });
    } catch (error) {
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o arquivo.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    const hasContentChanges = title !== meeting.title || transcript !== meeting.transcript;
    setHasChanges(hasContentChanges);
  }, [title, transcript, meeting.title, meeting.transcript]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button 
            onClick={onBack}
            variant="outline"
            size="sm"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h2 className="text-2xl font-bold text-foreground">Editor de Ata</h2>
          <Badge variant="outline" className="text-muted-foreground">
            {Math.floor(meeting.duration / 60)}:{(meeting.duration % 60).toString().padStart(2, '0')}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          {!transcript && (
            <Button 
              onClick={generateTranscript}
              disabled={isGenerating}
              className="bg-gradient-primary hover:shadow-glow transition-all"
            >
              <Wand2 className={`h-4 w-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
              {isGenerating ? 'Gerando...' : 'Gerar Ata IA'}
            </Button>
          )}
          
          {transcript && (
            <>
              <Button onClick={handleCopy} variant="outline" size="sm">
                {isCopied ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Copy className="h-4 w-4 mr-2" />
                )}
                {isCopied ? 'Copiado!' : 'Copiar'}
              </Button>
              
              <Button onClick={handleDownload} variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Baixar
              </Button>
              
              <Button 
                onClick={handleSave}
                disabled={!hasChanges}
                className="bg-success text-white hover:bg-success/90"
              >
                <Save className="h-4 w-4 mr-2" />
                Salvar
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="text-lg text-foreground">Informações da Reunião</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium text-foreground mb-2 block">
              Título da Reunião
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Digite o título da reunião..."
              className="bg-background border-border"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Data:</span>
              <span className="ml-2 text-foreground">
                {new Intl.DateTimeFormat('pt-BR', {
                  day: '2-digit',
                  month: '2-digit', 
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                }).format(new Date(meeting.date))}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Participantes:</span>
              <span className="ml-2 text-foreground">
                {meeting.participants?.length || 0}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gradient-card border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center text-lg text-foreground">
            <FileText className="h-5 w-5 mr-2" />
            Ata da Reunião
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!transcript && !isGenerating ? (
            <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
              <Wand2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Nenhuma ata gerada
              </h3>
              <p className="text-muted-foreground mb-4">
                Use a IA para gerar automaticamente uma ata estruturada da sua reunião.
              </p>
              <Button 
                onClick={generateTranscript}
                className="bg-gradient-primary hover:shadow-glow transition-all"
              >
                <Wand2 className="h-4 w-4 mr-2" />
                Gerar Ata com IA
              </Button>
            </div>
          ) : isGenerating ? (
            <div className="text-center py-12">
              <Wand2 className="h-12 w-12 text-primary mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Gerando ata...
              </h3>
              <p className="text-muted-foreground">
                A IA está analisando a gravação e criando uma ata estruturada.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {transcript && originalTranscription && (
                <MinutesAdjustment
                  originalMinutes={transcript}
                  transcription={originalTranscription}
                  onAdjustedMinutes={(adjustedMinutes) => {
                    setTranscript(adjustedMinutes);
                    setHasChanges(true);
                  }}
                />
              )}
              <Textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder="A ata da reunião aparecerá aqui..."
                className="min-h-[500px] font-mono text-sm bg-background border-border resize-none"
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};