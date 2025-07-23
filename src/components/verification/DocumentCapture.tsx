import { useState, useRef } from "react";
import { Camera, RotateCcw, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface DocumentCaptureProps {
  documentType: {
    id: string;
    name: string;
  };
  onCaptureComplete: (images: { front: string; back?: string }) => void;
  onBack: () => void;
}

export const DocumentCapture = ({ documentType, onCaptureComplete, onBack }: DocumentCaptureProps) => {
  const [currentSide, setCurrentSide] = useState<"front" | "back">("front");
  const [capturedImages, setCapturedImages] = useState<{ front?: string; back?: string }>({});
  const [isCapturing, setIsCapturing] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const needsBackSide = documentType.id === "national_id" || documentType.id === "drivers_license";

  const startCamera = async () => {
    try {
      setIsCapturing(true);
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  };

  const captureImage = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext("2d");

    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0);

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setCapturedImages(prev => ({
      ...prev,
      [currentSide]: imageDataUrl
    }));

    stopCamera();

    if (currentSide === "front" && needsBackSide) {
      setCurrentSide("back");
    }
  };

  const retakePhoto = () => {
    setCapturedImages(prev => ({
      ...prev,
      [currentSide]: undefined
    }));
  };

  const handleContinue = () => {
    if (capturedImages.front && (!needsBackSide || capturedImages.back)) {
      onCaptureComplete({
        front: capturedImages.front,
        back: capturedImages.back
      });
    }
  };

  const isComplete = capturedImages.front && (!needsBackSide || capturedImages.back);
  const currentImage = capturedImages[currentSide];

  return (
    <div className="max-w-md mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">
          Capture {documentType.name}
        </h2>
        <p className="text-muted-foreground">
          {currentSide === "front" ? "Front" : "Back"} side
          {needsBackSide && ` (${currentSide === "front" ? "1" : "2"} of 2)`}
        </p>
      </div>

      {/* Instructions Card */}
      <Card className="p-4 mb-6 bg-verification-bg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Capture Tips:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Ensure good lighting</li>
              <li>• Keep the document flat</li>
              <li>• All edges should be visible</li>
              <li>• Avoid glare and shadows</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Camera/Preview Area */}
      <Card className="p-6 mb-6">
        <div className="aspect-[4/3] bg-muted rounded-lg overflow-hidden relative">
          {!isCapturing && !currentImage && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Camera className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground text-center">
                Position your {documentType.name} {currentSide} side within the frame
              </p>
            </div>
          )}

          {isCapturing && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-4 border-2 border-primary rounded-lg opacity-50" />
            </>
          )}

          {currentImage && (
            <div className="relative w-full h-full">
              <img
                src={currentImage}
                alt={`${documentType.name} ${currentSide}`}
                className="w-full h-full object-cover"
              />
              <div className="absolute top-2 right-2 w-8 h-8 bg-success rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-success-foreground" />
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        {/* Camera Controls */}
        <div className="flex gap-3 mt-4">
          {!isCapturing && !currentImage && (
            <Button onClick={startCamera} className="flex-1">
              <Camera className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          )}

          {isCapturing && (
            <Button onClick={captureImage} className="flex-1">
              Capture Photo
            </Button>
          )}

          {currentImage && (
            <Button onClick={retakePhoto} variant="outline" className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake
            </Button>
          )}
        </div>
      </Card>

      {/* Progress Indicator */}
      {needsBackSide && (
        <div className="flex justify-center space-x-2 mb-6">
          <div className={cn(
            "w-3 h-3 rounded-full",
            capturedImages.front ? "bg-success" : currentSide === "front" ? "bg-primary" : "bg-muted"
          )} />
          <div className={cn(
            "w-3 h-3 rounded-full",
            capturedImages.back ? "bg-success" : currentSide === "back" ? "bg-primary" : "bg-muted"
          )} />
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={!isComplete}
          className="flex-1"
        >
          {needsBackSide && !capturedImages.back ? "Continue to Back" : "Continue"}
        </Button>
      </div>
    </div>
  );
};