
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
  const animationFrameRef = useRef<number | null>(null);
  
  // Increased sensitivity significantly
  const sensitivityMultiplier = 50; 

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
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log("AudioContext created:", audioContextRef.current.state);
      }
      
      // Resume audio context if it's suspended (needed for some browsers)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log("AudioContext resumed");
      }
      
      // Request microphone access - with minimal constraints
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      streamRef.current = stream;
      console.log("Microphone access granted, tracks:", stream.getAudioTracks().length);
      console.log("Audio track settings:", stream.getAudioTracks()[0].getSettings());
      
      const context = audioContextRef.current;
      const source = context.createMediaStreamSource(stream);
      const audioAnalyser = context.createAnalyser();
      
      // Smaller FFT size for faster updates
      audioAnalyser.fftSize = 256; 
      
      source.connect(audioAnalyser);
      
      analyserRef.current = audioAnalyser;
      microphoneRef.current = source;
      setIsListening(true);
      
      // Prepare data array for time domain data (waveform)
      const dataArray = new Uint8Array(audioAnalyser.fftSize);
      
      console.log("Audio processing configured, beginning monitoring loop");
      
      // Function to update audio level
      const updateAudioLevel = () => {
        if (!analyserRef.current) {
          console.warn("Analyzer not available");
          return;
        }
        
        // Get time-domain data
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        // Calculate volume using RMS (Root Mean Square)
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          // For time domain data, we measure deviation from the center value (128)
          const deviation = dataArray[i] - 128;
          sum += deviation * deviation;
        }
        
        // Calculate RMS value
        const volume = Math.sqrt(sum / dataArray.length);
        
        // Apply sensitivity multiplier and clamp to 0-100 range
        const adjustedVolume = Math.min(100, Math.max(0, volume * sensitivityMultiplier));
        
        // Log samples periodically for debugging
        if (Math.random() < 0.01) {
          console.log("Raw volume:", volume.toFixed(2), "Adjusted:", adjustedVolume.toFixed(2));
          console.log("Sample values (first 10):", Array.from(dataArray.slice(0, 10)));
          console.log("Sample statistics - Min:", Math.min(...Array.from(dataArray)), 
                      "Max:", Math.max(...Array.from(dataArray)), 
                      "Mean:", dataArray.reduce((a, b) => a + b, 0) / dataArray.length);
        }
        
        // Log every update for debugging
        console.log(`Audio level: ${adjustedVolume.toFixed(2)}`);
        
        setAudioLevel(adjustedVolume);
        
        // Continue animation loop if still listening
        if (isListening) {
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
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
  }, [isListening, toast, sensitivityMultiplier]);

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
      // Just suspend rather than close to allow quick restart
      audioContextRef.current.suspend();
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
