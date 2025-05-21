
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";

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
  
  // Drastically increased sensitivity - elementary classrooms need high sensitivity
  const sensitivityMultiplier = 200; 

  // Function to handle starting the audio monitoring
  const startListening = useCallback(async () => {
    try {
      console.log("Starting audio monitoring with enhanced sensitivity...");
      
      if (!navigator.mediaDevices) {
        console.error("Media devices not supported in this browser.");
        toast({
          title: "Oops! Can't access microphone",
          description: "This browser doesn't support microphone access.",
          variant: "destructive",
        });
        return;
      }

      // Create new audio context if we don't have one
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        console.log("AudioContext created:", audioContextRef.current.state);
      }
      
      // Resume audio context if it's suspended
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
        console.log("AudioContext resumed");
      }
      
      // Request microphone access with minimal constraints for maximum compatibility
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
      console.log("Audio track constraints:", stream.getAudioTracks()[0].getConstraints());
      
      const context = audioContextRef.current;
      const source = context.createMediaStreamSource(stream);
      const audioAnalyser = context.createAnalyser();
      
      // Use smaller FFT size for faster updates
      audioAnalyser.fftSize = 256; 
      audioAnalyser.smoothingTimeConstant = 0.2; // Less smoothing for more responsive readings
      
      source.connect(audioAnalyser);
      
      analyserRef.current = audioAnalyser;
      microphoneRef.current = source;
      setIsListening(true);
      
      // Prepare time domain data array (waveform)
      const dataArray = new Uint8Array(audioAnalyser.fftSize);
      
      // Prepare frequency data array
      const frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
      
      console.log("Audio processing configured, beginning monitoring loop");
      
      // Function to update audio level
      const updateAudioLevel = () => {
        if (!analyserRef.current) {
          console.warn("Analyzer not available");
          return;
        }
        
        // Get time-domain data (waveform)
        analyserRef.current.getByteTimeDomainData(dataArray);
        
        // Also get frequency data for better detection
        analyserRef.current.getByteFrequencyData(frequencyData);
        
        // Calculate RMS volume from time domain data
        let sumSquares = 0;
        for (let i = 0; i < dataArray.length; i++) {
          // Convert 0-255 value to -128 to 127 range
          const amplitude = dataArray[i] - 128;
          sumSquares += amplitude * amplitude;
        }
        const rmsVolume = Math.sqrt(sumSquares / dataArray.length);
        
        // Calculate average frequency energy
        const avgFrequency = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length;
        
        // Combine both metrics with weighted average - frequency data helps catch vocals better
        const combinedVolume = (rmsVolume * 0.7) + (avgFrequency * 0.3);
        
        // Apply sensitivity multiplier and clamp to 0-100 range
        const adjustedVolume = Math.min(100, Math.max(0, combinedVolume * sensitivityMultiplier));
        
        // Log samples periodically for debugging
        if (Math.random() < 0.01) {
          console.log("Raw RMS:", rmsVolume.toFixed(2), 
                      "Freq avg:", avgFrequency.toFixed(2), 
                      "Combined:", combinedVolume.toFixed(2), 
                      "Adjusted:", adjustedVolume.toFixed(2));
                      
          console.log("Sample time values (first 10):", Array.from(dataArray.slice(0, 10)));
          console.log("Sample frequency values (first 10):", Array.from(frequencyData.slice(0, 10)));
          
          // Detailed audio stats
          console.log("Audio stats - Min frequency:", Math.min(...Array.from(frequencyData)), 
                      "Max frequency:", Math.max(...Array.from(frequencyData)), 
                      "Silent?", Math.max(...Array.from(frequencyData)) < 5);
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
        title: "Microphone is listening!",
        description: "Now watching classroom noise levels.",
      });
      
    } catch (error) {
      console.error("Error accessing microphone:", error);
      toast({
        title: "Need microphone access",
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
