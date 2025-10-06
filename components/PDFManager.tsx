"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { makeAuthenticatedFormRequest, makeAuthenticatedRequest } from "@/lib/auth";

interface Document {
  id: number;
  filename: string;
  original_filename: string;
  file_size: number;
  content_type: string;
  s3_url: string;
  created_at: string;
}

interface Meeting {
  id: number;
  title: string;
  description: string;
  created_at: string;
}

export function PDFManager() {
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [uploadedFiles, setUploadedFiles] = useState<Document[]>([]);
  const [currentMeeting, setCurrentMeeting] = useState<Meeting | null>(null);
  const [loadingMeeting, setLoadingMeeting] = useState(true);

  // Create or get current meeting
  useEffect(() => {
    console.log("=== PDFManager useEffect running ===");
    console.log("loadingMeeting:", loadingMeeting);
    console.log("currentMeeting:", currentMeeting);
    
    if (!currentMeeting) {
      const initializeMeeting = async () => {
        console.log("=== INITIALIZING MEETING ===");
        const token = localStorage.getItem('token');
        console.log("Auth token exists:", !!token);
        console.log("Token preview:", token?.substring(0, 20) + '...');
        
        if (!token) {
          console.error("No authentication token found!");
          setLoadingMeeting(false);
          return;
        }
        
        try {
          const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/meetings/`;
          console.log("Fetching meetings from:", url);
          
          const response = await makeAuthenticatedRequest(url);
          console.log("Meetings response status:", response.status);
          
          if (response.ok) {
            const meetings = await response.json();
            console.log("Retrieved meetings:", meetings);
            
            if (meetings.length > 0) {
              const latestMeeting = meetings[0];
              console.log("Using latest meeting:", latestMeeting);
              setCurrentMeeting(latestMeeting);
              await loadMeetingDocuments(latestMeeting.id);
            } else {
              console.log("No meetings found, creating new one");
              await createNewMeeting();
            }
          } else {
            console.error("Failed to get meetings. Status:", response.status);
            const errorText = await response.text();
            console.error("Error response:", errorText);
          }
        } catch (error) {
          console.error("Error initializing meeting:", error);
        } finally {
          console.log("Setting loadingMeeting to false");
          setLoadingMeeting(false);
        }
      };

      initializeMeeting();
    }
  }, [currentMeeting, loadingMeeting]); // Include dependencies

  const createNewMeeting = async () => {
    console.log("=== CREATING NEW MEETING ===");
    try {
      const meetingData = {
        title: `Meeting Session - ${new Date().toLocaleDateString()}`,
        description: 'AI-powered meeting session'
      };
      console.log("Meeting data:", meetingData);
      
      const response = await makeAuthenticatedRequest(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/meetings/`, 
        {
          method: 'POST',
          body: JSON.stringify(meetingData)
        }
      );

      console.log("Create meeting response status:", response.status);
      
      if (response.ok) {
        const meeting = await response.json();
        console.log("Created meeting:", meeting);
        setCurrentMeeting(meeting);
      } else {
        const errorText = await response.text();
        console.error("Failed to create meeting:", response.status, errorText);
      }
    } catch (error) {
      console.error("Error creating meeting:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
    }
  };

  const loadMeetingDocuments = async (meetingId: number) => {
    try {
      const response = await makeAuthenticatedRequest(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/documents/meeting/${meetingId}`
      );

      if (response.ok) {
        const documents = await response.json();
        setUploadedFiles(documents);
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    console.log("File upload triggered", event.target.files);
    const file = event.target.files?.[0];
    if (!file) {
      console.log("No file selected");
      return;
    }

    console.log("Selected file:", file.name, file.type, file.size);
    console.log("Current meeting:", currentMeeting);

    if (!currentMeeting) {
      setUploadStatus("❌ No meeting session available");
      console.error("No current meeting available");
      return;
    }

    // Validate file type
    const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
    if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().match(/\.(pdf|doc|docx|txt)$/)) {
      setUploadStatus("❌ Please select a PDF, DOC, DOCX, or TXT file");
      return;
    }

    setUploading(true);
    setUploadStatus("📄 Uploading document...");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("meeting_id", currentMeeting.id.toString());

      console.log("Uploading to:", `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/documents/upload`);
      console.log("FormData entries:", Array.from(formData.entries()));

      const response = await makeAuthenticatedFormRequest(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/documents/upload`,
        formData
      );

      console.log("Upload response status:", response.status);
      const result = await response.json();
      console.log("Upload response:", result);

      if (response.ok) {
        setUploadStatus(`✅ ${result.original_filename} uploaded successfully!`);
        setUploadedFiles(prev => [...prev, result]);
        
        // Clear status after 3 seconds
        setTimeout(() => setUploadStatus(""), 3000);
      } else {
        setUploadStatus(`❌ Upload failed: ${result.detail || 'Unknown error'}`);
      }
    } catch (error) {
      setUploadStatus("❌ Upload failed: Network error");
      console.error("Upload error details:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }
    } finally {
      setUploading(false);
      // Reset file input
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleDeleteDocument = async (documentId: number) => {
    try {
      const response = await makeAuthenticatedRequest(
        `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/documents/${documentId}`,
        { method: 'DELETE' }
      );

      if (response.ok) {
        setUploadedFiles(prev => prev.filter(file => file.id !== documentId));
        setUploadStatus("✅ Document deleted successfully");
        setTimeout(() => setUploadStatus(""), 2000);
      }
    } catch (error) {
      console.error("Error deleting document:", error);
      setUploadStatus("❌ Failed to delete document");
    }
  };

  if (loadingMeeting) {
    return (
      <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-800">
        <div className="text-white">Loading meeting session...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 border border-gray-700 rounded-lg bg-gray-800">
      <div className="flex items-center justify-between">
        <Label htmlFor="pdf-upload" className="text-lg font-semibold text-white">
          📄 Document Manager
        </Label>
        {currentMeeting && (
          <div className="text-sm text-gray-400">
            Session: {currentMeeting.title}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-4">
          <input
            id="pdf-upload"
            type="file"
            accept=".pdf,.doc,.docx,.txt"
            onChange={handleFileUpload}
            disabled={uploading || !currentMeeting}
            className="hidden"
          />
          <Button
            onClick={() => {
              console.log("Upload button clicked");
              const input = document.getElementById('pdf-upload') as HTMLInputElement;
              if (input) {
                console.log("Triggering file input click");
                input.click();
              } else {
                console.error("File input not found");
              }
            }}
            disabled={uploading || !currentMeeting}
            className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? "Uploading..." : "📄 Choose File"}
          </Button>
          {!currentMeeting && !loadingMeeting && (
            <span className="text-sm text-red-400">No meeting session</span>
          )}
          {loadingMeeting && (
            <span className="text-sm text-gray-400">Loading session...</span>
          )}
        </div>
        
        {uploadStatus && (
          <div className="text-sm text-gray-300 mt-2">
            {uploadStatus}
          </div>
        )}
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-300">
            Uploaded Documents ({uploadedFiles.length}):
          </Label>
          <ul className="space-y-1 max-h-32 overflow-y-auto">
            {uploadedFiles.map((file) => (
              <li key={file.id} className="text-sm text-gray-400 flex justify-between items-center">
                <span>📄 {file.original_filename}</span>
                <Button
                  onClick={() => handleDeleteDocument(file.id)}
                  variant="outline"
                  size="sm"
                  className="ml-2 h-6 px-2 text-xs bg-red-900/20 border-red-800 text-red-400 hover:bg-red-900/40"
                >
                  Delete
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}