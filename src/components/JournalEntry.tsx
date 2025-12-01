import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Volume2, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface JournalEntryProps {
  entry: {
    id: string;
    title?: string;
    transcription?: string;
    insights?: string;
    created_at: string;
    audio_path?: string;
    insights_audio_path?: string;
  };
  onGenerateInsights: (entryId: string) => void;
  onPlayAudio: (audioPath: string) => void;
  onDelete: (entryId: string) => void;
}

export default function JournalEntry({ 
  entry, 
  onGenerateInsights, 
  onPlayAudio,
  onDelete 
}: JournalEntryProps) {
  return (
    <Card className="overflow-hidden hover:shadow-soft transition-shadow">
      <CardHeader className="bg-gradient-calm">
        <CardTitle className="text-xl font-display flex items-center justify-between">
          <span>{entry.title || format(new Date(entry.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(entry.id)}
            className="text-muted-foreground hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          {format(new Date(entry.created_at), "HH:mm")}
        </p>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {entry.transcription && (
          <div>
            <h4 className="font-semibold mb-2">Transcrição:</h4>
            <p className="text-sm text-muted-foreground line-clamp-3">
              {entry.transcription}
            </p>
          </div>
        )}
        
        {entry.insights && (
          <div className="bg-accent/10 rounded-lg p-4 border border-accent/20">
            <h4 className="font-semibold mb-2 flex items-center gap-2 text-accent">
              <Sparkles className="w-4 h-4" />
              Insights:
            </h4>
            <p className="text-sm whitespace-pre-wrap">{entry.insights}</p>
            {entry.insights_audio_path && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onPlayAudio(entry.insights_audio_path!)}
                className="mt-3"
              >
                <Volume2 className="w-4 h-4 mr-2" />
                Ouvir Insights
              </Button>
            )}
          </div>
        )}
        
        {entry.audio_path && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPlayAudio(entry.audio_path!)}
          >
            <Volume2 className="w-4 h-4 mr-2" />
            Ouvir Gravação
          </Button>
        )}
        
        {!entry.insights && (
          <Button
            onClick={() => onGenerateInsights(entry.id)}
            className="w-full bg-gradient-accent hover:opacity-90"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Gerar Insights
          </Button>
        )}
      </CardContent>
    </Card>
  );
}