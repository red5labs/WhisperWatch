
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Mic, MicOff, AlertCircle } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

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
  
  // Show help instructions if permission is denied
  useEffect(() => {
    if (permissionState === "denied") {
      setShowHelp(true);
    } else if (permissionState === "granted" && isListening) {
      // For troubleshooting: when permission is granted but we're still not getting audio
      console.log("Microphone permission is granted and we are listening. Check updateAudioLevel function.");
    }
  }, [permissionState, isListening]);
  
  const handleStart = () => {
    console.log("Start listening button clicked. Current permission state:", permissionState);
    
    // If permission hasn't been decided yet, show a helpful toast
    if (permissionState === "prompt" || permissionState === "unknown") {
      toast({
        title: "Microphone Access Needed",
        description: "Please click 'Allow' when your browser asks for microphone access.",
      });
    }
    
    onStartListening();
  };
  
  const handleStop = () => {
    onStopListening();
  };
  
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
  
  // Extra debug info for when we have permission but no audio is detected
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
