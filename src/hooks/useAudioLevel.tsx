
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
  
  // Sensitivity multiplier - increase this value to make it more sensitive
  const sensitivityMultiplier = 10; // Increased from 5 to 10

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
      console.log("Audio track settings:", stream.getAudioTracks()[0].getSettings());
      
      const context = audioContextRef.current;
      const source = context.createMediaStreamSource(stream);
      const audioAnalyser = context.createAnalyser();
      
      // Configure the analyser - use a smaller FFT size for faster response
      audioAnalyser.fftSize = 512; // Smaller for faster processing
      audioAnalyser.smoothingTimeConstant = 0.2; // Less smoothing for quicker response
      
      source.connect(audioAnalyser);
      
      analyserRef.current = audioAnalyser;
      microphoneRef.current = source;
      setIsListening(true);
      
      // Prepare data array for time domain data (waveform)
      const dataArray = new Uint8Array(audioAnalyser.fftSize);
      
      console.log("Audio processing configured, beginning monitoring loop");
      
      // Function to update audio level using the same approach as the working script
      const updateAudioLevel = () => {
        if (!analyserRef.current) {
          console.warn("Analyzer not available");
          return;
        }
        
        // Use getByteTimeDomainData as in your working example
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        // Calculate RMS (Root Mean Square) of the audio signal
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          // Deviation from the center (128)
          const deviation = dataArray[i] - 128;
          sum += deviation * deviation;
        }
        
        // RMS calculation - square root of the average
        const volume = Math.sqrt(sum / dataArray.length);
        
        // Apply sensitivity multiplier and clamp to 0-100 range
        const adjustedVolume = Math.min(100, volume * sensitivityMultiplier);
        
        // Log every few frames to avoid flooding console
        if (Math.random() < 0.05) { // Log roughly 5% of frames
          console.log("Raw volume:", volume.toFixed(2), "Adjusted:", adjustedVolume.toFixed(2));
          // Log some sample values from the array to verify we're getting data
          console.log("Sample values:", dataArray.slice(0, 5));
        }
        
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
