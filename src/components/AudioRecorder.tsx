import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Mic, Square, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface AudioRecorderProps {
  onRecordingComplete: (audioBlob: Blob) => void;
  disabled?: boolean;
}

export default function AudioRecorder({ onRecordingComplete, disabled }: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
        onRecordingComplete(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);

    } catch (error) {
      toast({
        title: "Erro ao acessar microfone",
        description: "Verifique as permissões do navegador",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {isRecording && (
        <div className="text-lg font-semibold text-primary animate-pulse">
          {formatTime(recordingTime)}
        </div>
      )}
      
      <Button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={disabled}
        size="lg"
        className={`rounded-full w-20 h-20 transition-all duration-300 ${
          isRecording 
            ? 'bg-destructive hover:bg-destructive/90 shadow-glow' 
            : 'bg-gradient-primary hover:opacity-90 shadow-soft'
        }`}
      >
        {disabled ? (
          <Loader2 className="w-8 h-8 animate-spin" />
        ) : isRecording ? (
          <Square className="w-8 h-8" />
        ) : (
          <Mic className="w-8 h-8" />
        )}
      </Button>
      
      <p className="text-sm text-muted-foreground">
        {disabled 
          ? "Processando..." 
          : isRecording 
          ? "Clique para parar a gravação" 
          : "Clique para gravar"}
      </p>
    </div>
  );
}