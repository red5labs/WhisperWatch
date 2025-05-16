
import { useState, useEffect, useCallback, useRef } from 'react';
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
  const [isListening, setIsListening] = useState<boolean>(false);
  const { toast } = useToast();
  
  // Using refs to store audio objects to prevent recreation on renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Animation frame reference for cleanup
  const animationFrameRef = useRef<number | null>(null);

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

      // Create new audio context if we don't have one
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      const context = audioContextRef.current;
      const source = context.createMediaStreamSource(stream);
      const audioAnalyser = context.createAnalyser();
      
      // Configure the analyser for better sensitivity
      audioAnalyser.fftSize = 256; // Increased for more data points
      audioAnalyser.smoothingTimeConstant = 0.5; // Smooths transitions
      source.connect(audioAnalyser);
      
      analyserRef.current = audioAnalyser;
      microphoneRef.current = source;
      setIsListening(true);
      
      // Prepare data array for frequency data
      const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
      
      // Function to update audio level
      const updateAudioLevel = () => {
        if (!isListening) return;
        
        if (analyserRef.current) {
          analyserRef.current.getByteFrequencyData(dataArray);
          
          // Calculate average volume level (0-100)
          // Skip the lowest frequencies (often contain noise)
          const startIndex = 1;
          const values = dataArray.slice(startIndex);
          const sum = values.reduce((acc, val) => acc + val, 0);
          const average = values.length > 0 ? sum / values.length : 0;
          
          // Apply non-linear scaling to make the meter more responsive
          // Square root curve makes small sounds more noticeable
          const normalizedLevel = Math.min(
            100, 
            Math.max(0, Math.round(Math.sqrt(average / 255) * 100))
          );
          
          setAudioLevel(normalizedLevel);
        }
        
        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      // Start animation loop
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      
      toast({
        title: "Microphone Access Granted",
        description: "Now monitoring classroom noise levels."
      });
      
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
    // Cancel animation frame if it exists
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Disconnect and clean up audio sources
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
    }
    
    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    
    // Close audio context
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    microphoneRef.current = null;
    
    setIsListening(false);
    setAudioLevel(0);
  }, []);

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
