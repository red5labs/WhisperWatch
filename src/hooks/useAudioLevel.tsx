
import { useState, useEffect, useCallback, useRef } from 'react';
import { useToast } from "@/components/ui/use-toast";

interface AudioLevelHook {
  audioLevel: number;
  isListening: boolean;
  permissionState: "prompt" | "granted" | "denied" | "unknown";
  startListening: () => void;
  stopListening: () => void;
}

export function useAudioLevel(): AudioLevelHook {
  const [audioLevel, setAudioLevel] = useState<number>(0);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [permissionState, setPermissionState] = useState<"prompt" | "granted" | "denied" | "unknown">("unknown");
  const { toast } = useToast();
  
  // Using refs to store audio objects to prevent recreation on renders
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const microphoneRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  
  // Higher sensitivity for elementary classroom settings
  const sensitivityMultiplier = 400; // Increased from 300
  
  // Check microphone permission status on mount
  useEffect(() => {
    const checkPermission = async () => {
      try {
        // Check if we can access permissions API
        if (navigator.permissions) {
          const permissionStatus = await navigator.permissions.query({ name: 'microphone' as PermissionName });
          console.log("Initial microphone permission status:", permissionStatus.state);
          setPermissionState(permissionStatus.state as "prompt" | "granted" | "denied");
          
          // Listen for permission changes
          permissionStatus.addEventListener('change', () => {
            console.log("Microphone permission changed to:", permissionStatus.state);
            setPermissionState(permissionStatus.state as "prompt" | "granted" | "denied");
          });
        } else {
          console.log("Permissions API not available, will request directly.");
        }
      } catch (err) {
        console.warn("Could not check permission state:", err);
      }
    };
    
    checkPermission();
  }, []);

  // Function to handle starting the audio monitoring
  const startListening = useCallback(async () => {
    try {
      console.log("Starting audio monitoring...");
      
      // First, check if media devices are supported
      if (!navigator.mediaDevices) {
        console.error("Media devices not supported in this browser.");
        toast({
          title: "Oops! Can't access microphone",
          description: "This browser doesn't support microphone access.",
          variant: "destructive",
        });
        return;
      }
      
      // Create or resume audio context 
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }
      
      console.log("AudioContext state:", audioContextRef.current.state);
      
      // Explicitly request microphone with a user gesture
      console.log("Requesting microphone access...");
      
      // CRITICAL FIX: Ensure we're actually getting the microphone stream
      const constraints = { 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log("Microphone access granted, tracks:", stream.getAudioTracks().length);
      
      if (stream.getAudioTracks().length === 0) {
        throw new Error("No audio tracks received from microphone");
      }
      
      setPermissionState("granted");
      
      // Store the stream reference
      streamRef.current = stream;
      
      // Log tracks for debugging
      const audioTrack = stream.getAudioTracks()[0];
      console.log("Audio track settings:", audioTrack.getSettings());
      console.log("Audio track enabled:", audioTrack.enabled);
      console.log("Audio track readyState:", audioTrack.readyState);
      
      // Create audio processor
      const context = audioContextRef.current;
      const source = context.createMediaStreamSource(stream);
      const audioAnalyser = context.createAnalyser();
      
      // Configure analyzer - key to fixing the detection issue
      audioAnalyser.fftSize = 1024; // More frequency resolution
      audioAnalyser.smoothingTimeConstant = 0.2; // Less smoothing for better responsiveness
      audioAnalyser.minDecibels = -90;
      audioAnalyser.maxDecibels = -10;
      
      // Connect source to analyzer
      source.connect(audioAnalyser);
      
      // Store references
      analyserRef.current = audioAnalyser;
      microphoneRef.current = source;
      setIsListening(true);
      
      // Prepare data arrays - critical fix: use correct sizes
      const timeDomainData = new Uint8Array(audioAnalyser.fftSize);
      const frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
      
      console.log("Audio processing configured, beginning monitoring loop");
      
      // MAIN FIX: Completely rewritten audio level calculation function
      const updateAudioLevel = () => {
        if (!analyserRef.current) {
          console.log("No analyzer found in update loop");
          return;
        }
        
        try {
          // Get time-domain data (waveform)
          analyserRef.current.getByteTimeDomainData(timeDomainData);
          
          // Get frequency data
          analyserRef.current.getByteFrequencyData(frequencyData);
          
          // CRITICAL FIX: Better volume calculation method
          // Calculate RMS (Root Mean Square) for better volume representation
          let sumSquares = 0;
          for (let i = 0; i < timeDomainData.length; i++) {
            // Convert to signed (-128 to 127)
            const amplitude = timeDomainData[i] - 128;
            sumSquares += amplitude * amplitude;
          }
          
          const rms = Math.sqrt(sumSquares / timeDomainData.length);
          
          // Calculate weighted frequency average, focusing on speech frequencies
          let totalEnergy = 0;
          let weightedSum = 0;
          const nyquist = audioContextRef.current!.sampleRate / 2;
          
          for (let i = 0; i < frequencyData.length; i++) {
            // Calculate the actual frequency this bin represents
            const frequency = (i / frequencyData.length) * nyquist;
            
            // Weight frequencies in human voice range (300Hz-3000Hz) more heavily
            let weight = 1.0;
            if (frequency > 300 && frequency < 3000) {
              weight = 2.0; // Double importance of speech frequencies
            }
            
            weightedSum += frequencyData[i] * weight;
            totalEnergy += weight;
          }
          
          const freqAverage = totalEnergy > 0 ? weightedSum / totalEnergy : 0;
          
          // Find peak values
          const maxFrequency = Math.max(...Array.from(frequencyData));
          
          // Combined volume metric:
          // - RMS provides overall volume level
          // - Frequency average captures spectral content
          // - Peak frequency catches short bursts of sound
          const combinedVolume = (rms * 0.6) + (freqAverage * 0.3) + (maxFrequency * 0.1);
          
          // Apply sensitivity multiplier and normalize to 0-100 range
          const normalizedVolume = Math.min(100, Math.max(0, combinedVolume * (sensitivityMultiplier / 128)));
          
          // Log values periodically (not every frame to avoid console spam)
          if (Math.random() < 0.05) {
            console.log("Audio metrics:", {
              rms: rms.toFixed(2),
              freqAvg: freqAverage.toFixed(2),
              maxFreq: maxFrequency,
              combined: combinedVolume.toFixed(2),
              level: normalizedVolume.toFixed(2)
            });
            
            // Debug raw audio data
            console.log("Time domain samples (first few):", Array.from(timeDomainData.slice(0, 5)));
            console.log("Frequency samples (first few):", Array.from(frequencyData.slice(0, 5)));
          }
          
          setAudioLevel(normalizedVolume);
        } catch (error) {
          console.error("Error in audio processing:", error);
        }
        
        // Continue the loop if still listening
        if (isListening) {
          animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
      };
      
      // Start the monitoring loop
      animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
      
      // Notify user
      toast({
        title: "Microphone connected! 🎤",
        description: "Now monitoring classroom noise levels.",
      });
      
    } catch (error) {
      console.error("Error accessing microphone:", error);
      setPermissionState("denied");
      
      toast({
        title: "Microphone Access Needed",
        description: "Please allow microphone access to use the noise monitor.",
        variant: "destructive",
      });
    }
  }, [isListening, toast, sensitivityMultiplier]);

  // Function to stop listening
  const stopListening = useCallback(() => {
    console.log("Stopping audio monitoring...");
    
    // Cancel animation frame
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    
    // Disconnect audio processing
    if (microphoneRef.current) {
      microphoneRef.current.disconnect();
    }
    
    // Stop all tracks in the stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        console.log("Audio track stopped");
      });
      streamRef.current = null;
    }
    
    // Suspend audio context
    if (audioContextRef.current) {
      audioContextRef.current.suspend().then(() => {
        console.log("AudioContext suspended");
      });
    }
    
    // Clear references
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

  return { audioLevel, isListening, permissionState, startListening, stopListening };
}
