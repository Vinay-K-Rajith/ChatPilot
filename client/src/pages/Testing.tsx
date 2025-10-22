import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { 
  TestTube, 
  Send, 
  Upload, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Phone, 
  CreditCard,
  Trash2,
  FileImage,
  FileText,
  FileVideo,
  File
} from "lucide-react";
import {
  validateWhatsAppPhoneNumber,
  validateMessageOrMedia,
  formatPhoneNumberForWhatsApp,
  validateMediaFile,
  formatFileSize
} from "@/utils/validators";

interface AccountInfo {
  accountSid: string;
  phoneNumber: string;
  balance: string;
}

interface TestMessage {
  id: string;
  to: string;
  message: string;
  media: string | null;
  status: 'success' | 'error';
  timestamp: string;
  messageSid?: string;
  error?: string;
}

export default function Testing() {
  // Form state
  const [phoneNumber, setPhoneNumber] = useState("");
  const [message, setMessage] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // Validation state
  const [phoneError, setPhoneError] = useState("");
  const [messageError, setMessageError] = useState("");
  const [fileError, setFileError] = useState("");
  
  // Account and history state
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [accountLoading, setAccountLoading] = useState(true);
  const [testHistory, setTestHistory] = useState<TestMessage[]>([]);
  
  const { toast } = useToast();

  // Fetch account info on mount
  useEffect(() => {
    fetchAccountInfo();
  }, []);

  const fetchAccountInfo = async () => {
    try {
      setAccountLoading(true);
      const response = await fetch('/api/account-info');
      if (response.ok) {
        const data = await response.json();
        setAccountInfo(data);
      } else {
        console.error('Failed to fetch account info:', response.statusText);
        toast({
          title: "Warning",
          description: "Could not fetch Twilio account information",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error fetching account info:', error);
    } finally {
      setAccountLoading(false);
    }
  };

  // Real-time phone number validation
  useEffect(() => {
    if (phoneNumber) {
      const validation = validateWhatsAppPhoneNumber(phoneNumber);
      setPhoneError(validation.isValid ? "" : validation.error || "");
    } else {
      setPhoneError("");
    }
  }, [phoneNumber]);

  // Real-time message validation  
  useEffect(() => {
    const validation = validateMessageOrMedia(message, selectedFile);
    setMessageError(validation.isValid ? "" : validation.error || "");
  }, [message, selectedFile]);

  // File upload handler
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setSelectedFile(file || null);
    
    if (file) {
      const validation = validateMediaFile(file);
      setFileError(validation.isValid ? "" : validation.error || "");
    } else {
      setFileError("");
    }
  };

  // Remove selected file
  const removeSelectedFile = () => {
    setSelectedFile(null);
    setFileError("");
    // Reset file input
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  // Check if form is valid for submission
  const isFormValid = () => {
    const phoneValid = validateWhatsAppPhoneNumber(phoneNumber).isValid;
    const contentValid = validateMessageOrMedia(message, selectedFile).isValid;
    const fileValid = !selectedFile || validateMediaFile(selectedFile).isValid;
    
    return phoneValid && contentValid && fileValid && !isLoading;
  };

  // Submit handler
  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    
    if (!isFormValid()) {
      return;
    }

    setIsLoading(true);
    
    try {
      const formattedPhone = formatPhoneNumberForWhatsApp(phoneNumber);
      
      // Prepare request data
      const requestData: any = {
        to: formattedPhone,
        message: message.trim()
      };

      // Add media if present (convert to base64 for API)
      if (selectedFile) {
        const base64 = await fileToBase64(selectedFile);
        requestData.media = {
          filename: selectedFile.name,
          mimetype: selectedFile.type,
          data: base64
        };
      }

      const response = await fetch('/api/send-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData),
      });

      const result = await response.json();
      
      // Create test result entry
      const testResult: TestMessage = {
        id: Date.now().toString(),
        to: formattedPhone,
        message: message.trim() || '[Media only]',
        media: selectedFile ? selectedFile.name : null,
        status: response.ok && result.success ? 'success' : 'error',
        timestamp: new Date().toISOString(),
        messageSid: result.messageSid,
        error: !response.ok || !result.success ? result.error || 'Unknown error' : undefined
      };
      
      // Add to history
      setTestHistory(prev => [testResult, ...prev.slice(0, 9)]); // Keep last 10 results
      
      if (response.ok && result.success) {
        toast({
          title: "Message sent successfully!",
          description: `Message delivered to ${formattedPhone}`,
        });
        
        // Clear form on success
        setMessage("");
        setSelectedFile(null);
        setPhoneNumber("");
        const fileInput = document.getElementById('file-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        toast({
          title: "Failed to send message",
          description: result.error || "An error occurred while sending the message",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      const testResult: TestMessage = {
        id: Date.now().toString(),
        to: formatPhoneNumberForWhatsApp(phoneNumber),
        message: message.trim() || '[Media only]',
        media: selectedFile ? selectedFile.name : null,
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Network error or server unavailable'
      };
      
      setTestHistory(prev => [testResult, ...prev.slice(0, 9)]);
      
      toast({
        title: "Network error",
        description: "Could not connect to the server. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to convert file to base64
  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:mime/type;base64, prefix
        resolve(result.split(',')[1]);
      };
      reader.onerror = error => reject(error);
    });
  };

  // Get file icon based on type
  const getFileIcon = (filename: string) => {
    const ext = filename.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) return FileImage;
    if (['mp4', '3gp', 'mov'].includes(ext || '')) return FileVideo;
    if (['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) return FileText;
    return File;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-lg">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-20"
          style={{
            backgroundImage: 'url(https://images.unsplash.com/photo-1563986768494-4dee2763ff3f?w=1200&auto=format&fit=crop)',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-[#1E3A5F]/95 via-[#2C5F8D]/90 to-[#4A90BF]/95" />
        <div className="relative p-6 text-white flex items-center gap-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <TestTube className="h-6 w-6" />
              WhatsApp Testing Lab
            </h1>
            <p className="text-white/80 mt-1">Test Twilio WhatsApp messaging functionality</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Phone className="h-5 w-5" />
              Account Status
            </CardTitle>
            <CardDescription>Twilio WhatsApp connection details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {accountLoading ? (
              <div className="text-sm text-muted-foreground">Loading account information...</div>
            ) : accountInfo ? (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Status</span>
                  <Badge variant="default" className="bg-green-500">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Connected
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Phone Number</span>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {accountInfo.phoneNumber}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Account Balance</span>
                  <div className="flex items-center gap-1">
                    <CreditCard className="h-3 w-3" />
                    <span className="text-sm font-mono">${accountInfo.balance}</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={fetchAccountInfo}
                  className="w-full"
                >
                  Refresh Status
                </Button>
              </>
            ) : (
              <Alert>
                <XCircle className="h-4 w-4" />
                <AlertDescription>
                  Unable to connect to Twilio. Please check your configuration.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Message Form */}
        <Card>
          <CardHeader>
            <CardTitle>Send Test Message</CardTitle>
            <CardDescription>Test WhatsApp message delivery with text and media</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Phone Number Input */}
              <div className="space-y-2">
                <Label htmlFor="phone-number">Phone Number</Label>
                <Input
                  id="phone-number"
                  type="tel"
                  placeholder="+1234567890"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className={phoneError ? "border-red-500" : ""}
                />
                {phoneError && (
                  <p className="text-sm text-red-500">{phoneError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Use international format with country code (e.g., +1234567890)
                </p>
              </div>

              {/* Message Input */}
              <div className="space-y-2">
                <Label htmlFor="message">Message Text</Label>
                <Textarea
                  id="message"
                  placeholder="Type your test message here... (optional if media is attached)"
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className={messageError && !selectedFile ? "border-red-500" : ""}
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>{message.length}/4096 characters</span>
                  {messageError && (
                    <span className="text-red-500">{messageError}</span>
                  )}
                </div>
              </div>

              {/* File Upload */}
              <div className="space-y-2">
                <Label htmlFor="file-upload">Media Attachment (Optional)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="file-upload"
                    type="file"
                    accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt,.csv"
                    onChange={handleFileSelect}
                    className="cursor-pointer"
                  />
                  {selectedFile && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={removeSelectedFile}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                {selectedFile && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted p-2 rounded">
                    {(() => {
                      const FileIcon = getFileIcon(selectedFile.name);
                      return <FileIcon className="h-4 w-4" />;
                    })()}
                    <span>{selectedFile.name}</span>
                    <span>({formatFileSize(selectedFile.size)})</span>
                  </div>
                )}
                {fileError && (
                  <p className="text-sm text-red-500">{fileError}</p>
                )}
                <p className="text-xs text-muted-foreground">
                  Supports images, videos, audio, and documents (max 5MB for images, 16MB for videos/audio, 100MB for documents)
                </p>
              </div>

              {/* Submit Button */}
              <Button 
                type="submit" 
                className="w-full" 
                disabled={!isFormValid()}
              >
                {isLoading ? (
                  <>
                    <Clock className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Test Message
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Test History */}
        {testHistory.length > 0 && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Test History</CardTitle>
              <CardDescription>Recent test message attempts</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Message</TableHead>
                    <TableHead>Media</TableHead>
                    <TableHead>Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testHistory.map((test) => (
                    <TableRow key={test.id}>
                      <TableCell>
                        <Badge 
                          variant={test.status === 'success' ? 'default' : 'destructive'}
                          className={test.status === 'success' ? 'bg-green-500' : ''}
                        >
                          {test.status === 'success' ? (
                            <CheckCircle className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircle className="h-3 w-3 mr-1" />
                          )}
                          {test.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{test.to}</TableCell>
                      <TableCell className="max-w-xs truncate" title={test.message}>
                        {test.message}
                      </TableCell>
                      <TableCell>
                        {test.media ? (
                          <div className="flex items-center gap-1">
                            {(() => {
                              const FileIcon = getFileIcon(test.media);
                              return <FileIcon className="h-3 w-3" />;
                            })()}
                            <span className="text-xs">{test.media}</span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-xs">None</span>
                        )}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(test.timestamp).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}