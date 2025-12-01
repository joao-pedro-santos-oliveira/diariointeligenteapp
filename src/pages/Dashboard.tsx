import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import AudioRecorder from "@/components/AudioRecorder";
import JournalEntry from "@/components/JournalEntry";
import { LogOut, Sparkles } from "lucide-react";

export default function Dashboard() {
  const [user, setUser] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingEntry, setProcessingEntry] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
        fetchEntries();
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchEntries = async () => {
    const { data, error } = await supabase
      .from("journal_entries")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast({
        title: "Erro ao carregar entradas",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setEntries(data || []);
    }
  };

  const handleRecordingComplete = async (audioBlob: Blob) => {
    if (!user) return;
    setLoading(true);

    try {
      // Upload audio to storage
      const audioFileName = `${user.id}/${Date.now()}.webm`;
      const { error: uploadError } = await supabase.storage
        .from("journal-audio")
        .upload(audioFileName, audioBlob);

      if (uploadError) throw uploadError;

      // Convert audio to base64 for transcription
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64Audio = reader.result?.toString().split(",")[1];

        // Call transcription function
        const { data: transcriptionData, error: transcriptionError } = await supabase.functions.invoke(
          "transcribe-audio",
          { body: { audio: base64Audio } }
        );

        if (transcriptionError) throw transcriptionError;

        // Create journal entry
        const { error: insertError } = await supabase.from("journal_entries").insert({
          user_id: user.id,
          audio_path: audioFileName,
          transcription: transcriptionData.text,
        });

        if (insertError) throw insertError;

        toast({ title: "Entrada criada com sucesso!" });
        fetchEntries();
      };
    } catch (error: any) {
      toast({
        title: "Erro ao processar áudio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async (entryId: string) => {
    setProcessingEntry(entryId);
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    try {
      // Generate insights with AI
      const { data: insightsData, error: insightsError } = await supabase.functions.invoke(
        "analyze-journal",
        { body: { transcription: entry.transcription, timeframe: "dia" } }
      );

      if (insightsError) throw insightsError;

      // Generate audio from insights
      const { data: audioData, error: audioError } = await supabase.functions.invoke(
        "generate-audio",
        { body: { text: insightsData.insights } }
      );

      if (audioError) throw audioError;

      // Convert base64 to blob and upload
      const audioBlob = new Blob(
        [Uint8Array.from(atob(audioData.audioContent), (c) => c.charCodeAt(0))],
        { type: "audio/mp3" }
      );

      const audioFileName = `${user.id}/insights-${Date.now()}.mp3`;
      const { error: uploadError } = await supabase.storage
        .from("journal-audio")
        .upload(audioFileName, audioBlob);

      if (uploadError) throw uploadError;

      // Update entry with insights
      const { error: updateError } = await supabase
        .from("journal_entries")
        .update({
          insights: insightsData.insights,
          insights_audio_path: audioFileName,
        })
        .eq("id", entryId);

      if (updateError) throw updateError;

      toast({ title: "Insights gerados com sucesso!" });
      fetchEntries();
    } catch (error: any) {
      toast({
        title: "Erro ao gerar insights",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingEntry(null);
    }
  };

  const handlePlayAudio = async (audioPath: string) => {
    const { data } = await supabase.storage.from("journal-audio").createSignedUrl(audioPath, 3600);
    if (data) {
      const audio = new Audio(data.signedUrl);
      audio.play();
    }
  };

  const handleDeleteEntry = async (entryId: string) => {
    const entry = entries.find((e) => e.id === entryId);
    if (!entry) return;

    try {
      // Delete audio files from storage
      if (entry.audio_path) {
        await supabase.storage.from("journal-audio").remove([entry.audio_path]);
      }
      if (entry.insights_audio_path) {
        await supabase.storage.from("journal-audio").remove([entry.insights_audio_path]);
      }

      // Delete entry from database
      const { error } = await supabase.from("journal_entries").delete().eq("id", entryId);

      if (error) throw error;

      toast({ title: "Entrada excluída com sucesso!" });
      fetchEntries();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir entrada",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-gradient-calm">
      <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-primary flex items-center justify-center shadow-soft">
              <Sparkles className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-display">Diário Inteligente</h1>
          </div>
          <Button variant="ghost" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-2" />
            Sair
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <section className="text-center space-y-6 py-8">
            <h2 className="text-3xl font-display">Como foi seu dia?</h2>
            <p className="text-muted-foreground max-w-lg mx-auto">
              Grave um áudio contando sobre suas reflexões e receba insights profundos
            </p>
            <AudioRecorder onRecordingComplete={handleRecordingComplete} disabled={loading} />
          </section>

          <section className="space-y-6">
            <h3 className="text-2xl font-display">Suas Entradas</h3>
            {entries.length === 0 ? (
              <p className="text-center text-muted-foreground py-12">
                Você ainda não tem entradas. Grave seu primeiro áudio!
              </p>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {entries.map((entry) => (
                  <JournalEntry
                    key={entry.id}
                    entry={entry}
                    onGenerateInsights={handleGenerateInsights}
                    onPlayAudio={handlePlayAudio}
                    onDelete={handleDeleteEntry}
                  />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}