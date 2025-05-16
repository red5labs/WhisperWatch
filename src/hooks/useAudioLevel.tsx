
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
      console.log("Starting audio monitoring...");
      
      if (!navigator.mediaDevices) {
        console.error("Media devices not supported in this browser.");
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
        console.log("AudioContext created:", audioContextRef.current.state);
        
        // Resume audio context if it's suspended (needed for some browsers)
        if (audioContextRef.current.state === 'suspended') {
          await audioContextRef.current.resume();
          console.log("AudioContext resumed");
        }
      }
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: { 
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      streamRef.current = stream;
      console.log("Microphone access granted, tracks:", stream.getAudioTracks().length);
      
      const context = audioContextRef.current;
      const source = context.createMediaStreamSource(stream);
      const audioAnalyser = context.createAnalyser();
      
      // Configure the analyser for better sensitivity
      audioAnalyser.fftSize = 1024; // Increased for more data points
      audioAnalyser.minDecibels = -90; // Increase sensitivity (default is -100)
      audioAnalyser.maxDecibels = -10; // Upper volume limit (default is -30)
      audioAnalyser.smoothingTimeConstant = 0.3; // Lower value for quicker response
      
      source.connect(audioAnalyser);
      
      analyserRef.current = audioAnalyser;
      microphoneRef.current = source;
      setIsListening(true);
      
      // Prepare data array for frequency data
      const dataArray = new Uint8Array(audioAnalyser.frequencyBinCount);
      
      // Function to update audio level
      const updateAudioLevel = () => {
        if (!isListening || !analyserRef.current) return;
        
        analyserRef.current.getByteFrequencyData(dataArray);
        
        // Calculate average volume level (0-255)
        let sum = 0;
        let count = 0;
        
        // Skip the very lowest frequencies (often background noise)
        const startIndex = Math.floor(dataArray.length * 0.05);
        
        // Focus on the frequency range most relevant to human voice/classroom
        const endIndex = Math.floor(dataArray.length * 0.8);
        
        for (let i = startIndex; i < endIndex; i++) {
          sum += dataArray[i];
          count++;
        }
        
        const average = count > 0 ? sum / count : 0;
        
        // Apply non-linear scaling to make the meter more responsive
        // with enhanced sensitivity to lower volumes
        const scaledLevel = Math.pow(average / 255, 0.5) * 100;
        const normalizedLevel = Math.min(100, Math.max(0, scaledLevel));
        
        console.log("Audio level:", Math.round(normalizedLevel));
        setAudioLevel(normalizedLevel);
        
        // Continue animation loop
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      };
      
      // Start animation loop
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      
      toast({
        title: "Microphone Access Granted",
        description: "Now monitoring classroom noise levels."
      });
      
      console.log("Audio monitoring started successfully");
      
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
    console.log("Stopping audio monitoring...");
    
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
    
    console.log("Audio monitoring stopped");
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
