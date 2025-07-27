import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { 
  Plus, 
  Search, 
  Pin, 
  PinOff, 
  Edit, 
  Trash2, 
  Tag,
  StickyNote,
  Palette
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import type { Note, NoteColor } from '@/types/notes';

interface NotesSectionProps {
  notes: Note[];
  onAddNote: (note: Omit<Note, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateNote: (note: Note) => void;
  onDeleteNote: (id: string) => void;
}

const NOTE_COLORS: { value: NoteColor; label: string; class: string }[] = [
  { value: 'yellow', label: 'Amarelo', class: 'bg-yellow-100 border-yellow-200' },
  { value: 'blue', label: 'Azul', class: 'bg-blue-100 border-blue-200' },
  { value: 'green', label: 'Verde', class: 'bg-green-100 border-green-200' },
  { value: 'pink', label: 'Rosa', class: 'bg-pink-100 border-pink-200' },
  { value: 'purple', label: 'Roxo', class: 'bg-purple-100 border-purple-200' },
  { value: 'orange', label: 'Laranja', class: 'bg-orange-100 border-orange-200' },
];

export const NotesSection = ({ notes, onAddNote, onUpdateNote, onDeleteNote }: NotesSectionProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [newNote, setNewNote] = useState({
    title: '',
    content: '',
    tags: [] as string[],
    color: 'yellow' as NoteColor,
    pinned: false
  });
  const [tagInput, setTagInput] = useState('');

  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const pinnedNotes = filteredNotes.filter(note => note.pinned);
  const regularNotes = filteredNotes.filter(note => !note.pinned);

  const handleSaveNote = () => {
    if (!newNote.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da nota é obrigatório",
        variant: "destructive",
      });
      return;
    }

    if (editingNote) {
      onUpdateNote({
        ...editingNote,
        ...newNote,
        updatedAt: new Date().toISOString()
      });
      toast({
        title: "Nota atualizada!",
        description: "Suas alterações foram salvas.",
      });
    } else {
      onAddNote(newNote);
      toast({
        title: "Nota criada!",
        description: "Nova nota adicionada com sucesso.",
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewNote({
      title: '',
      content: '',
      tags: [],
      color: 'yellow',
      pinned: false
    });
    setTagInput('');
    setEditingNote(null);
    setIsDialogOpen(false);
  };

  const handleEditNote = (note: Note) => {
    setEditingNote(note);
    setNewNote({
      title: note.title,
      content: note.content,
      tags: note.tags,
      color: (note.color as NoteColor) || 'yellow',
      pinned: note.pinned || false
    });
    setIsDialogOpen(true);
  };

  const handleTogglePin = (note: Note) => {
    onUpdateNote({
      ...note,
      pinned: !note.pinned,
      updatedAt: new Date().toISOString()
    });
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !newNote.tags.includes(tag)) {
      setNewNote(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewNote(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const getNoteColorClass = (color?: string) => {
    const noteColor = NOTE_COLORS.find(c => c.value === color);
    return noteColor?.class || NOTE_COLORS[0].class;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center space-x-2">
          <StickyNote className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Notas</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar notas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:shadow-glow transition-all">
                <Plus className="h-4 w-4 mr-2" />
                Nova Nota
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingNote ? 'Editar Nota' : 'Nova Nota'}
                </DialogTitle>
                <DialogDescription>
                  {editingNote ? 'Edite sua nota existente' : 'Crie uma nova nota para organizar seus pensamentos'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Input
                  placeholder="Título da nota..."
                  value={newNote.title}
                  onChange={(e) => setNewNote(prev => ({ ...prev, title: e.target.value }))}
                />
                
                <Textarea
                  placeholder="Conteúdo da nota..."
                  value={newNote.content}
                  onChange={(e) => setNewNote(prev => ({ ...prev, content: e.target.value }))}
                  className="min-h-32"
                />
                
                {/* Color Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Cor da Nota</label>
                  <div className="flex gap-2 flex-wrap">
                    {NOTE_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => setNewNote(prev => ({ ...prev, color: color.value }))}
                        className={`w-8 h-8 rounded-full border-2 ${color.class} ${
                          newNote.color === color.value ? 'ring-2 ring-primary' : ''
                        }`}
                        title={color.label}
                      />
                    ))}
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
                  
                  {newNote.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {newNote.tags.map((tag) => (
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
                
                {/* Pin Option */}
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="pinned"
                    checked={newNote.pinned}
                    onChange={(e) => setNewNote(prev => ({ ...prev, pinned: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="pinned" className="text-sm font-medium cursor-pointer">
                    Fixar nota
                  </label>
                </div>
                
                <div className="flex justify-end space-x-2 pt-4">
                  <Button variant="outline" onClick={resetForm}>
                    Cancelar
                  </Button>
                  <Button onClick={handleSaveNote}>
                    {editingNote ? 'Atualizar' : 'Criar'} Nota
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Notes Grid */}
      <div className="space-y-6">
        {/* Pinned Notes */}
        {pinnedNotes.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Pin className="h-4 w-4 mr-2" />
              Notas Fixadas
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {pinnedNotes.map((note) => (
                <Card 
                  key={note.id} 
                  className={`${getNoteColorClass(note.color)} hover:shadow-md transition-all animate-slide-up`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base text-foreground line-clamp-2">
                        {note.title}
                      </CardTitle>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePin(note)}
                          className="h-6 w-6 p-0"
                        >
                          <Pin className="h-3 w-3 fill-current" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditNote(note)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteNote(note.id)}
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-4 mb-3">
                      {note.content}
                    </p>
                    
                    {note.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-3">
                        {note.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {formatDate(note.updatedAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Regular Notes */}
        {regularNotes.length > 0 && (
          <div>
            {pinnedNotes.length > 0 && (
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Outras Notas
              </h3>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {regularNotes.map((note) => (
                <Card 
                  key={note.id} 
                  className={`${getNoteColorClass(note.color)} hover:shadow-md transition-all animate-slide-up`}
                >
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-base text-foreground line-clamp-2">
                        {note.title}
                      </CardTitle>
                      <div className="flex space-x-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleTogglePin(note)}
                          className="h-6 w-6 p-0"
                        >
                          <PinOff className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditNote(note)}
                          className="h-6 w-6 p-0"
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onDeleteNote(note.id)}
                          className="h-6 w-6 p-0 text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-muted-foreground line-clamp-4 mb-3">
                      {note.content}
                    </p>
                    
                    {note.tags.length > 0 && (
                      <div className="flex gap-1 flex-wrap mb-3">
                        {note.tags.map((tag) => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <p className="text-xs text-muted-foreground">
                      {formatDate(note.updatedAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredNotes.length === 0 && (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-8 text-center">
              <StickyNote className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm ? 'Nenhuma nota encontrada' : 'Nenhuma nota criada'}
              </h3>
              <p className="text-muted-foreground">
                {searchTerm 
                  ? 'Tente ajustar seus termos de busca.' 
                  : 'Comece criando sua primeira nota para organizar seus pensamentos.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};