import React, { useState, useEffect, useRef } from 'react';
import ChatWindow from '../../components/student/ChatWindow';
import '../../styles/StudentChatbot.css';

const StudentChatbot = () => {
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Assalam o Alaikum! How can I be of service to you today?! I\'m your AI learning assistant. I can help you with questions about your dashboard, learning materials, assessments, and analytics. I can also recommend learning materials based on your weak areas. What would you like to know today?',
      followUp: null // Add this field
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Generate smart suggestions based on the latest message
const generateSmartSuggestions = (category, followUp) => {
  const suggestionMap = {
    "dashboard": [
      "What do the numbers on my dashboard mean?",
      "How do I check my learning progress?",
      "How often is my dashboard updated?",
      "What is progress tracker?",
      "What is progress tracker used for?"
    ],
    "learning_materials": [
      "How do I search for specific materials?",
      "Can I download materials for offline use?",
      "What types of learning materials are available?"
    ],
    "assessments": [
      "How much time do I have for each assessment?",
      "Can I retake assessments to improve my score?",
      "How are my assessment results calculated?"
    ],
    "analytics": [
      "How do I improve my performance scores?",
      "What do the progress graphs represent?",
      "Can you explain my strengths and weaknesses?"
    ],
    "weak_areas": [
      "Find materials for my weakest subject",
      "Show me practice exercises for math",
      "How can I track my improvement?"
    ],
    "navigation": [
      "Where can I find my completed assessments?",
      "How do I contact support?"
    ],
    "default": [
      "How do I navigate the platform?",
      "I need help with a subject I'm struggling with",
      "What can you help me with?"
    ]
  };

  // Only use the base suggestions from the map
  const baseSuggestions = suggestionMap[category] || suggestionMap.default;
  
  // Only add followUp as a suggestion if it's actually a question or request
  if (followUp) {
    const isQuestion = followUp.endsWith('?') || 
                     followUp.toLowerCase().includes('would you like') ||
                     followUp.toLowerCase().includes('can i') ||
                     followUp.toLowerCase().includes('how do i');
    
    if (isQuestion && !baseSuggestions.includes(followUp)) {
      return [followUp, ...baseSuggestions.slice(0, 2)];
    }
  }
  
  return baseSuggestions.slice(0, 3);
};

  const sendMessage = async (text) => {
    if (!text.trim()) return;
    
    const userMessage = { sender: 'user', text };
    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);
    // Clear suggestions while waiting for response
    setSuggestions([]);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify({ message: text }),
      });

      const data = await res.json();
      
      if (res.ok) {
      const botMessage = { 
        sender: 'bot', 
        text: data.response,
        followUp: data.follow_up,
        category: data.category,
        materials: data.materials || [],
      };
      setMessages((prev) => [...prev, botMessage]);
      
      // Generate suggestions based only on category
      const newSuggestions = generateSmartSuggestions(data.category);
      setSuggestions(newSuggestions);
        setSuggestions(newSuggestions);
      } else {
        throw new Error(data.error || 'Something went wrong');
      }
    } catch (err) {
      const errorMessage = {
        sender: 'bot',
        text: 'Sorry, I\'m having trouble connecting right now. Please try again later.',
        followUp: "Try rephrasing your question."
      };
      setMessages((prev) => [...prev, errorMessage]);
      // Show default suggestions on error
      setSuggestions([
        "How do I navigate the platform?",
        "Where can I find my materials?",
        "I need help with a subject"
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    sendMessage(suggestion);
  };

  // Load initial suggestions on component mount
  useEffect(() => {
    setSuggestions([
      "What can you help me with?",
      "How do I check my progress?",
      "I need help with math"
    ]);
  }, []);

  return (
    <div className="student-chatbot">
      <div className="chatbot-header">
        <h1>💬 AI Learning Assistant</h1>
        <p>I'm here to help you navigate your learning platform and find materials for subjects you need help with</p>
      </div>
      
      <div className="chat-container">
        <ChatWindow 
          messages={messages} 
          onSend={sendMessage} 
          isTyping={isTyping}
        />
        <div ref={messagesEndRef} />
      </div>
      
      <div className="suggestions-container">
        <p className="suggestions-label">You might ask:</p>
        <div className="suggestions">
          {suggestions.map((suggestion, index) => (
            <button 
              key={index} 
              className="suggestion-chip"
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isTyping}
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StudentChatbot;