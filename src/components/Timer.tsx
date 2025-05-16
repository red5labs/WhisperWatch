
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bell } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

const Timer: React.FC = () => {
  const [minutes, setMinutes] = useState<number>(5);
  const [seconds, setSeconds] = useState<number>(0);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [inputMinutes, setInputMinutes] = useState<string>("5");
  const { toast } = useToast();

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isRunning) {
      interval = setInterval(() => {
        if (seconds > 0) {
          setSeconds(seconds - 1);
        } else if (minutes > 0) {
          setMinutes(minutes - 1);
          setSeconds(59);
        } else {
          // Timer complete
          clearInterval(interval);
          setIsRunning(false);
          toast({
            title: "Timer Complete!",
            description: "The classroom timer has ended.",
          });
        }
      }, 1000);
    }
    
    return () => clearInterval(interval);
  }, [isRunning, minutes, seconds, toast]);

  const startTimer = () => {
    if (!isRunning) {
      setIsRunning(true);
    }
  };

  const pauseTimer = () => {
    setIsRunning(false);
  };

  const resetTimer = () => {
    setIsRunning(false);
    const parsedMinutes = parseInt(inputMinutes, 10) || 5;
    setMinutes(parsedMinutes);
    setSeconds(0);
  };

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputMinutes(value);
  };

  const handleTimeSet = () => {
    const parsedMinutes = parseInt(inputMinutes, 10) || 5;
    setMinutes(parsedMinutes);
    setSeconds(0);
  };

  const formatTime = (min: number, sec: number) => {
    return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Class Timer</h2>
        <Bell className="text-blue-500 h-5 w-5" />
      </div>
      
      <div className="text-center mb-4">
        <div className="text-4xl font-bold tabular-nums">
          {formatTime(minutes, seconds)}
        </div>
      </div>
      
      <div className="flex space-x-2 mb-4">
        {!isRunning ? (
          <Button 
            onClick={startTimer} 
            className="flex-1 bg-green-500 hover:bg-green-600"
          >
            Start
          </Button>
        ) : (
          <Button 
            onClick={pauseTimer} 
            className="flex-1 bg-yellow-500 hover:bg-yellow-600"
          >
            Pause
          </Button>
        )}
        <Button 
          onClick={resetTimer}
          variant="outline" 
          className="flex-1"
        >
          Reset
        </Button>
      </div>
      
      <div className="flex items-center space-x-2">
        <Input
          type="number"
          min="1"
          max="60"
          value={inputMinutes}
          onChange={handleTimeChange}
          className="flex-1"
          placeholder="Minutes"
        />
        <Button 
          onClick={handleTimeSet}
          variant="secondary"
        >
          Set
        </Button>
      </div>
    </div>
  );
};

export default Timer;
