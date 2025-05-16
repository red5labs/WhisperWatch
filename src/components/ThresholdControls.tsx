
import React from 'react';
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

interface ThresholdsProps {
  thresholds: {
    moderate: number;
    loud: number;
    excessive: number;
  };
  onChange: (key: keyof typeof thresholds, value: number) => void;
  onReset: () => void;
}

const ThresholdControls: React.FC<ThresholdsProps> = ({ thresholds, onChange, onReset }) => {
  return (
    <div className="space-y-6 p-4 bg-white rounded-lg shadow-md">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Noise Thresholds</h2>
        <Button variant="outline" onClick={onReset}>Reset to Default</Button>
      </div>
      
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="moderate" className="font-medium text-yellow-600">Moderate</Label>
            <span className="text-sm font-medium">{thresholds.moderate}</span>
          </div>
          <Slider
            id="moderate"
            min={10}
            max={40}
            step={1}
            value={[thresholds.moderate]}
            onValueChange={(value) => onChange('moderate', value[0])}
            className="[&_[role=slider]]:bg-yellow-500"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="loud" className="font-medium text-orange-600">Loud</Label>
            <span className="text-sm font-medium">{thresholds.loud}</span>
          </div>
          <Slider
            id="loud"
            min={40}
            max={70}
            step={1}
            value={[thresholds.loud]}
            onValueChange={(value) => onChange('loud', value[0])}
            className="[&_[role=slider]]:bg-orange-500"
          />
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="excessive" className="font-medium text-red-600">Excessive</Label>
            <span className="text-sm font-medium">{thresholds.excessive}</span>
          </div>
          <Slider
            id="excessive"
            min={70}
            max={95}
            step={1}
            value={[thresholds.excessive]}
            onValueChange={(value) => onChange('excessive', value[0])}
            className="[&_[role=slider]]:bg-red-500"
          />
        </div>
      </div>
    </div>
  );
};

export default ThresholdControls;
