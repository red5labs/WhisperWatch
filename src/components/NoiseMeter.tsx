
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
  const [lastUpdateTime, setLastUpdateTime] = useState(Date.now());
  
  // Enhanced smooth animation for the meter with faster response time
  useEffect(() => {
    const now = Date.now();
    const timeDelta = now - lastUpdateTime;
    setLastUpdateTime(now);
    
    // Use animation frames for smoother transitions
    const animateToNewLevel = () => {
      setAnimatedLevel(prev => {
        // Adjust responsiveness based on direction of level change
        // Faster response when level increases, smoother when decreases
        const speed = level > prev ? 0.5 : 0.2;
        
        // More responsive when significant changes occur
        const significance = Math.abs(prev - level) > 15 ? 1.5 : 1;
        
        if (Math.abs(prev - level) < 0.5) return level;
        return prev + (level - prev) * speed * significance; 
      });
    };
    
    const animationId = requestAnimationFrame(animateToNewLevel);
    return () => cancelAnimationFrame(animationId);
  }, [level, lastUpdateTime]);

  // Determine the appropriate color based on noise level
  const getNoiseColor = () => {
    if (level >= thresholds.excessive) return 'bg-red-500';
    if (level >= thresholds.loud) return 'bg-orange-500';
    if (level >= thresholds.moderate) return 'bg-yellow-400';
    return 'bg-green-500';
  };

  // Get appropriate icon with enhanced visual feedback
  const getNoiseIcon = () => {
    if (level >= thresholds.excessive) {
      return <Volume2 className="text-red-500 animate-pulse h-12 w-12" />;
    }
    if (level >= thresholds.loud) {
      return <Volume2 className="text-orange-500 h-12 w-12" />;
    }
    if (level >= thresholds.moderate) {
      return <Volume1 className="text-yellow-500 h-12 w-12" />;
    }
    if (level > 5) {
      return <Volume className="text-green-600 h-12 w-12" />;
    }
    return <VolumeX className="text-gray-400 h-12 w-12" />;
  };

  // Get label for noise level
  const getNoiseLabel = () => {
    if (level >= thresholds.excessive) return 'Too Loud!';
    if (level >= thresholds.loud) return 'Very Noisy';
    if (level >= thresholds.moderate) return 'Moderate';
    if (level > 5) return 'Quiet';
    return 'Silent';
  };

  return (
    <div className="w-full max-w-md mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold">Noise Level</h2>
        <div className="flex items-center">
          {getNoiseIcon()}
          <span className={cn(
            "ml-2 font-semibold text-lg",
            level >= thresholds.excessive && "text-red-500",
            level >= thresholds.loud && level < thresholds.excessive && "text-orange-500",
            level >= thresholds.moderate && level < thresholds.loud && "text-yellow-500",
            level > 5 && level < thresholds.moderate && "text-green-600",
            level <= 5 && "text-gray-400"
          )}>
            {getNoiseLabel()}
          </span>
        </div>
      </div>

      {/* Meter background */}
      <div className="h-8 bg-gray-200 rounded-full overflow-hidden shadow-inner">
        {/* Meter fill */}
        <div
          className={cn(
            "h-full rounded-full transition-all duration-150",
            getNoiseColor()
          )}
          style={{ width: `${Math.max(0, Math.min(100, animatedLevel))}%` }}
        ></div>
      </div>

      {/* Visual indicator dots */}
      <div className="relative h-1 mt-1">
        <div className="absolute left-1/4 bottom-0 w-1 h-1 bg-yellow-400 rounded-full"></div>
        <div className="absolute left-1/2 bottom-0 w-1 h-1 bg-orange-500 rounded-full"></div>
        <div className="absolute left-3/4 bottom-0 w-1 h-1 bg-red-500 rounded-full"></div>
      </div>

      {/* Level markers */}
      <div className="relative h-6">
        <div className="absolute top-0 left-0 text-xs text-gray-600">0</div>
        <div className="absolute top-0 left-1/4 text-xs text-gray-600 -ml-2">{Math.round(thresholds.moderate / 2)}</div>
        <div className="absolute top-0 left-1/2 text-xs text-gray-600 -ml-2">{thresholds.moderate}</div>
        <div className="absolute top-0 left-3/4 text-xs text-gray-600 -ml-2">{thresholds.loud}</div>
        <div className="absolute top-0 right-0 text-xs text-gray-600">100</div>
      </div>

      {/* Current level display */}
      <div className="text-center mt-2">
        <span className="text-2xl font-bold">{Math.round(level)}</span>
        <span className="text-gray-500 ml-1">/ 100</span>
      </div>
    </div>
  );
};

export default NoiseMeter;
