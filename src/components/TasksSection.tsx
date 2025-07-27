import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { 
  Plus, 
  Search, 
  CheckSquare, 
  Square, 
  Calendar as CalendarIcon,
  Edit, 
  Trash2, 
  Tag,
  AlertCircle,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import type { Task } from '@/types/notes';

interface TasksSectionProps {
  tasks: Task[];
  onAddTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateTask: (task: Task) => void;
  onDeleteTask: (id: string) => void;
}

export const TasksSection = ({ tasks, onAddTask, onUpdateTask, onDeleteTask }: TasksSectionProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'completed'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 'medium' as Task['priority'],
    dueDate: undefined as Date | undefined,
    tags: [] as string[],
    completed: false
  });
  const [tagInput, setTagInput] = useState('');

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         task.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesStatus = filterStatus === 'all' || 
                         (filterStatus === 'pending' && !task.completed) ||
                         (filterStatus === 'completed' && task.completed);
    
    const matchesPriority = filterPriority === 'all' || task.priority === filterPriority;
    
    return matchesSearch && matchesStatus && matchesPriority;
  });

  const pendingTasks = filteredTasks.filter(task => !task.completed);
  const completedTasks = filteredTasks.filter(task => task.completed);

  const handleSaveTask = () => {
    if (!newTask.title.trim()) {
      toast({
        title: "Erro",
        description: "O título da tarefa é obrigatório",
        variant: "destructive",
      });
      return;
    }

    const taskData = {
      ...newTask,
      dueDate: newTask.dueDate?.toISOString()
    };

    if (editingTask) {
      onUpdateTask({
        ...editingTask,
        ...taskData,
        updatedAt: new Date().toISOString()
      });
      toast({
        title: "Tarefa atualizada!",
        description: "Suas alterações foram salvas.",
      });
    } else {
      onAddTask(taskData);
      toast({
        title: "Tarefa criada!",
        description: "Nova tarefa adicionada com sucesso.",
      });
    }

    resetForm();
  };

  const resetForm = () => {
    setNewTask({
      title: '',
      description: '',
      priority: 'medium',
      dueDate: undefined,
      tags: [],
      completed: false
    });
    setTagInput('');
    setEditingTask(null);
    setIsDialogOpen(false);
  };

  const handleEditTask = (task: Task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      dueDate: task.dueDate ? new Date(task.dueDate) : undefined,
      tags: task.tags,
      completed: task.completed
    });
    setIsDialogOpen(true);
  };

  const handleToggleComplete = (task: Task) => {
    onUpdateTask({
      ...task,
      completed: !task.completed,
      updatedAt: new Date().toISOString()
    });
    
    toast({
      title: task.completed ? "Tarefa reaberta" : "Tarefa concluída!",
      description: task.completed ? "A tarefa foi marcada como pendente." : "Parabéns por completar a tarefa!",
    });
  };

  const addTag = () => {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !newTask.tags.includes(tag)) {
      setNewTask(prev => ({
        ...prev,
        tags: [...prev.tags, tag]
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewTask(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }));
  };

  const getPriorityIcon = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return <ArrowUp className="h-3 w-3 text-destructive" />;
      case 'medium':
        return <Minus className="h-3 w-3 text-warning" />;
      case 'low':
        return <ArrowDown className="h-3 w-3 text-success" />;
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'high':
        return 'text-destructive bg-destructive/10 border-destructive/20';
      case 'medium':
        return 'text-warning bg-warning/10 border-warning/20';
      case 'low':
        return 'text-success bg-success/10 border-success/20';
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

  const isOverdue = (task: Task) => {
    if (!task.dueDate || task.completed) return false;
    return new Date(task.dueDate) < new Date();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div className="flex items-center space-x-2">
          <CheckSquare className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-bold text-foreground">Tarefas</h2>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar tarefas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full sm:w-64"
            />
          </div>
          
          <Select
            value={filterStatus}
            onValueChange={(value: 'all' | 'pending' | 'completed') =>
              setFilterStatus(value)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="pending">Pendentes</SelectItem>
              <SelectItem value="completed">Concluídas</SelectItem>
            </SelectContent>
          </Select>
          
          <Select
            value={filterPriority}
            onValueChange={(value: 'all' | 'low' | 'medium' | 'high') =>
              setFilterPriority(value)
            }
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="high">Alta</SelectItem>
              <SelectItem value="medium">Média</SelectItem>
              <SelectItem value="low">Baixa</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary hover:shadow-glow transition-all">
                <Plus className="h-4 w-4 mr-2" />
                Nova Tarefa
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingTask ? 'Editar Tarefa' : 'Nova Tarefa'}
                </DialogTitle>
                <DialogDescription>
                  {editingTask ? 'Edite sua tarefa existente' : 'Crie uma nova tarefa para organizar seu trabalho'}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <Input
                  placeholder="Título da tarefa..."
                  value={newTask.title}
                  onChange={(e) => setNewTask(prev => ({ ...prev, title: e.target.value }))}
                />
                
                <Textarea
                  placeholder="Descrição da tarefa (opcional)..."
                  value={newTask.description}
                  onChange={(e) => setNewTask(prev => ({ ...prev, description: e.target.value }))}
                  className="min-h-24"
                />
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Priority Selection */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Prioridade</label>
                    <Select
                      value={newTask.priority}
                      onValueChange={(value: Task['priority']) =>
                        setNewTask(prev => ({ ...prev, priority: value }))
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          <div className="flex items-center space-x-2">
                            <ArrowDown className="h-3 w-3 text-success" />
                            <span>Baixa</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="medium">
                          <div className="flex items-center space-x-2">
                            <Minus className="h-3 w-3 text-warning" />
                            <span>Média</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="high">
                          <div className="flex items-center space-x-2">
                            <ArrowUp className="h-3 w-3 text-destructive" />
                            <span>Alta</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Due Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Data de Vencimento</label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full justify-start text-left font-normal",
                            !newTask.dueDate && "text-muted-foreground"
                          )}
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {newTask.dueDate ? format(newTask.dueDate, "PPP", { locale: ptBR }) : <span>Selecionar data</span>}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={newTask.dueDate}
                          onSelect={(date) => setNewTask(prev => ({ ...prev, dueDate: date }))}
                          initialFocus
                          className="p-3 pointer-events-auto"
                        />
                      </PopoverContent>
                    </Popover>
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
                  
                  {newTask.tags.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {newTask.tags.map((tag) => (
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
                  <Button onClick={handleSaveTask}>
                    {editingTask ? 'Atualizar' : 'Criar'} Tarefa
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-6">
        {/* Pending Tasks */}
        {pendingTasks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <Square className="h-4 w-4 mr-2" />
              Tarefas Pendentes ({pendingTasks.length})
            </h3>
            <div className="space-y-3">
              {pendingTasks.map((task) => (
                <Card key={task.id} className={`bg-gradient-card border-border/50 hover:shadow-md transition-all animate-slide-up ${isOverdue(task) ? 'border-destructive/50 bg-destructive/5' : ''}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggleComplete(task)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-foreground line-clamp-2">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className={getPriorityColor(task.priority)}>
                                {getPriorityIcon(task.priority)}
                                <span className="ml-1 capitalize">{task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}</span>
                              </Badge>
                              
                              {task.dueDate && (
                                <Badge variant="outline" className={isOverdue(task) ? 'text-destructive bg-destructive/10 border-destructive/20' : ''}>
                                  <CalendarIcon className="h-3 w-3 mr-1" />
                                  {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                                  {isOverdue(task) && <AlertCircle className="h-3 w-3 ml-1" />}
                                </Badge>
                              )}
                              
                              {task.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          
                          <div className="flex space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTask(task)}
                              className="h-8 w-8 p-0"
                            >
                              <Edit className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteTask(task.id)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Completed Tasks */}
        {completedTasks.length > 0 && (
          <div>
            <h3 className="text-lg font-semibold text-foreground mb-4 flex items-center">
              <CheckSquare className="h-4 w-4 mr-2" />
              Tarefas Concluídas ({completedTasks.length})
            </h3>
            <div className="space-y-3">
              {completedTasks.map((task) => (
                <Card key={task.id} className="bg-gradient-card border-border/50 opacity-70 hover:opacity-100 hover:shadow-md transition-all animate-slide-up">
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <Checkbox
                        checked={task.completed}
                        onCheckedChange={() => handleToggleComplete(task)}
                        className="mt-1"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className="font-medium text-muted-foreground line-through line-clamp-2">
                              {task.title}
                            </h4>
                            {task.description && (
                              <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                            
                            <div className="flex items-center gap-2 mt-2 flex-wrap">
                              <Badge variant="outline" className="opacity-60">
                                {getPriorityIcon(task.priority)}
                                <span className="ml-1 capitalize">{task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}</span>
                              </Badge>
                              
                              {task.dueDate && (
                                <Badge variant="outline" className="opacity-60">
                                  <CalendarIcon className="h-3 w-3 mr-1" />
                                  {format(new Date(task.dueDate), "dd/MM/yyyy", { locale: ptBR })}
                                </Badge>
                              )}
                              
                              {task.tags.map((tag) => (
                                <Badge key={tag} variant="outline" className="text-xs opacity-60">
                                  {tag}
                                </Badge>
                              ))}
                            </div>
                            
                            <p className="text-xs text-muted-foreground mt-2">
                              Concluída em {formatDate(task.updatedAt)}
                            </p>
                          </div>
                          
                          <div className="flex space-x-1 ml-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => onDeleteTask(task.id)}
                              className="h-8 w-8 p-0 text-destructive"
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <Card className="bg-gradient-card border-border/50">
            <CardContent className="p-8 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {searchTerm || filterStatus !== 'all' || filterPriority !== 'all' 
                  ? 'Nenhuma tarefa encontrada' 
                  : 'Nenhuma tarefa criada'
                }
              </h3>
              <p className="text-muted-foreground">
                {searchTerm || filterStatus !== 'all' || filterPriority !== 'all'
                  ? 'Tente ajustar seus filtros de busca.' 
                  : 'Comece criando sua primeira tarefa para organizar seu trabalho.'
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};