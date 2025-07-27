export interface Note {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
  color?: string;
  pinned?: boolean;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: 'low' | 'medium' | 'high';
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface Thought {
  id: string;
  content: string;
  createdAt: string;
  mood?: 'positive' | 'neutral' | 'negative';
  tags: string[];
}

export type NoteColor = 'yellow' | 'blue' | 'green' | 'pink' | 'purple' | 'orange';