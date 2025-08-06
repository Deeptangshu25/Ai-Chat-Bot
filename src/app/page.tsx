"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface Message {
  id: number;
  sender: "user" | "bot";
  text: string;
}

const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyBUNBQznhlM7JB4IqmZrjUIhcDeU677NpI";

export default function ChatbotUI() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [pdfText, setPdfText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.min.js";
    script.onload = () => {
      (window as any).pdfjsLib.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js";
    };
    document.body.appendChild(script);
  }, []);

  const parsePDF = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const typedArray = new Uint8Array(reader.result as ArrayBuffer);
      const pdf = await (window as any).pdfjsLib.getDocument({ data: typedArray }).promise;

      let text = "";
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        const pageText = content.items.map((item: any) => item.str).join(" ");
        text += pageText + " ";
      }

      setPdfText(text);
      console.log("PDF parsed content:", text);
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === "application/pdf") {
      setFileName(file.name);
      parsePDF(file);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now(),
      sender: "user",
      text: input.trim(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput("");
    setIsTyping(true);

    const formattedMessages = newMessages.map((msg) => ({
      role: msg.sender === "user" ? "user" : "model",
      parts: [
        {
          text: msg.text,
        },
      ],
    }));

    if (pdfText) {
      formattedMessages.push({
        role: "user",
        parts: [
          {
            text: pdfText,
          },
        ],
      });
    }

    try {
      const res = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ contents: formattedMessages }),
      });

      const data = await res.json();

      const botText = data?.candidates?.[0]?.content?.parts?.[0]?.text || "(No response)";

      const botReply: Message = {
        id: Date.now() + 1,
        sender: "bot",
        text: botText,
      };

      setMessages((prev) => [...prev, botReply]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          sender: "bot",
          text: "Failed to fetch response. Please try again.",
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-screen w-full bg-gray-100 p-4">
      <h1 className="text-2xl font-bold text-center mb-4">My Chatbot</h1>
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            <Card className={`max-w-xs ${msg.sender === "user" ? "bg-blue-500 text-white" : "bg-white"}`}>
              <CardContent className="p-3">
                <p>{msg.text}</p>
              </CardContent>
            </Card>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <Card className="max-w-xs bg-white">
              <CardContent className="p-3">
                <p className="italic text-gray-500">Typing...</p>
              </CardContent>
            </Card>
          </div>
        )}
        {fileName && (
          <div className="text-center text-sm text-green-600">1 file uploaded: {fileName}</div>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder="Type your message..."
          className="flex-1"
        />
        <input
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
          ref={fileInputRef}
          className="text-sm"
        />
        <Button onClick={sendMessage}>Send</Button>
      </div>
    </div>
  );
}
