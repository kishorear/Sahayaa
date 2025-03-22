import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Video, X, Check } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface ScreenRecorderProps {
  onRecordingComplete: (blob: Blob) => void;
  onCancel: () => void;
}

export default function ScreenRecorder({ onRecordingComplete, onCancel }: ScreenRecorderProps) {
  const [recording, setRecording] = useState<boolean>(false);
  const [processing, setProcessing] = useState<boolean>(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  const startRecording = async () => {
    try {
      setError(null);
      setProcessing(true);
      
      // Request screen capture
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false
      });
      
      streamRef.current = stream;
      
      // Create a media recorder instance
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up data handlers
      chunksRef.current = [];
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      // Set up stop handler
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        setRecording(false);
        setProcessing(false);
      };
      
      // Start recording
      mediaRecorder.start();
      setRecording(true);
      setProcessing(false);
      
      // Add a listener for when user stops sharing
      stream.getVideoTracks()[0].onended = () => {
        stopRecording();
      };
    } catch (err) {
      console.error('Error starting screen recording:', err);
      setError('Failed to start screen recording. Please make sure you have granted the necessary permissions.');
      setProcessing(false);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      
      // Stop all tracks
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleSubmit = () => {
    if (chunksRef.current.length > 0) {
      const blob = new Blob(chunksRef.current, { type: 'video/mp4' });
      onRecordingComplete(blob);
    }
  };

  const handleCancel = () => {
    if (recording) {
      stopRecording();
    }
    
    // Clean up
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    onCancel();
  };

  return (
    <div className="flex flex-col items-center p-4 border rounded-lg bg-background shadow">
      <div className="mb-4 w-full">
        <h3 className="text-xl font-bold mb-2">Record Your Screen</h3>
        <p className="text-muted-foreground mb-4">
          Record your screen to show us the issue you're experiencing. This will help us resolve your ticket faster.
        </p>
        
        {error && (
          <div className="bg-destructive/10 text-destructive p-3 rounded-md mb-4">
            {error}
          </div>
        )}
        
        {previewUrl ? (
          <div className="relative w-full h-60 bg-black rounded-md overflow-hidden mb-4">
            <video
              src={previewUrl}
              controls
              className="w-full h-full object-contain"
            />
          </div>
        ) : (
          <div className="w-full h-60 bg-muted rounded-md flex items-center justify-center mb-4">
            {processing ? (
              <Loader2 className="h-12 w-12 text-primary animate-spin" />
            ) : recording ? (
              <div className="flex flex-col items-center">
                <div className="w-4 h-4 rounded-full bg-destructive animate-pulse mb-2" />
                <p className="text-sm font-medium">Recording in progress...</p>
              </div>
            ) : (
              <Video className="h-12 w-12 text-muted-foreground" />
            )}
          </div>
        )}
        
        <div className="flex space-x-2 justify-center">
          {!recording && !previewUrl && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    onClick={startRecording}
                    disabled={processing}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {processing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Preparing...
                      </>
                    ) : (
                      'Start Recording'
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Start screen recording to show us the issue</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {recording && (
            <Button
              onClick={stopRecording}
              variant="destructive"
            >
              Stop Recording
            </Button>
          )}
          
          {previewUrl && (
            <>
              <Button
                onClick={handleSubmit}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                <Check className="mr-2 h-4 w-4" />
                Attach to Ticket
              </Button>
              
              <Button
                onClick={startRecording}
                variant="outline"
              >
                Record Again
              </Button>
            </>
          )}
          
          <Button
            onClick={handleCancel}
            variant="outline"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    </div>
  );
}