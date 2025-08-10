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
        video: { 
          facingMode: "user",
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 },
          frameRate: { ideal: 30, min: 15 }
        },
        audio: true
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        // Ensure video is playing
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play().catch(console.error);
        };
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
    
    // Try to use a more compatible video format
    let mimeType = 'video/webm;codecs=vp8';
    if (!MediaRecorder.isTypeSupported(mimeType)) {
      mimeType = 'video/webm';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = ''; // Let browser choose
        }
      }
    }
    
    console.log('Using MediaRecorder with mimeType:', mimeType || 'browser default');
    
    const options = mimeType ? { mimeType } : {};
    const mediaRecorder = new MediaRecorder(stream, options);
    mediaRecorderRef.current = mediaRecorder;

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        console.log('MediaRecorder data chunk received, size:', event.data.size);
        chunksRef.current.push(event.data);
      }
    };

    mediaRecorder.onstop = () => {
      console.log('MediaRecorder stopped, total chunks:', chunksRef.current.length);
      const totalSize = chunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
      console.log('Total video size:', totalSize, 'bytes');
      
      const blob = new Blob(chunksRef.current, { type: mimeType || 'video/webm' });
      console.log('Created video blob, size:', blob.size, 'type:', blob.type);
      
      setRecordedBlob(blob);
      setHasRecorded(true);
      stopCamera();
      performFaceMatching(blob);
    };

    mediaRecorder.onerror = (event) => {
      console.error('MediaRecorder error:', event);
      alert('Recording failed. Please try again.');
      setIsRecording(false);
    };

    // Start recording with smaller timeslices for better data availability
    mediaRecorder.start(100); // Request data every 100ms
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
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.playsInline = true;
      
      // Wait for video to load completely
      await new Promise((resolve, reject) => {
        video.onloadeddata = () => {
          console.log('Video loaded, duration:', video.duration, 'dimensions:', video.videoWidth, 'x', video.videoHeight);
          resolve(true);
        };
        video.onerror = (e) => {
          console.error('Video loading error:', e);
          reject(new Error('Failed to load video'));
        };
        video.src = videoUrl;
      });
      
      // Ensure we have valid video dimensions
      if (video.videoWidth === 0 || video.videoHeight === 0) {
        throw new Error('Video has invalid dimensions');
      }
      
      // Seek to middle of video for better frame capture
      const seekTime = Math.min(video.duration / 2, 2.5); // Middle of video or 2.5s, whichever is smaller
      video.currentTime = seekTime;
      
      // Wait for seek to complete
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Video seek timeout'));
        }, 3000);
        
        video.onseeked = () => {
          clearTimeout(timeout);
          console.log('Video seeked to time:', video.currentTime);
          resolve(true);
        };
        video.onerror = (e) => {
          clearTimeout(timeout);
          console.error('Video seek error:', e);
          reject(new Error('Failed to seek video'));
        };
      });

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Failed to get canvas context');
      }
      
      // Clear canvas and draw video frame
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      // Check if canvas has actual image data (not just black)
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imageData.data;
      let hasNonBlackPixels = false;
      
      // Check every 100th pixel to see if we have non-black content
      for (let i = 0; i < pixels.length; i += 400) { // RGBA = 4 bytes per pixel, so check every 100th pixel
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (r > 10 || g > 10 || b > 10) { // Allow for slight variations from pure black
          hasNonBlackPixels = true;
          break;
        }
      }
      
      if (!hasNonBlackPixels) {
        console.error('Extracted frame is completely black');
        throw new Error('Video frame extraction resulted in black image');
      }
      
      const selfieImage = canvas.toDataURL('image/jpeg', 0.8);
      console.log('Successfully extracted frame, data URL length:', selfieImage.length);
      
      // Clean up video URL
      URL.revokeObjectURL(videoUrl);

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
    } catch (error) {
      console.error('Error during face match:', error);
      
      // Add delay before showing error result
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setFaceMatchResult(false);
      sessionStorage.setItem('faceMatchResult', 'false');
      sessionStorage.setItem('faceMatchReason', `Frame extraction failed: ${error.message}`);
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