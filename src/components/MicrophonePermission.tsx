
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, AlertCircle, AudioLines } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MicrophonePermissionProps {
  permissionState: "prompt" | "granted" | "denied" | "unknown";
  isListening: boolean;
  onStartListening: () => void;
  onStopListening: () => void;
}

const MicrophonePermission: React.FC<MicrophonePermissionProps> = ({
  permissionState,
  isListening,
  onStartListening,
  onStopListening
}) => {
  const { toast } = useToast();
  const [showHelp, setShowHelp] = useState(false);
  const [checkingMicrophone, setCheckingMicrophone] = useState(false);
  
  // Show help instructions if permission is denied
  useEffect(() => {
    if (permissionState === "denied") {
      setShowHelp(true);
    } else if (permissionState === "granted" && isListening) {
      // For troubleshooting: when permission is granted but we're still not getting audio
      console.log("Microphone permission is granted and we are listening. Checking for audio.");
      
      // Set a timer to display troubleshooting advice if no audio is detected
      const timer = setTimeout(() => {
        setCheckingMicrophone(true);
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [permissionState, isListening]);
  
  const handleStart = () => {
    console.log("Start listening button clicked. Current permission state:", permissionState);
    setCheckingMicrophone(false);
    
    // Show a friendly toast for elementary classrooms
    toast({
      title: "Let's listen to our classroom! 🎧",
      description: "Please allow microphone access if asked.",
    });
    
    onStartListening();
  };
  
  const handleStop = () => {
    setCheckingMicrophone(false);
    onStopListening();
  };
  
  // Special troubleshooting component when we have permission but no audio
  if (permissionState === "granted" && isListening && checkingMicrophone) {
    return (
      <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4 text-center space-y-3 max-w-md mx-auto">
        <div className="flex justify-center">
          <AudioLines className="text-blue-500 w-10 h-10 animate-pulse" />
        </div>
        <h3 className="text-lg font-semibold text-blue-700">Listening for Sounds...</h3>
        <p className="text-sm text-blue-800">
          We're having trouble hearing your classroom. Try these tips:
        </p>
        <ol className="text-left text-sm space-y-2 text-blue-800 list-decimal pl-5">
          <li>Make some loud sounds near your device</li>
          <li>Check that your microphone isn't muted on your device</li>
          <li>Try a different browser (Chrome works best!)</li>
          <li>Stop and restart the listening</li>
        </ol>
        <div className="pt-2">
          <Button 
            onClick={handleStop}
            variant="destructive"
            className="mr-2"
          >
            <MicOff className="mr-1 h-4 w-4" />
            Stop
          </Button>
          <Button 
            onClick={handleStart} 
            className="bg-green-500 hover:bg-green-600"
          >
            <Mic className="mr-1 h-4 w-4" />
            Restart
          </Button>
        </div>
      </div>
    );
  }
  
  // If permission was denied, show helpful instructions
  if (permissionState === "denied" && showHelp) {
    return (
      <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4 text-center space-y-3 max-w-md mx-auto">
        <div className="flex justify-center">
          <AlertCircle className="text-orange-500 w-10 h-10" />
        </div>
        <h3 className="text-lg font-semibold text-orange-700">Microphone Access Needed</h3>
        <p className="text-sm text-orange-800">
          This app needs microphone access to monitor classroom noise. Here's how to enable it:
        </p>
        <ol className="text-left text-sm space-y-2 text-orange-800 list-decimal pl-5">
          <li>Look for the microphone icon in your browser's address bar</li>
          <li>Click it and select "Allow" access for this site</li>
          <li>Refresh the page to try again</li>
        </ol>
        <div className="pt-2">
          <Button 
            onClick={() => setShowHelp(false)}
            variant="outline"
            className="bg-orange-100 border-orange-400 mr-2"
          >
            Hide Instructions
          </Button>
          <Button 
            onClick={handleStart} 
            className="bg-green-500 hover:bg-green-600"
          >
            <Mic className="mr-1 h-4 w-4" />
            Try Again
          </Button>
        </div>
      </div>
    );
  }
  
  // When actively listening
  if (permissionState === "granted" && isListening) {
    return (
      <div className="space-y-4">
        <Button 
          onClick={handleStop} 
          variant="destructive"
          className="rounded-full text-lg px-8 py-6 h-auto transform hover:scale-105 transition-transform shadow-md"
          size="lg"
        >
          <MicOff className="mr-2 h-5 w-5" />
          Stop Listening
        </Button>
        
        <div className="text-xs text-center text-gray-500 animate-pulse">
          Listening with microphone... make some noise!
        </div>
      </div>
    );
  }
  
  // Default start button with fun design for elementary classrooms
  return (
    <Button 
      onClick={handleStart} 
      className="bg-green-500 hover:bg-green-600 rounded-full text-lg px-8 py-6 h-auto transform hover:scale-105 transition-transform shadow-md"
      size="lg"
    >
      <Mic className="mr-2 h-5 w-5" />
      Start Listening
    </Button>
  );
};

export default MicrophonePermission;
