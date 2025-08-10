import { useState, useRef } from "react";
import { Video, Play, Pause, RotateCcw, Check, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface SelfieCaptureProps {
  onCaptureComplete: (videoBlob: Blob) => void;
  onBack: () => void;
  envelopeId: string;
}

export const SelfieCapture = ({ onCaptureComplete, onBack, envelopeId }: SelfieCaptureProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasRecorded, setHasRecorded] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [isCameraInitializing, setIsCameraInitializing] = useState(false);
  const [isFaceMatching, setIsFaceMatching] = useState(false);
  const [faceMatchResult, setFaceMatchResult] = useState<boolean | null>(null);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const RECORDING_DURATION = 5; // seconds

  const startCamera = async () => {
    setIsCameraInitializing(true);
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      console.error("Error accessing camera:", error);
      alert('Camera access failed. Please check permissions and try again.');
    } finally {
      setIsCameraInitializing(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const startRecording = () => {
    if (!stream) return;

    chunksRef.current = [];
    const mediaRecorder = new MediaRecorder(stream);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'video/webm' });
      setRecordedBlob(blob);
      setHasRecorded(true);
      stopCamera();
      performFaceMatching(blob);
    };

    mediaRecorder.start();
    setIsRecording(true);
    setRecordingTime(0);

    recordingIntervalRef.current = setInterval(() => {
      setRecordingTime(prev => {
        const newTime = prev + 0.1;
        if (newTime >= RECORDING_DURATION) {
          if (recordingIntervalRef.current) {
            clearInterval(recordingIntervalRef.current);
            recordingIntervalRef.current = null;
          }
          stopRecording();
          return RECORDING_DURATION;
        }
        return newTime;
      });
    }, 100);
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
        recordingIntervalRef.current = null;
      }
    }
  };

  const retakeVideo = () => {
    setHasRecorded(false);
    setRecordedBlob(null);
    setRecordingTime(0);
    startCamera();
  };

  const handleContinue = () => {
    if (recordedBlob) {
      onCaptureComplete(recordedBlob);
    }
  };

  const progressPercentage = (recordingTime / RECORDING_DURATION) * 100;

  const performFaceMatching = async (videoBlob: Blob) => {
    // Show processing state immediately
    setIsFaceMatching(true);
    setFaceMatchResult(null);
    sessionStorage.setItem('faceVerificationProcessing', 'true');
    
    // Add small delay to show processing state
    await new Promise(resolve => setTimeout(resolve, 500));
    
    try {
      // Extract a frame from the video for face detection
      const videoUrl = URL.createObjectURL(videoBlob);
      const video = document.createElement('video');
      video.src = videoUrl;
      await new Promise(resolve => video.onloadedmetadata = resolve);
      video.currentTime = 1; // Get a frame from 1 second in
      await new Promise(resolve => video.onseeked = resolve);

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const selfieImage = canvas.toDataURL('image/jpeg');

        // Load document image from session storage
        const documentImageData = sessionStorage.getItem('documentFrontImage') || '';
        if (!documentImageData) {
          console.error('No document image found for matching');
          setFaceMatchResult(false);
          sessionStorage.setItem('faceMatchResult', 'false');
          setIsFaceMatching(false);
          return;
        }

        // Send images to backend for facial recognition
        const formData = new FormData();
        formData.append('selfieImage', dataURItoBlob(selfieImage));
        formData.append('documentImage', dataURItoBlob(documentImageData));
        formData.append('envelopeId', envelopeId);

        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const API_KEY = import.meta.env.VITE_ADMIN_API_KEY || 'api_a44ed8187b7eefb29518361d3e2eda69';

        const response = await fetch(`${API_URL}/api/verify/face`, {
          method: 'POST',
          headers: {
            'x-api-key': API_KEY
          },
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const result = await response.json();
        
        // Add delay before showing result
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        setFaceMatchResult(result.faceVerified);
        sessionStorage.setItem('faceMatchResult', result.faceVerified.toString());
        // Store the detailed reason from Gemini API
        if (result.reason) {
          sessionStorage.setItem('faceMatchReason', result.reason);
        }
      }
    } catch (error) {
      console.error('Error during face match:', error);
      
      // Add delay before showing error result
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setFaceMatchResult(false);
      sessionStorage.setItem('faceMatchResult', 'false');
    } finally {
      setIsFaceMatching(false);
      sessionStorage.setItem('faceVerificationProcessing', 'false');
    }
  };

  // Helper function to convert data URI to Blob
  const dataURItoBlob = (dataURI: string) => {
    const byteString = atob(dataURI.split(',')[1]);
    const mimeString = dataURI.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }
    return new Blob([ab], { type: mimeString });
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-semibold mb-2">Record Selfie Video</h2>
        <p className="text-muted-foreground">
          Record a {RECORDING_DURATION}-second video of yourself for verification
        </p>
        {isFaceMatching && <p className="text-primary">Processing face match...</p>}
        {faceMatchResult !== null && !isFaceMatching && (
          <div className="text-sm mt-2 max-w-md mx-auto">
            {faceMatchResult ? (
              <span className="text-green-500">Face match successful!</span>
            ) : (
              <div className="text-red-500">
                <p className="font-medium mb-1">Face verification failed:</p>
                <p className="text-xs bg-red-50 p-2 rounded border">
                  {sessionStorage.getItem('faceMatchReason') || 'Please retry with better lighting and ensure your face is clearly visible.'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Instructions Card */}
      <Card className="p-4 mb-6 bg-verification-bg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium mb-1">Recording Guidelines:</p>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Look directly at the camera</li>
              <li>• Ensure your face is well-lit</li>
              <li>• Keep your head centered in frame</li>
              <li>• Stay still during recording</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Video Area */}
      <Card className="p-6 mb-6">
        <div className="aspect-square bg-muted rounded-lg overflow-hidden relative">
          {!stream && !hasRecorded && (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
                <Video className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground text-center">
                Position your face in the center of the frame
              </p>
            </div>
          )}

          {(stream || isCameraInitializing) && !hasRecorded && (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-4 border-2 border-primary rounded-full opacity-50" />
              
              {isRecording && (
                <>
                  <div className="absolute top-4 left-4 right-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                        <span className="text-white text-sm font-medium">Recording</span>
                      </div>
                      <span className="text-white text-sm font-medium">
                        {Math.ceil(RECORDING_DURATION - recordingTime)}s
                      </span>
                    </div>
                    <Progress value={progressPercentage} className="h-2" />
                  </div>
                </>
              )}
            </>
          )}

          {hasRecorded && recordedBlob && (
            <div className="relative w-full h-full">
              <video
                src={URL.createObjectURL(recordedBlob)}
                className="w-full h-full object-cover"
                controls
              />
              <div className="absolute top-2 right-2 w-8 h-8 bg-success rounded-full flex items-center justify-center">
                <Check className="w-5 h-5 text-success-foreground" />
              </div>
            </div>
          )}
        </div>

        {/* Recording Controls */}
        <div className="flex gap-3 mt-4">
          {!stream && !hasRecorded && (
            <Button onClick={startCamera} className="flex-1" disabled={isCameraInitializing}>
              {isCameraInitializing ? "Starting Camera..." : "Start Camera"}
            </Button>
          )}

          {stream && !isRecording && !hasRecorded && (
            <Button onClick={startRecording} className="flex-1">
              <Play className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          )}

          {isRecording && (
            <Button onClick={stopRecording} variant="destructive" className="flex-1">
              <Pause className="w-4 h-4 mr-2" />
              Stop Recording
            </Button>
          )}

          {hasRecorded && (
            <Button onClick={retakeVideo} variant="outline" className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake
            </Button>
          )}
        </div>
      </Card>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={handleContinue}
          disabled={!hasRecorded}
          className="flex-1"
        >
          Continue
        </Button>
      </div>
      <div className="mt-4 text-center">
        <Button variant="link" onClick={() => (window as any).setShowDeviceSwitch(true)}>
          Continue on another device
        </Button>
      </div>
    </div>
  );
};