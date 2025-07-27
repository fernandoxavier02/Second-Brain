import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { AudioRecorder } from '@/components/AudioRecorder';
import { SmartRecorder } from '@/components/SmartRecorder';
import { MeetingList } from '@/components/MeetingList';
import { TranscriptEditor } from '@/components/TranscriptEditor';
import { NotesSection } from '@/components/NotesSection';
import { TasksSection } from '@/components/TasksSection';
import { ThoughtsSection } from '@/components/ThoughtsSection';
import { Plus, Brain, Mic, FileText, Users, Zap, StickyNote, CheckSquare, Lightbulb, LogIn } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { useMeetings, type Meeting } from '@/hooks/useMeetings';
import { useNotes } from '@/hooks/useNotes';
import { useTasks } from '@/hooks/useTasks';
import { useThoughts } from '@/hooks/useThoughts';
import { LoginScreen } from '@/components/LoginScreen';

const Index = () => {
  const { user, loading, signInAnonymously } = useAuth();
  const { meetings, addMeeting, updateMeeting, deleteMeeting, uploadAudio } = useMeetings();
  const { notes, addNote, updateNote, deleteNote } = useNotes();
  const { tasks, addTask, updateTask, deleteTask } = useTasks();
  const { thoughts, addThought, updateThought, deleteThought } = useThoughts();
  
  const [currentView, setCurrentView] = useState<'main' | 'editor'>('main');
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [currentPlaying, setCurrentPlaying] = useState<string | undefined>();
  const [isNewMeetingDialogOpen, setIsNewMeetingDialogOpen] = useState(false);
  const [newMeetingTitle, setNewMeetingTitle] = useState('');
  const [newMeetingParticipants, setNewMeetingParticipants] = useState('');
  const [activeTab, setActiveTab] = useState('meetings');
  const [showSmartRecorder, setShowSmartRecorder] = useState(false);
  
  const audioRef = useRef<HTMLAudioElement | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-main flex items-center justify-center">
        <div className="text-center">
          <Brain className="h-12 w-12 text-primary mx-auto mb-4 animate-pulse" />
          <p className="text-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <LoginScreen onLogin={signInAnonymously} loading={loading} />;
  }

  const handleRecordingComplete = async (blob: Blob, duration: number) => {
    if (!user) return;
    
    const participants = newMeetingParticipants
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);
    
    const newMeeting = {
      title: newMeetingTitle || `Reunião ${new Date().toLocaleDateString('pt-BR')}`,
      date: new Date().toISOString(),
      duration,
      participants,
      status: 'completed' as const,
      transcript: '',
      audio_url: '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    const meeting = await addMeeting(newMeeting);
    if (meeting) {
      const audioUrl = await uploadAudio(blob, meeting.id);
      if (audioUrl) {
        await updateMeeting(meeting.id, { audio_url: audioUrl });
      }
    }
    
    setIsNewMeetingDialogOpen(false);
    setNewMeetingTitle('');
    setNewMeetingParticipants('');
    
    toast({
      title: "Reunião gravada!",
      description: "A gravação foi salva com sucesso. Você pode agora gerar a ata.",
    });
  };

  const handlePlayMeeting = (meeting: Meeting) => {
    if (!meeting.audio_url) return;
    
    if (currentPlaying === meeting.id) {
      // Pause current
      if (audioRef.current) {
        audioRef.current.pause();
      }
      setCurrentPlaying(undefined);
    } else {
      // Play new
      if (audioRef.current) {
        audioRef.current.src = meeting.audio_url;
        audioRef.current.play();
      }
      setCurrentPlaying(meeting.id);
    }
  };

  const handleDeleteMeeting = (id: string) => {
    deleteMeeting(id);
  };

  const handleViewTranscript = (meeting: Meeting) => {
    setSelectedMeeting(meeting);
    setCurrentView('editor');
  };

  const handleSaveMeeting = (updatedMeeting: Meeting) => {
    updateMeeting(updatedMeeting.id, updatedMeeting);
  };

  const handleBackToMain = () => {
    setCurrentView('main');
    setSelectedMeeting(null);
  };

  const handleSmartContentCreated = async (type: 'note' | 'task' | 'thought', content: any) => {
    try {
      switch (type) {
        case 'note':
          await addNote({
            title: content.title,
            content: content.content,
            tags: content.tags || [],
            color: content.color,
            pinned: false
          });
          break;
        case 'task':
          await addTask({
            title: content.title,
            description: content.description,
            completed: content.completed || false,
            priority: content.priority || 'medium',
            tags: content.tags || []
          });
          break;
        case 'thought':
          await addThought({
            content: content.content,
            mood: content.mood,
            tags: content.tags || []
          });
          break;
      }
      setShowSmartRecorder(false);
    } catch (error) {
      console.error('Error saving smart content:', error);
      toast({
        title: "Erro",
        description: "Não foi possível salvar o conteúdo",
        variant: "destructive",
      });
    }
  };

  if (currentView === 'editor' && selectedMeeting) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-4xl mx-auto">
          <TranscriptEditor
            meeting={selectedMeeting}
            onSave={handleSaveMeeting}
            onBack={handleBackToMain}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="bg-gradient-hero text-white py-16">
        <div className="max-w-6xl mx-auto px-6 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Notas Inteligentes
          </h1>
          <p className="text-xl md:text-2xl text-white/90 mb-8 max-w-3xl mx-auto">
            Grave reuniões e transforme-as automaticamente em atas estruturadas com o poder da IA
          </p>
          
          <div className="flex flex-wrap justify-center gap-6 mb-12">
            <div className="flex items-center space-x-2 text-white/90">
              <Mic className="h-5 w-5" />
              <span>Gravação de alta qualidade</span>
            </div>
            <div className="flex items-center space-x-2 text-white/90">
              <Brain className="h-5 w-5" />
              <span>Transcrição automática com IA</span>
            </div>
            <div className="flex items-center space-x-2 text-white/90">
              <FileText className="h-5 w-5" />
              <span>Atas estruturadas</span>
            </div>
          </div>

          <Dialog open={isNewMeetingDialogOpen} onOpenChange={setIsNewMeetingDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                size="lg" 
                className="bg-white text-primary hover:bg-white/90 shadow-lg px-8 py-3 text-lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Nova Reunião
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nova Reunião</DialogTitle>
                <DialogDescription>
                  Configure os detalhes da reunião antes de iniciar a gravação.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Título da Reunião
                  </label>
                  <Input
                    value={newMeetingTitle}
                    onChange={(e) => setNewMeetingTitle(e.target.value)}
                    placeholder="Ex: Reunião de Planejamento"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Participantes (separados por vírgula)
                  </label>
                  <Input
                    value={newMeetingParticipants}
                    onChange={(e) => setNewMeetingParticipants(e.target.value)}
                    placeholder="Ex: João Silva, Maria Santos"
                  />
                </div>
                <AudioRecorder onRecordingComplete={handleRecordingComplete} />
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            <Card className="bg-gradient-card border-border/50 shadow-md">
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                  <Mic className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Gravação Inteligente</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Grave reuniões com qualidade profissional diretamente do seu navegador. 
                  Interface simples e intuitiva.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50 shadow-md">
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                  <Brain className="h-6 w-6 text-white" />
                </div>
                <CardTitle>IA Avançada</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Nossa IA analisa automaticamente suas gravações e gera atas estruturadas 
                  com resumos, ações e próximos passos.
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card border-border/50 shadow-md">
              <CardHeader>
                <div className="h-12 w-12 bg-gradient-primary rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-white" />
                </div>
                <CardTitle>Produtividade</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Economize horas de trabalho manual. Edite, exporte e compartilhe suas atas 
                  em diversos formatos.
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Smart Recorder Toggle */}
          <div className="flex justify-center mb-8">
            <Button
              onClick={() => setShowSmartRecorder(!showSmartRecorder)}
              variant={showSmartRecorder ? "secondary" : "default"}
              className="bg-gradient-primary hover:shadow-glow"
            >
              <Brain className="h-4 w-4 mr-2" />
              {showSmartRecorder ? 'Ocultar' : 'Mostrar'} Gravação Inteligente
            </Button>
          </div>

          {/* Smart Recorder */}
          {showSmartRecorder && (
            <div className="mb-8">
              <SmartRecorder onContentCreated={handleSmartContentCreated} />
            </div>
          )}

          {/* Main Content with Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="meetings" className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                <span className="hidden sm:inline">Reuniões</span>
              </TabsTrigger>
              <TabsTrigger value="notes" className="flex items-center gap-2">
                <StickyNote className="h-4 w-4" />
                <span className="hidden sm:inline">Notas</span>
              </TabsTrigger>
              <TabsTrigger value="tasks" className="flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                <span className="hidden sm:inline">Tarefas</span>
              </TabsTrigger>
              <TabsTrigger value="thoughts" className="flex items-center gap-2">
                <Lightbulb className="h-4 w-4" />
                <span className="hidden sm:inline">Pensamentos</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="meetings">
              <MeetingList
                meetings={meetings}
                onPlayMeeting={handlePlayMeeting}
                onDeleteMeeting={handleDeleteMeeting}
                onViewTranscript={handleViewTranscript}
                currentPlaying={currentPlaying}
              />
            </TabsContent>

            <TabsContent value="notes">
              <NotesSection
                notes={notes.map(note => ({
                  ...note,
                  createdAt: note.created_at,
                  updatedAt: note.updated_at
                }))}
                onAddNote={addNote}
                onUpdateNote={(note) => updateNote(note.id, note)}
                onDeleteNote={deleteNote}
              />
            </TabsContent>

            <TabsContent value="tasks">
              <TasksSection
                tasks={tasks.map(task => ({
                  ...task,
                  createdAt: task.created_at,
                  updatedAt: task.updated_at,
                  priority: task.priority as 'low' | 'medium' | 'high',
                  dueDate: task.due_date
                }))}
                onAddTask={addTask}
                onUpdateTask={(task) => updateTask(task.id, task)}
                onDeleteTask={deleteTask}
              />
            </TabsContent>

            <TabsContent value="thoughts">
              <ThoughtsSection
                thoughts={thoughts.map(thought => ({
                  ...thought,
                  createdAt: thought.created_at,
                  mood: thought.mood as 'positive' | 'neutral' | 'negative' | undefined
                }))}
                onAddThought={addThought}
                onUpdateThought={(thought) => updateThought(thought.id, thought)}
                onDeleteThought={deleteThought}
              />
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* Hidden audio element for playback */}
      <audio
        ref={audioRef}
        onEnded={() => setCurrentPlaying(undefined)}
        className="hidden"
      />
    </div>
  );
};

export default Index;
