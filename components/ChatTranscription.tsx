"use client";

import { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { User, Monitor, MessageCircle } from "lucide-react";

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: string;
  speaker: 'user' | 'system' | 'external';
  isInterim?: boolean;
}

interface ChatTranscriptionProps {
  messages: ChatMessage[];
  onClear: () => void;
  className?: string;
}

export function ChatTranscription({ messages, onClear, className }: ChatTranscriptionProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const formatTime = (timestamp: string) => {
    try {
      return new Date(timestamp).toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit',
        second: '2-digit'
      });
    } catch {
      return timestamp;
    }
  };

  const getSpeakerInfo = (speaker: string) => {
    switch (speaker) {
      case 'user':
      case 'external':
        return {
          name: 'Meeting Person',
          icon: User,
          bgColor: 'bg-blue-500',
          textColor: 'text-blue-300',
          alignment: 'justify-start'
        };
      case 'system':
        return {
          name: 'Me',
          icon: Monitor,
          bgColor: 'bg-green-500',
          textColor: 'text-green-300',
          alignment: 'justify-end'
        };
      default:
        return {
          name: 'Unknown',
          icon: MessageCircle,
          bgColor: 'bg-gray-500',
          textColor: 'text-gray-300',
          alignment: 'justify-start'
        };
    }
  };

  return (
    <div className={cn("flex flex-col h-full bg-gray-900 border border-gray-600 rounded-lg", className)}>
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-gray-600 bg-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
          <h3 className="font-medium text-gray-200">Live Transcription</h3>
          <span className="text-xs text-gray-400">({messages.length} messages)</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={onClear}
            variant="outline"
            size="sm"
            className="text-xs bg-gray-700 border-gray-600 text-gray-300 hover:bg-gray-600"
          >
            Clear Chat
          </Button>
        </div>
      </div>

      {/* Legend */}
      <div className="px-3 py-2 bg-gray-800 border-b border-gray-600 text-xs text-gray-400">
        <div className="flex items-center justify-center">
          <div className="flex items-center gap-1">
            <User className="w-3 h-3 text-blue-400" />
            <span>Meeting Person</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div 
        className="flex-1 overflow-y-auto p-3 space-y-3 bg-gray-900"
      >
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="text-2xl mb-2">🎙️</div>
              <p className="text-sm">Start listening to see transcription...</p>
              <p className="text-xs mt-1">Meeting audio will appear here</p>
            </div>
          </div>
        ) : (
          messages.map((message) => {
            const speakerInfo = getSpeakerInfo(message.speaker);
            const IconComponent = speakerInfo.icon;

            return (
              <div
                key={message.id}
                className={cn("flex", speakerInfo.alignment)}
              >
                <div
                  className={cn(
                    "max-w-[85%] rounded-lg px-3 py-2 shadow-sm",
                    message.speaker === 'system' 
                      ? "bg-green-800 border border-green-700 ml-auto" 
                      : "bg-blue-800 border border-blue-700 mr-auto",
                    message.isInterim && "opacity-70 italic"
                  )}
                >
                  {/* Speaker header */}
                  <div className={cn(
                    "flex items-center gap-1 mb-1 text-xs font-medium",
                    speakerInfo.textColor
                  )}>
                    <IconComponent className="w-3 h-3" />
                    <span>{speakerInfo.name}</span>
                    <span className="text-gray-500 ml-auto">
                      {formatTime(message.timestamp)}
                    </span>
                  </div>
                  
                  {/* Message text */}
                  <div className={cn(
                    "text-sm text-gray-100",
                    message.isInterim && "text-gray-300"
                  )}>
                    {message.text}
                    {message.isInterim && (
                      <span className="ml-1 text-gray-500">...</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
