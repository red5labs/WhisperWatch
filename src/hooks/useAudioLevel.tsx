
import { useState, useEffect, useCallback } from 'react';
import { useToast } from "@/components/ui/use-toast";

// Define the return type for our hook
interface AudioLevelHook {
  audioLevel: number;
  isListening: boolean;
  startListening: () => void;
  stopListening: () => void;
}

export function useAudioLevel(): AudioLevelHook {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [microphone, setMicrophone] = useState<MediaStreamAudioSourceNode | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const { toast } = useToast();

  // Function to handle starting the audio monitoring
  const startListening = useCallback(async () => {
    try {
      if (!navigator.mediaDevices) {
        toast({
          title: "Error",
          description: "Media devices not supported in this browser.",
          variant: "destructive",
        });
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const context = new AudioContext();
      const source = context.createMediaStreamSource(stream);
      const audioAnalyser = context.createAnalyser();
      
      audioAnalyser.fftSize = 32;
      source.connect(audioAnalyser);

      setAudioContext(context);
      setAnalyser(audioAnalyser);
      setMicrophone(source);
      setIsListening(true);

      // Start monitoring audio levels
      const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
      const updateAudioLevel = () => {
        if (!isListening) return;
        
        audioAnalyser.getByteFrequencyData(dataArray);
        
        // Calculate average volume level (0-100)
        const average = dataArray.reduce((acc, val) => acc + val, 0) / dataArray.length;
        const normalizedLevel = Math.min(100, Math.max(0, Math.round((average / 255) * 100)));
        
        setAudioLevel(normalizedLevel);
        
        if (isListening) {
          requestAnimationFrame(updateAudioLevel);
        }
      };
      
      updateAudioLevel();
      
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Permission Denied",
        description: "Please allow microphone access to use the noise monitor.",
        variant: "destructive",
      });
    }
  }, [isListening, toast]);

  // Function to stop listening
  const stopListening = useCallback(() => {
    if (microphone && audioContext) {
      setIsListening(false);
      
      // Clean up audio resources
      microphone.disconnect();
      audioContext.close();
      
      setAudioContext(null);
      setAnalyser(null);
      setMicrophone(null);
      setAudioLevel(0);
    }
  }, [microphone, audioContext]);

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [isListening, stopListening]);

  return { audioLevel, isListening, startListening, stopListening };
}
