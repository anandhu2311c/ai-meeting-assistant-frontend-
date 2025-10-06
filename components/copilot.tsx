"use client";
import ReactMarkdown from "react-markdown";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import RecorderTranscriber from "@/components/recorder";
import { useCallback, useEffect, useRef, useState } from "react";

import { FLAGS, HistoryData } from "@/lib/types";
import { Switch } from "@/components/ui/switch";
import { PDFManager } from "@/components/PDFManager";
import { PDFModal } from "@/components/PDFModal";
import { transcriptionManager, ChatMessage } from "@/lib/transcriptionManager";
import { ChatTranscription } from "@/components/ChatTranscription";

interface CopilotProps {
  addInSavedData: (data: HistoryData) => void;
}

// Custom hook to replace useCompletion
function useGeminiCompletion(body: any) {
  const [completion, setCompletion] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [input, setInput] = useState<string>("");
  const [extractedQuestion, setExtractedQuestion] = useState<string>("");
  const [citations, setCitations] = useState<any[]>([]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    setIsLoading(true);
    setError(null);
    setCompletion("");
    setExtractedQuestion("");
    setCitations([]);

    try {
      const response = await fetch("/api/completion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...body,
          prompt: input,
        }),
      });

      if (!response.ok) {
        // Handle error responses (like 503 for overloaded API)
        if (response.status === 503) {
          const errorData = await response.json();
          setCompletion("⚠️ AI service is temporarily unavailable. Please try again in a moment.");
          
          if (errorData.extractedQuestion) {
            setExtractedQuestion(errorData.extractedQuestion);
          }
          if (errorData.citations && errorData.citations.length > 0) {
            setCitations(errorData.citations);
          }
          return;
        }
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) {
        throw new Error("No response body");
      }

      let result = "";
      let buffer = "";
      let isInSources = false;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        buffer += chunk;
        
        // Check for sources separator
        if (buffer.includes('---SOURCES---')) {
          const parts = buffer.split('---SOURCES---');
          const beforeSources = parts[0];
          const afterSources = parts[1] || '';
          
          // Process content before sources
          if (beforeSources && !isInSources) {
            result += beforeSources;
            setCompletion(result);
          }
          
          // Process sources
          isInSources = true;
          if (afterSources.trim()) {
            try {
              const parsed = JSON.parse(afterSources.trim());
              if (parsed.type === 'citations') {
                setCitations(parsed.citations);
                if (parsed.extractedQuestion) {
                  setExtractedQuestion(parsed.extractedQuestion);
                }
              }
            } catch (e) {
              // Continue processing
            }
          }
          buffer = '';
          continue;
        }
        
        if (!isInSources) {
          // Process normal response text
          result += chunk;
          setCompletion(result);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error("Unknown error"));
    } finally {
      setIsLoading(false);
    }
  }, [input, body]);

  const stop = useCallback(() => {
    setIsLoading(false);
  }, []);

  return {
    completion,
    isLoading,
    error,
    input,
    setInput,
    handleSubmit,
    stop,
    extractedQuestion,
    citations,
  };
}

export function Copilot({ addInSavedData }: CopilotProps) {
  const [transcribedText, setTranscribedText] = useState<string>("");
  const [flag, setFlag] = useState<FLAGS>(FLAGS.COPILOT);
  const [bg, setBg] = useState<string>("");
  const [lastAddedText, setLastAddedText] = useState<string>("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [showChatView, setShowChatView] = useState<boolean>(true);
  const [pdfModal, setPdfModal] = useState<{
    isOpen: boolean, 
    filename: string, 
    page?: number, 
    citation?: any
  }>({
    isOpen: false,
    filename: '',
    page: undefined,
    citation: undefined
  });

  const { completion, stop, isLoading, error, setInput, handleSubmit, extractedQuestion, citations } =
    useGeminiCompletion({
      bg,
      flag,
    });

  const handleFlag = useCallback((checked: boolean) => {
    if (!checked) {
      setFlag(FLAGS.SUMMERIZER);
    } else {
      setFlag(FLAGS.COPILOT);
    }
  }, []);

  const formRef = useRef<HTMLFormElement>(null);
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.ctrlKey) {
      switch (event.key) {
        case "Enter":
          event.preventDefault();
          if (formRef.current) {
            const submitEvent = new Event("submit", {
              cancelable: true,
              bubbles: true,
            });
            formRef.current.dispatchEvent(submitEvent);
          }
          break;
        case "s":
          event.preventDefault();
          setFlag(FLAGS.SUMMERIZER);
          break;
        case "c":
          event.preventDefault();
          setFlag(FLAGS.COPILOT);
          break;
      }
    }
  }, []);

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  // Update chat messages periodically
  useEffect(() => {
    const interval = setInterval(() => {
      setChatMessages(transcriptionManager.getMessages());
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const addTextinTranscription = (text: string, speaker: 'user' | 'system' | 'external' = 'external') => {
    // Use the transcription manager to format and prevent duplicates
    const formattedText = transcriptionManager.formatWithTimestamp(text);
    
    setInput((prev) => prev + formattedText);
    setTranscribedText((prev) => prev + formattedText);
    setLastAddedText(text); // Keep track for additional safety
    
    // Update chat messages from transcription manager
    setChatMessages(transcriptionManager.getMessages());
  };

  const addSpeakerLabel = (speaker: string) => {
    const label = `\n\n--- ${speaker} ---\n`;
    setInput((prev) => prev + label);
    setTranscribedText((prev) => prev + label);
  };
  
  const openPDFModal = (filename: string, page?: number, citation?: any) => {
    setPdfModal({
      isOpen: true,
      filename,
      page,
      citation
    });
  };

  const closePDFModal = () => {
    setPdfModal({
      isOpen: false,
      filename: '',
      page: undefined,
      citation: undefined
    });
  };
  const handleTranscriptionChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
  ) => {
    setInput(e.target.value);
    setTranscribedText(e.target.value);
  };

  const clearTranscriptionChange = () => {
    setInput("");
    setTranscribedText("");
    setLastAddedText(""); // Reset duplicate prevention
    transcriptionManager.reset(); // Reset transcription manager
    setChatMessages([]); // Clear chat messages
  };

  useEffect(() => {
    const savedBg = localStorage.getItem("bg");
    if (savedBg) {
      setBg(savedBg);
    }
  }, []);

  // Removed unnecessary debug log that was causing re-renders

  useEffect(() => {
    if (!bg) return;
    localStorage.setItem("bg", bg);
  }, [bg]);

  const handleSave = () => {
    addInSavedData({
      createdAt: new Date().toISOString(),
      data: completion,
      tag: flag === FLAGS.COPILOT ? "AI Mode" : "Summerizer",
    });
  };





  return (
    <div className="bg-gray-900 min-h-screen">
      <div className="space-y-6">
        {/* Header Section */}
        <div className="px-4 py-4 bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg border border-gray-600 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <span className="text-white text-xl">💬</span>
              </div>
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent font-poppins">
                  Meeting Assistant
                </h2>
                <p className="text-sm text-gray-300">AI-powered meeting support with smart document insights</p>
              </div>
            </div>
            {error && (
              <div className="bg-red-900 border border-red-700 px-3 py-2 rounded">
                <p className="text-red-300 text-sm font-medium">⚠️ {error.message}</p>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="px-2">
          <div className="grid gap-8 md:grid-cols-2">
          <div className="grid gap-1.5">
            <RecorderTranscriber
              addTextinTranscription={addTextinTranscription}
            />
            
            {/* PDF Manager */}
            <div className="mt-4">
              <PDFManager />
            </div>
          </div>

          <div className="grid gap-1.5 my-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="transcription" className="text-green-400">
                Transcription
              </Label>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-xs h-7 bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600 hover:text-gray-200"
                  onClick={() => setShowChatView(!showChatView)}
                >
                  {showChatView ? "📝 Text View" : "💬 Chat View"}
                </Button>
                <button
                  type="button"
                  className="text-xs text-red-400 hover:text-red-300 underline"
                  onClick={clearTranscriptionChange}
                >
                  clear
                </button>
              </div>
            </div>
            
            {showChatView ? (
              <div className="h-[300px]">
                <ChatTranscription 
                  messages={chatMessages}
                  onClear={clearTranscriptionChange}
                  className="h-full"
                />
              </div>
            ) : (
              <>
                <Textarea
                  id="transcription"
                  className="h-[200px] min-h-[200px] mt-2 bg-gray-800 border-gray-600 text-gray-100 placeholder-gray-400 focus:border-purple-500 focus:ring-purple-500"
                  placeholder="Your transcribed text will appear here. Use the buttons below to mark who is speaking."
                  value={transcribedText}
                  onChange={handleTranscriptionChange}
                />
                <div className="flex gap-2 mt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 bg-blue-900 hover:bg-blue-800 text-blue-300 border-blue-700"
                    onClick={() => addSpeakerLabel("MEETING PERSON")}
                  >
                    Mark as Meeting Person
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="text-xs h-7 bg-green-900 hover:bg-green-800 text-green-300 border-green-700"
                    onClick={() => addSpeakerLabel("ME")}
                  >
                    Mark as Me
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
          {/* Control Section */}
          <div className="px-4 py-6 bg-gray-800 rounded-lg border border-gray-600">
            <form
              ref={formRef}
              onSubmit={handleSubmit}
              className="flex items-center justify-center gap-6"
            >
              <div className="flex items-center justify-center px-6 py-3 bg-gray-700 rounded-lg border border-gray-600 shadow-sm">
                <Label className="text-gray-200 font-semibold text-sm">
                  Summarizer
                </Label>
                <Switch
                  className="data-[state=checked]:bg-gradient-to-r data-[state=checked]:from-purple-600 data-[state=checked]:to-blue-600 data-[state=unchecked]:bg-gray-500 mx-4 scale-110"
                  onCheckedChange={handleFlag}
                  defaultChecked
                  checked={flag === FLAGS.COPILOT}
                />
                <Label className="text-gray-200 font-semibold text-sm">
                  AI Mode
                </Label>
              </div>

              <Button
                className="h-12 px-10 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white font-semibold transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                size="sm"
                variant="outline"
                disabled={isLoading}
                type="submit"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Generating...</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <span>Process</span>
                  </div>
                )}
              </Button>
            </form>
          </div>

          {/* Results Section */}
          <div className="px-2 pb-6">
            {/* Extracted Question Display */}
            {extractedQuestion && (
              <div className="mb-6 p-4 bg-blue-900 border border-blue-700 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 bg-blue-600 rounded">
                    <span className="text-white text-lg">❓</span>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-blue-300">Question Detected</h3>
                    <p className="text-xs text-blue-400">AI extracted this question from your conversation</p>
                  </div>
                </div>
                <p className="text-base text-blue-100 font-medium italic bg-gray-800 p-3 border border-blue-600 rounded">
                  &ldquo;{extractedQuestion}&rdquo;
                </p>
              </div>
            )}

            {/* AI Response */}
            {completion && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-green-500 flex items-center justify-center">
                      <span className="text-white text-xs">✓</span>
                    </div>
                    <h3 className="text-lg font-semibold text-gray-100">AI Response</h3>
                    {flag === FLAGS.COPILOT && (
                      <span className="text-xs text-gray-300 bg-gray-700 px-2 py-1 rounded">
                        🤖 RAG-powered
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="text-sm text-indigo-400 hover:text-indigo-300 font-medium underline"
                    onClick={handleSave}
                  >
                    Save Response
                  </button>
                </div>
                <div className="bg-gray-800 p-6 border border-gray-600 rounded-lg">
                  <div className="whitespace-pre-wrap text-gray-100 leading-relaxed">{completion}</div>
                </div>
              </>
            )}

          {/* Citations with Enhanced Context Information */}
          {citations && citations.length > 0 && (
            <div className="mt-4 p-4 bg-gradient-to-r from-yellow-900 to-amber-900 border border-yellow-700 rounded-lg shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2 bg-yellow-700 rounded-full">
                  <span className="text-lg">📚</span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-yellow-300">Sources & Citations</h4>
                  <p className="text-xs text-yellow-400">Found {citations.length} relevant source{citations.length > 1 ? 's' : ''}</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {citations.map((citation, index) => (
                  <div key={index} className="bg-gray-800 p-4 rounded-lg border border-yellow-700 shadow-sm">
                    <div className="flex items-start gap-3">
                      <div className="bg-yellow-700 text-yellow-200 text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center flex-shrink-0">
                        {index + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Source Header */}
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <div className="flex items-center gap-2">
                            {citation.sourceType === 'pdf' ? (
                              <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                                📄 PDF
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">
                                🌐 Web
                              </span>
                            )}
                            
                            <span className="font-medium text-gray-200 text-sm truncate">
                              {citation.filename || citation.source}
                            </span>
                          </div>
                          
                          {/* Page Information for PDFs */}
                          {citation.sourceType === 'pdf' && citation.pageRange && (
                            <span className="inline-flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-xs font-medium rounded-full">
                              📖 {citation.pageRange}
                            </span>
                          )}
                          
                          {/* Relevance Score */}
                          <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 text-xs font-medium rounded-full">
                            {Math.round(citation.score * 100)}% relevant
                          </span>
                        </div>
                        
                        {/* Content Preview */}
                        <div className="mb-3">
                          <p className="text-sm text-gray-300 leading-relaxed">
                            {citation.contextSnippet || citation.content.substring(0, 200)}
                            {(citation.content.length > 200 && !citation.contextSnippet) ? "..." : ""}
                          </p>
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex items-center gap-2 flex-wrap">
                          {citation.url && citation.sourceType === 'web' && (
                            <a 
                              href={citation.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 hover:bg-blue-100 text-xs font-medium rounded-md border border-blue-200 transition-colors"
                            >
                              🔗 View Source
                            </a>
                          )}
                          
                          {citation.sourceType === 'pdf' && citation.filename && citation.page && (
                            <button
                              onClick={() => openPDFModal(citation.filename, citation.page, citation)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-purple-50 text-purple-700 hover:bg-purple-100 text-xs font-medium rounded-md border border-purple-200 transition-colors"
                            >
                              📖 Open Page {citation.page}
                            </button>
                          )}
                          
                          {/* Show additional pages if it's a range */}
                          {citation.sourceType === 'pdf' && citation.startPage && citation.endPage && citation.startPage !== citation.endPage && (
                            <span className="text-xs text-gray-400">
                              Content spans {citation.endPage - citation.startPage + 1} page{citation.endPage - citation.startPage > 0 ? 's' : ''}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              {/* Summary Footer */}
              <div className="mt-4 pt-3 border-t border-yellow-200">
                <div className="text-xs text-yellow-700 flex items-center gap-4">
                  <span>
                    📄 PDF Sources: {citations.filter(c => c.sourceType === 'pdf').length}
                  </span>
                  <span>
                    🌐 Web Sources: {citations.filter(c => c.sourceType === 'web').length}
                  </span>
                  <span>
                    📊 Avg. Relevance: {Math.round(citations.reduce((sum, c) => sum + c.score, 0) / citations.length * 100)}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
        </div>

        {/* PDF Modal */}
        <PDFModal
          isOpen={pdfModal.isOpen}
          onClose={closePDFModal}
          filename={pdfModal.filename}
          page={pdfModal.page}
          citation={pdfModal.citation}
        />
      </div>
    </div>
  );
}
