import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Brain, LogIn } from 'lucide-react';

interface LoginScreenProps {
  onLogin: () => void;
  loading: boolean;
}

export const LoginScreen = ({ onLogin, loading }: LoginScreenProps) => {
  return (
    <div className="min-h-screen bg-gradient-main flex items-center justify-center p-4">
      <Card className="w-full max-w-md bg-gradient-card border-border/50">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Brain className="h-12 w-12 text-primary" />
          </div>
          <CardTitle className="text-2xl text-foreground">
            Notetaker AI
          </CardTitle>
          <p className="text-muted-foreground">
            Sua plataforma inteligente para reuniões e produtividade
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={onLogin}
            className="w-full"
            disabled={loading}
          >
            <LogIn className="h-4 w-4 mr-2" />
            {loading ? 'Conectando...' : 'Entrar Anonimamente'}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            Seus dados serão salvos automaticamente na nuvem
          </p>
        </CardContent>
      </Card>
    </div>
  );
};