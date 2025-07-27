import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Lightbulb, 
  Edit, 
  Trash2, 
  Tag,
  Smile,
  Meh,
  Frown,
  Brain
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Thought } from '@/types/notes';

interface ThoughtsSectionProps {
  thoughts: Thought[];
  onAddThought: (thought: Omit<Thought, 'id' | 'createdAt'>) => void;
  onUpdateThought: (thought: Thought) => void;
  onDeleteThought: (id: string) => void;
}

export const ThoughtsSection = ({ thoughts, onAddThought, onUpdateThought, onDeleteThought }: ThoughtsSectionProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMood, setFilterMood] = useState<'all' | 'positive' | 'neutral' | 'negative'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isQuickAdd, setIsQuickAdd] = useState(false);
  const [editingThought, setEditingThought] = useState<Thought | null>(null);
  const [newThought, setNewThought] = useState({
    content: '',
    mood: undefined as Thought['mood'],
    tags: [] as string[]
  });
  const [tagInput, setTagInput] = useState('');
  const [quickThought, setQuickThought] = useState('');

  const filteredThoughts = thoughts.filter(thought => {
    const matchesSearch = thought.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         thought.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesMood = filterMood === 'all' || thought.mood === filterMood;
    
    return matchesSearch && matchesMood;
  });

  const handleSaveThought = () => {
    if (!newThought.content.trim()) {
      toast({
        title: "Erro",
        description: "O conteúdo do pensamento é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (editingThought) {
      onUpdateThought({
        ...editingThought,
        ...newThought
      });
      toast({
        title: "Pensamento atualizado!",
        description: "Suas alterações foram salvas.",
      });
    } else {
      onAddThought(newThought);
      toast({
        title: "Pensamento registrado!",
        description: "Novo pensamento adicionado com sucesso.",
      });
    }

    resetForm();
  };

  const handleQuickAdd = () => {
    if (!quickThought.trim()) return;
    
    onAddThought({
      content: quickThought,
      mood: undefined,
      tags: []
    });
    
    toast({
      title: "Pensamento registrado!",
      description: "Ideia rápida salva com sucesso.",
    });
    
    setQuickThought('');
    setIsQuickAdd(false);
  };

  const resetForm = () => {
    setNewThought({
      content: '',
      mood: undefined,
      tags: []
    });
    setTagInput('');
    setEditingThought(null);
    setIsDialogOpen(false);
  };

  const handleEditThought = (thought: Thought) => {
    setEditingThought(thought);
    setNewThought({
      content: thought.content,
      mood: thought.mood,
      tags: thought.tags
    });
    setIsDialogOpen(true);
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !newThought.tags.includes(tag)) {
      setNewThought(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewThought(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const getMoodIcon = (mood?: Thought['mood']) => {
    switch (mood) {
      case 'positive':
        return <Smile className="h-4 w-4 text-success" />;
      case 'negative':
        return <Frown className="h-4 w-4 text-destructive" />;
      case 'neutral':
        return <Meh className="h-4 w-4 text-warning" />;
      default:
        return <Brain className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getMoodColor = (mood?: Thought['mood']) => {
    switch (mood) {
      case 'positive':
        return 'text-success bg-success/10 border-success/20';
      case 'negative':
        return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'neutral':
        return 'text-warning bg-warning/10 border-warning/20';
      default:
        return 'text-muted-foreground bg-muted border-border';
    }
  };

  const getMoodLabel = (mood?: Thought['mood']) => {
    switch (mood) {
      case 'positive':
        return 'Positivo';
      case 'negative':
        return 'Negativo';
      case 'neutral':
        return 'Neutro';
      default:
        return 'Sem humor';
    }
  };

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(dateString));
  };

  const formatTimeAgo = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Agora mesmo';
    if (diffInHours < 24) return `${diffInHours}h atrás`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d atrás`;
    return formatDate(dateString);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Pensamentos</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar pensamentos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          
          <Select value={filterMood} onValueChange={(value: any) => setFilterMood(value)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="positive">Positivos</SelectItem>
              <SelectItem value="neutral">Neutros</SelectItem>
              <SelectItem value="negative">Negativos</SelectItem>
            </SelectContent>
          </Select>
          
          <Button
            onClick={() => setIsQuickAdd(true)}
            variant="outline"
            className="hover:shadow-md transition-all"
          >
            <Lightbulb className="h-4 w-4 mr-2" />
            Ideia Rápida
          </Button>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:shadow-glow transition-all">
                <Plus className="h-4 w-4 mr-2" />
                Novo Pensamento
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingThought ? 'Editar Pensamento' : 'Novo Pensamento'}
                </DialogTitle>
                <DialogDescription>
                  {editingThought ? 'Edite seu pensamento existente' : 'Registre uma nova reflexão ou ideia'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Textarea
                  placeholder="O que você está pensando?"
                  value={newThought.content}
                  onChange={(e) => setNewThought(prev => ({ ...prev, content: e.target.value }))}
                  className="min-h-32"
                />
                
                {/* Mood Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Como você está se sentindo sobre isso?</label>
                  <div className="grid grid-cols-4 gap-2">
                    <Button
                      variant={newThought.mood === undefined ? "default" : "outline"}
                      onClick={() => setNewThought(prev => ({ ...prev, mood: undefined }))}
                      className="h-20 flex-col"
                    >
                      <Brain className="h-6 w-6 mb-1" />
                      <span className="text-xs">Neutro</span>
                    </Button>
                    <Button
                      variant={newThought.mood === 'positive' ? "default" : "outline"}
                      onClick={() => setNewThought(prev => ({ ...prev, mood: 'positive' }))}
                      className="h-20 flex-col"
                    >
                      <Smile className="h-6 w-6 mb-1" />
                      <span className="text-xs">Positivo</span>
                    </Button>
                    <Button
                      variant={newThought.mood === 'neutral' ? "default" : "outline"}
                      onClick={() => setNewThought(prev => ({ ...prev, mood: 'neutral' }))}
                      className="h-20 flex-col"
                    >
                      <Meh className="h-6 w-6 mb-1" />
                      <span className="text-xs">Neutro</span>
                    </Button>
                    <Button
                      variant={newThought.mood === 'negative' ? "default" : "outline"}
                      onClick={() => setNewThought(prev => ({ ...prev, mood: 'negative' }))}
                      className="h-20 flex-col"
                    >
                      <Frown className="h-6 w-6 mb-1" />
                      <span className="text-xs">Negativo</span>
                    </Button>
                  </div>
                </div>
                
                {/* Tags */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Tags</label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Adicionar tag..."
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button onClick={addTag} variant="outline" size="sm">
                      <Tag className="h-4 w-4" />
                    </Button>
                  </div>
                  
                  {newThought.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {newThought.tags.map((tag) => (
                        <Badge
                          key={tag}
                          variant="secondary"
                          className="cursor-pointer"
                          onClick={() => removeTag(tag)}
                        >
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveThought}>
                    {editingThought ? 'Atualizar' : 'Registrar'} Pensamento
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Quick Add */}
      {isQuickAdd && (
        <Card className="bg-gradient-primary/5 border-primary/20 animate-slide-up">
          <CardContent className="p-4">
            <div className="space-y-3">
              <Textarea
                placeholder="Uma ideia rápida..."
                value={quickThought}
                onChange={(e) => setQuickThought(e.target.value)}
                className="min-h-20 border-primary/20"
                autoFocus
              />
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setIsQuickAdd(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleQuickAdd} disabled={!quickThought.trim()}>
                  Salvar Rápido
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Thoughts Stream */}
      <div className="space-y-4">
        {filteredThoughts.length > 0 ? (
          filteredThoughts.map((thought) => (
            <Card key={thought.id} className="bg-gradient-card border-border/50 hover:shadow-md transition-all animate-slide-up">
              <CardContent className="p-4">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-2">
                    {getMoodIcon(thought.mood)}
                    <Badge variant="outline" className={getMoodColor(thought.mood)}>
                      {getMoodLabel(thought.mood)}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatTimeAgo(thought.createdAt)}
                    </span>
                  </div>
                  
                  <div className="flex space-x-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEditThought(thought)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDeleteThought(thought.id)}
                      className="h-8 w-8 p-0 text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <p className="text-foreground mb-3 whitespace-pre-wrap">
                  {thought.content}
                </p>
                
                {thought.tags.length > 0 && (
                  <div className="flex gap-1 flex-wrap">
                    {thought.tags.map((tag) => (
                      <Badge key={tag} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-8 text-center">
              <Lightbulb className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm || filterMood !== 'all'
                  ? 'Nenhum pensamento encontrado'
                  : 'Nenhum pensamento registrado'
                }
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || filterMood !== 'all'
                  ? 'Tente ajustar seus filtros de busca.'
                  : 'Comece registrando suas ideias e reflexões.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};