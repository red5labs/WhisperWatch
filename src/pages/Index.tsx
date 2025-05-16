
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
      title: "Monitoring Started",
      description: "Now tracking classroom noise levels.",
    });
  };

  const handleStopMonitoring = () => {
    stopListening();
    toast({
      title: "Monitoring Stopped",
      description: "Noise tracking has been paused.",
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
      title: "Thresholds Reset",
      description: "Noise thresholds have been reset to default values.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 sm:text-4xl">Classroom Noise Monitor</h1>
          <p className="mt-2 text-lg text-gray-600">Track and manage your classroom noise levels easily</p>
        </div>

        {/* Main Content */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Noise Meter Column */}
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Noise Monitor</CardTitle>
                <CardDescription>
                  Real-time classroom noise level tracking
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Noise Meter */}
                <NoiseMeter level={audioLevel} thresholds={thresholds} />

                {/* Controls */}
                <div className="flex justify-center pt-4">
                  {!isListening ? (
                    <Button 
                      onClick={handleStartMonitoring} 
                      className="bg-green-500 hover:bg-green-600"
                      size="lg"
                    >
                      <Mic className="mr-2 h-5 w-5" />
                      Start Monitoring
                    </Button>
                  ) : (
                    <Button 
                      onClick={handleStopMonitoring} 
                      variant="destructive"
                      size="lg"
                    >
                      <MicOff className="mr-2 h-5 w-5" />
                      Stop Monitoring
                    </Button>
                  )}
                </div>
              </CardContent>
              <CardFooter className="text-sm text-gray-500 justify-center">
                {isListening 
                  ? "Monitoring active - adjusting noise levels in real-time" 
                  : "Click 'Start Monitoring' to begin tracking noise levels"}
              </CardFooter>
            </Card>
          </div>

          {/* Settings Column */}
          <div>
            <Tabs defaultValue="timer" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="timer">Timer</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              <TabsContent value="timer" className="mt-4">
                <Timer />
              </TabsContent>
              <TabsContent value="settings" className="mt-4">
                <ThresholdControls 
                  thresholds={thresholds}
                  onChange={handleThresholdChange}
                  onReset={resetThresholds}
                />
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Tips for Using the Noise Monitor</h2>
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Getting Started</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Allow microphone access when prompted and click "Start Monitoring" to begin tracking noise levels.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Customizing Thresholds</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Adjust the noise thresholds in Settings to match your classroom's normal noise environment.</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Using the Timer</CardTitle>
              </CardHeader>
              <CardContent>
                <p>Set a timer for quiet activities or to help manage transitions between lessons.</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
