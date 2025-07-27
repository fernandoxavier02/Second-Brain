import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  FileText, 
  Calendar, 
  Clock, 
  Users,
  MoreVertical,
  Download,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

export interface Meeting {
  id: string;
  title: string;
  date: string;
  duration: number;
  participants?: string[];
  audio_url?: string;
  transcript?: string;
  status: string;
  created_at: string;
  updated_at: string;
}

interface MeetingListProps {
  meetings: Meeting[];
  onPlayMeeting: (meeting: Meeting) => void;
  onDeleteMeeting: (id: string) => void;
  onViewTranscript: (meeting: Meeting) => void;
  onDownloadAudio?: (meeting: Meeting) => void;
  currentPlaying?: string;
}

export const MeetingList = ({ 
  meetings, 
  onPlayMeeting, 
  onDeleteMeeting, 
  onViewTranscript,
  onDownloadAudio,
  currentPlaying 
}: MeetingListProps) => {
  
  const handleDownloadAudio = (meeting: Meeting) => {
    if (!meeting.audio_url) return;
    
    const link = document.createElement('a');
    link.href = meeting.audio_url;
    link.download = `${meeting.title.toLowerCase().replace(/\s+/g, '-')}-audio.wav`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-success/10 text-success border-success/20';
      case 'processing':
        return 'bg-warning/10 text-warning border-warning/20';
      case 'draft':
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Concluída';
      case 'processing':
        return 'Processando';
      case 'draft':
        return 'Rascunho';
      default:
        return 'Desconhecido';
    }
  };

  if (meetings.length === 0) {
    return (
      <Card className="bg-gradient-card border-border/50">
        <CardContent className="p-8 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            Nenhuma reunião gravada
          </h3>
          <p className="text-muted-foreground">
            Grave sua primeira reunião para começar a criar atas inteligentes.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-foreground">Reuniões Gravadas</h3>
      
      {meetings.map((meeting) => (
        <Card 
          key={meeting.id} 
          className="bg-gradient-card border-border/50 hover:shadow-md transition-all animate-slide-up"
        >
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-base text-foreground mb-1">
                  {meeting.title}
                </CardTitle>
                <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>{formatDate(meeting.date)}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="h-3 w-3" />
                    <span>{formatDuration(meeting.duration)}</span>
                  </div>
                  {meeting.participants && meeting.participants.length > 0 && (
                    <div className="flex items-center space-x-1">
                      <Users className="h-3 w-3" />
                      <span>{meeting.participants.length}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Badge 
                  variant="outline" 
                  className={getStatusColor(meeting.status)}
                >
                  {getStatusText(meeting.status)}
                </Badge>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleDownloadAudio(meeting)}>
                      <Download className="h-4 w-4 mr-2" />
                      Baixar Áudio
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDeleteMeeting(meeting.id)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {meeting.audio_url && (
                  <Button
                    onClick={() => onPlayMeeting(meeting)}
                    variant="outline"
                    size="sm"
                  >
                    {currentPlaying === meeting.id ? (
                      <Pause className="h-4 w-4 mr-2" />
                    ) : (
                      <Play className="h-4 w-4 mr-2" />
                    )}
                    {currentPlaying === meeting.id ? 'Pausar' : 'Reproduzir'}
                  </Button>
                )}
                
                <Button
                  onClick={() => onViewTranscript(meeting)}
                  variant="outline"
                  size="sm"
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Ata
                </Button>
              </div>
              
              {meeting.participants && meeting.participants.length > 0 && (
                <div className="text-xs text-muted-foreground">
                  {meeting.participants.slice(0, 2).join(', ')}
                  {meeting.participants.length > 2 && ` +${meeting.participants.length - 2}`}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};