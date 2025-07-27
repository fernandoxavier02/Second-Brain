import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, Edit3 } from 'lucide-react';

interface MinutesAdjustmentProps {
  originalMinutes: string;
  transcription: string;
  onAdjustedMinutes: (adjustedMinutes: string) => void;
}

export const MinutesAdjustment = ({
  originalMinutes,
  transcription,
  onAdjustedMinutes,
}: MinutesAdjustmentProps) => {
  const [adjustmentRequest, setAdjustmentRequest] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const { toast } = useToast();

  const handleAdjustMinutes = async () => {
    if (!adjustmentRequest.trim()) {
      toast({
        title: "Erro",
        description: "Por favor, descreva os ajustes desejados.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('adjust-meeting-minutes', {
        body: {
          originalMinutes,
          adjustmentRequest: adjustmentRequest.trim(),
          transcription,
        },
      });

      if (error) {
        throw error;
      }

      if (data?.adjustedMinutes) {
        onAdjustedMinutes(data.adjustedMinutes);
        setAdjustmentRequest('');
        setShowAdjustment(false);
        toast({
          title: "Sucesso",
          description: "Ata ajustada com sucesso!",
        });
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('Erro ao ajustar ata:', error);
      toast({
        title: "Erro",
        description: "Não foi possível ajustar a ata. Tente novamente.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!showAdjustment) {
    return (
      <div className="flex justify-end mb-4">
        <Button
          variant="outline"
          onClick={() => setShowAdjustment(true)}
          className="gap-2"
        >
          <Edit3 className="h-4 w-4" />
          Solicitar Ajustes na Ata
        </Button>
      </div>
    );
  }

  return (
    <Card className="mb-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          Solicitar Ajustes na Ata
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <label className="text-sm font-medium mb-2 block">
            Descreva os ajustes desejados:
          </label>
          <Textarea
            value={adjustmentRequest}
            onChange={(e) => setAdjustmentRequest(e.target.value)}
            placeholder="Ex: Reorganizar por ordem de prioridade, adicionar mais detalhes sobre o tópico X, corrigir formatação, etc."
            className="min-h-[100px]"
            disabled={isLoading}
          />
          <p className="text-xs text-muted-foreground mt-1">
            A IA só pode ajustar com base no conteúdo original da transcrição
          </p>
        </div>
        
        <div className="flex gap-2 justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setShowAdjustment(false);
              setAdjustmentRequest('');
            }}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleAdjustMinutes}
            disabled={isLoading || !adjustmentRequest.trim()}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Ajustando...
              </>
            ) : (
              'Aplicar Ajustes'
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};