
import React, { useEffect, useState } from 'react';
import { cn } from "@/lib/utils";
import { Volume, Volume1, Volume2, VolumeX } from "lucide-react";

interface NoiseMeterProps {
  level: number;
  thresholds: {
    moderate: number;
    loud: number;
    excessive: number;
  };
}

const NoiseMeter: React.FC<NoiseMeterProps> = ({ level, thresholds }) => {
  const [animatedLevel, setAnimatedLevel] = useState(level);
  
  // More responsive animation for the meter
  useEffect(() => {
    // Use animation frames for smoother transitions
    const animateToNewLevel = () => {
      setAnimatedLevel(prev => {
        // Very fast response to make sure we see changes immediately
        const speed = 0.9;
        
        // When there's a significant jump, move faster
        const significance = Math.abs(prev - level) > 10 ? 10.0 : 5.0;
        
        // If we're very close to target, just snap to it
        if (Math.abs(prev - level) < 0.5) return level;
        
        return prev + (level - prev) * speed * significance; 
      });
    };
    
    const animationId = requestAnimationFrame(animateToNewLevel);
    return () => cancelAnimationFrame(animationId);
  }, [level]);

  // Log level changes for debugging
  useEffect(() => {
    console.log("NoiseMeter receiving level:", level);
  }, [level]);

  // Determine the appropriate color based on noise level
  const getNoiseColor = () => {
    if (level >= thresholds.excessive) return 'bg-red-500';
    if (level >= thresholds.loud) return 'bg-orange-500';
    if (level >= thresholds.moderate) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  // Get appropriate character with enhanced visual feedback
  const getNoiseCharacter = () => {
    if (level >= thresholds.excessive) {
      return (
        <div className="animate-bounce">
          <div className="text-5xl mb-2">🙉</div>
          <div className="text-red-500 font-bold">Too Loud!</div>
        </div>
      );
    }
    if (level >= thresholds.loud) {
      return (
        <div className="animate-pulse">
          <div className="text-5xl mb-2">😲</div>
          <div className="text-orange-500 font-bold">Very Noisy</div>
        </div>
      );
    }
    if (level >= thresholds.moderate) {
      return (
        <div>
          <div className="text-5xl mb-2">🙂</div>
          <div className="text-yellow-500 font-bold">Moderate</div>
        </div>
      );
    }
    if (level > 5) {
      return (
        <div>
          <div className="text-5xl mb-2">😊</div>
          <div className="text-green-600 font-bold">Quiet</div>
        </div>
      );
    }
    return (
      <div>
        <div className="text-5xl mb-2">😴</div>
        <div className="text-gray-400 font-bold">Silent</div>
      </div>
    );
  };

  // Get label for noise level
  const getNoiseLabel = () => {
    if (level >= thresholds.excessive) return 'Too Loud!';
    if (level >= thresholds.loud) return 'Very Noisy';
    if (level >= thresholds.moderate) return 'Moderate';
    if (level > 5) return 'Quiet';
    return 'Silent';
  };

  // Calculate meter width with additional visual smoothing
  const getMeterWidth = () => {
    // Ensure the value is between 0 and 100
    return `${Math.max(0, Math.min(100, animatedLevel))}%`;
  };

  // Function to render sound wave indicators based on noise level
  const renderSoundWaves = () => {
    if (level < 5) return null;
    
    const waveCount = Math.floor(level / 20) + 1;
    const waves = [];
    
    for (let i = 0; i < waveCount; i++) {
      waves.push(
        <div 
          key={i}
          className={cn(
            "absolute rounded-full animate-ping opacity-70",
            level >= thresholds.excessive ? "bg-red-300" : 
            level >= thresholds.loud ? "bg-orange-300" :
            level >= thresholds.moderate ? "bg-yellow-300" : "bg-green-300"
          )}
          style={{
            width: `${60 + i * 20}px`,
            height: `${60 + i * 20}px`,
            animationDelay: `${i * 0.2}s`,
            animationDuration: '1s',
            left: `calc(50% - ${30 + i * 10}px)`,
            top: `calc(50% - ${30 + i * 10}px)`
          }}
        />
      );
    }
    
    return waves;
  };

  return (
    <div className="w-full max-w-md mx-auto bg-white rounded-xl border-4 border-blue-200 p-6 shadow-lg">
      {/* Character display with sound waves */}
      <div className="relative flex justify-center items-center h-40 mb-6">
        {renderSoundWaves()}
        <div className="z-10">
          {getNoiseCharacter()}
        </div>
      </div>
      
      <h2 className="text-2xl font-bold text-center mb-6 text-blue-600">Class Noise Level</h2>

      {/* Meter background - styled as a fun ruler */}
      <div className="h-10 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full overflow-hidden shadow-inner border-2 border-blue-300 relative">
        {/* Decorative ruler marks */}
        <div className="absolute top-0 left-1/4 h-3 w-1 bg-blue-400"></div>
        <div className="absolute top-0 left-1/2 h-3 w-1 bg-blue-400"></div>
        <div className="absolute top-0 left-3/4 h-3 w-1 bg-blue-400"></div>
        
        {/* Meter fill */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-25", // Even faster transition
            getNoiseColor()
          )}
          style={{ width: getMeterWidth() }}
        ></div>
      </div>

      {/* Level indicators with kid-friendly labels */}
      <div className="flex justify-between mt-2 text-xs">
        <div className="flex flex-col items-center">
          <span className="text-green-600 font-bold">Whisper</span>
          <span>😊</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-yellow-500 font-bold">Normal</span>
          <span>🙂</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-orange-500 font-bold">Noisy</span>
          <span>😲</span>
        </div>
        <div className="flex flex-col items-center">
          <span className="text-red-500 font-bold">Too Loud</span>
          <span>🙉</span>
        </div>
      </div>

      {/* Current level display */}
      <div className="text-center mt-6 bg-blue-50 py-3 px-4 rounded-lg border-2 border-blue-200">
        <div className="text-sm text-blue-700 mb-1">Current Noise Level:</div>
        <div className="flex items-center justify-center">
          <span className={cn(
            "text-3xl font-bold mr-1",
            level >= thresholds.excessive && "text-red-500",
            level >= thresholds.loud && level < thresholds.excessive && "text-orange-500",
            level >= thresholds.moderate && level < thresholds.loud && "text-yellow-500",
            level > 5 && level < thresholds.moderate && "text-green-600",
            level <= 5 && "text-gray-400"
          )}>
            {Math.round(level)}
          </span>
          <span className="text-gray-500">/100</span>
        </div>
      </div>

      {/* Microphone status indicator */}
      <div className="mt-4 p-2 bg-gray-50 rounded-lg border border-gray-200 text-sm">
        <div className="flex items-center justify-center">
          <div 
            className={cn(
              "w-3 h-3 rounded-full mr-2",
              level > 0 ? "bg-green-500" : "bg-red-500"
            )}
          ></div>
          <p>Microphone: {level > 0 ? "Working" : "Not detecting sound"}</p>
        </div>
        <p className="mt-1 text-xs text-center text-gray-500">
          {level > 0 ? "Microphone is detecting sounds" : "Make some noise or check microphone permissions"}
        </p>
      </div>
    </div>
  );
};

export default NoiseMeter;
