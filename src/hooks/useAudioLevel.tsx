
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
  
  // Extremely high sensitivity for classroom settings
  const sensitivityMultiplier = 300;
  
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
        console.log("Creating new AudioContext");
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      
      if (audioContextRef.current.state === 'suspended') {
        console.log("Resuming suspended AudioContext");
        await audioContextRef.current.resume();
      }
      
      console.log("AudioContext state:", audioContextRef.current.state);
      
      // Explicitly request microphone with a user gesture
      console.log("Requesting microphone access...");
      navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,  // Disable echo cancellation for better sensitivity
          noiseSuppression: false,  // Disable noise suppression for better detection
          autoGainControl: false,   // Disable auto gain for consistent levels
        } 
      }).then((stream) => {
        console.log("Microphone access explicitly granted!");
        setPermissionState("granted");
        
        // Store the stream reference
        streamRef.current = stream;
        
        // Log tracks for debugging
        console.log("Audio tracks obtained:", stream.getAudioTracks().length);
        const audioTrack = stream.getAudioTracks()[0];
        console.log("Audio track settings:", audioTrack.getSettings());
        console.log("Audio track enabled:", audioTrack.enabled);
        console.log("Audio track readyState:", audioTrack.readyState);
        
        // Check if track is actually live and enabled
        if (!audioTrack.enabled) {
          console.warn("Audio track is not enabled!");
          audioTrack.enabled = true;
        }
        
        // Create audio processor
        const context = audioContextRef.current!;
        const source = context.createMediaStreamSource(stream);
        const audioAnalyser = context.createAnalyser();
        
        // Fine-tune analyzer for more sensitivity
        audioAnalyser.fftSize = 256; // Smaller for faster updates
        audioAnalyser.smoothingTimeConstant = 0.1; // Less smoothing for responsive readings
        audioAnalyser.minDecibels = -90; // More sensitive to quiet sounds
        audioAnalyser.maxDecibels = -10; // Still cap loud sounds
        
        source.connect(audioAnalyser);
        
        // Store references
        analyserRef.current = audioAnalyser;
        microphoneRef.current = source;
        setIsListening(true);
        
        // Prepare data arrays
        const dataArray = new Uint8Array(audioAnalyser.fftSize);
        const frequencyData = new Uint8Array(audioAnalyser.frequencyBinCount);
        
        console.log("Audio processing configured with high sensitivity");
        
        // Function to update audio level - with extensive debugging
        const updateAudioLevel = () => {
          if (!analyserRef.current) return;
          
          // Get time-domain data (waveform)
          analyserRef.current.getByteTimeDomainData(dataArray);
          
          // Get frequency data
          analyserRef.current.getByteFrequencyData(frequencyData);
          
          // Calculate RMS volume from time domain data
          let sumSquares = 0;
          for (let i = 0; i < dataArray.length; i++) {
            const amplitude = dataArray[i] - 128;  // Convert to signed value
            sumSquares += amplitude * amplitude;
          }
          const rmsVolume = Math.sqrt(sumSquares / dataArray.length);
          
          // Calculate average frequency energy 
          const avgFrequency = frequencyData.reduce((sum, value) => sum + value, 0) / frequencyData.length;
          
          // Calculate peak values for both
          const peakWaveform = Math.max(...Array.from(dataArray).map(v => Math.abs(v - 128)));
          const peakFrequency = Math.max(...Array.from(frequencyData));
          
          // Combined metric with emphasis on peaks, which helps detect short sounds
          const combinedVolume = (rmsVolume * 0.5) + (avgFrequency * 0.3) + (peakFrequency * 0.2);
          
          // Apply sensitivity multiplier and clamp
          const adjustedVolume = Math.min(100, Math.max(0, combinedVolume * sensitivityMultiplier));
          
          // Log values at reduced frequency for debugging
          if (Math.random() < 0.01) {
            console.log("Audio metrics:", {
              rms: rmsVolume.toFixed(2),
              avgFreq: avgFrequency.toFixed(2), 
              peakWave: peakWaveform,
              peakFreq: peakFrequency,
              combined: combinedVolume.toFixed(2),
              adjusted: adjustedVolume.toFixed(2)
            });
            
            // Check if we're getting any data at all
            console.log("Raw time samples:", dataArray.slice(0, 5));
            console.log("Raw frequency samples:", frequencyData.slice(0, 5));
            console.log("Any audio detected:", peakFrequency > 0 || peakWaveform > 0);
          }
          
          setAudioLevel(adjustedVolume);
          
          // Continue the animation loop if still listening
          if (isListening) {
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
          }
        };
        
        // Start the analysis loop
        animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        
        toast({
          title: "Microphone connected! 🎤",
          description: "Now monitoring classroom noise levels.",
        });
        
      }).catch((error) => {
        console.error("Error accessing microphone:", error);
        setPermissionState("denied");
        
        toast({
          title: "Microphone Access Needed",
          description: "Please allow microphone access to use the noise monitor.",
          variant: "destructive",
        });
      });
      
    } catch (error) {
      console.error("Error in startListening:", error);
      toast({
        title: "Something went wrong",
        description: "Could not start the microphone. Please try again.",
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
