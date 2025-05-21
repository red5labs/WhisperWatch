
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Mic, MicOff } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

import NoiseMeter from "@/components/NoiseMeter";
import ThresholdControls from "@/components/ThresholdControls";
import Timer from "@/components/Timer";
import { useAudioLevel } from "@/hooks/useAudioLevel";

const DEFAULT_THRESHOLDS = {
  moderate: 30,
  loud: 60,
  excessive: 85
};

const Index = () => {
  const [thresholds, setThresholds] = useState({ ...DEFAULT_THRESHOLDS });
  const { audioLevel, isListening, startListening, stopListening } = useAudioLevel();
  const { toast } = useToast();

  const handleStartMonitoring = () => {
    startListening();
    toast({
      title: "We're listening!",
      description: "Now tracking classroom noise.",
    });
  };

  const handleStopMonitoring = () => {
    stopListening();
    toast({
      title: "Monitoring paused",
      description: "The noise meter is taking a break!",
    });
  };

  const handleThresholdChange = (key: keyof typeof thresholds, value: number) => {
    setThresholds(prev => ({
      ...prev,
      [key]: value
    }));
  };

  const resetThresholds = () => {
    setThresholds({ ...DEFAULT_THRESHOLDS });
    toast({
      title: "Settings reset",
      description: "Noise levels set back to normal.",
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-purple-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600 sm:text-4xl">
            Classroom Noise Monitor
          </h1>
          <p className="mt-2 text-lg text-gray-600">
            Help your students learn when to use their inside voices! 🤫
          </p>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Noise Meter Column */}
          <div className="md:col-span-2">
            <Card className="border-4 border-blue-200 shadow-lg overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-blue-100 to-purple-100">
                <CardTitle className="text-center text-blue-700">Noise Monitor</CardTitle>
                <CardDescription className="text-center">
                  Watch the noise level in your classroom
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Noise Meter */}
                <NoiseMeter level={audioLevel} thresholds={thresholds} />

                {/* Controls */}
                <div className="flex justify-center pt-4">
                  {!isListening ? (
                    <Button 
                      onClick={handleStartMonitoring} 
                      className="bg-green-500 hover:bg-green-600 rounded-full text-lg px-8 py-6 h-auto transform hover:scale-105 transition-transform shadow-md"
                      size="lg"
                    >
                      <Mic className="mr-2 h-5 w-5" />
                      Start Listening
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStopMonitoring} 
                      variant="destructive"
                      className="rounded-full text-lg px-8 py-6 h-auto transform hover:scale-105 transition-transform shadow-md"
                      size="lg"
                    >
                      <MicOff className="mr-2 h-5 w-5" />
                      Stop Listening
                    </Button>
                  )}
                </div>
              </CardContent>
              <CardFooter className="text-sm text-gray-500 justify-center bg-blue-50 p-4">
                {isListening 
                  ? "Listening to classroom noise - make some sound to test!" 
                  : "Click 'Start Listening' to begin watching noise levels"}
              </CardFooter>
            </Card>
          </div>

          {/* Settings Column */}
          <div>
            <Tabs defaultValue="timer" className="w-full">
              <TabsList className="grid w-full grid-cols-2 rounded-full bg-blue-100">
                <TabsTrigger value="timer" className="rounded-full data-[state=active]:bg-blue-500">Timer</TabsTrigger>
                <TabsTrigger value="settings" className="rounded-full data-[state=active]:bg-blue-500">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="timer" className="mt-4">
                <Card className="border-blue-200 border-2">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="text-center text-blue-700">Class Timer</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <Timer />
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="settings" className="mt-4">
                <Card className="border-blue-200 border-2">
                  <CardHeader className="bg-blue-50">
                    <CardTitle className="text-center text-blue-700">Noise Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4">
                    <ThresholdControls 
                      thresholds={thresholds}
                      onChange={handleThresholdChange}
                      onReset={resetThresholds}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4 text-blue-700">Teacher Tips</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-2 border-blue-200 bg-blue-50 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <span className="text-2xl mr-2">🎯</span> Getting Started
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Click "Start Listening" and allow microphone access. The noise meter will show your classroom's noise level.</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-blue-200 bg-purple-50 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <span className="text-2xl mr-2">🔍</span> Adjusting Settings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Change the noise thresholds to match what works best for your classroom activities.</p>
              </CardContent>
            </Card>
            <Card className="border-2 border-blue-200 bg-green-50 hover:shadow-md transition-shadow">
              <CardHeader>
                <CardTitle className="text-lg flex items-center">
                  <span className="text-2xl mr-2">⏱️</span> Using the Timer
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p>Set a timer for quiet reading time, group activities, or transitions between subjects.</p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer with teacher message */}
        <div className="mt-10 text-center text-gray-600 text-sm">
          <p>Made with ❤️ for amazing teachers and their students</p>
          <p className="mt-1">Remember: A quiet classroom is a learning classroom!</p>
        </div>
      </div>
    </div>
  );
};

export default Index;
