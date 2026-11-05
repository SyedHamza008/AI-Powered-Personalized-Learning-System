import React, { useState } from 'react';
import '../../styles/AIChatbot.css';

const AIChatbot = () => {
  const [messages, setMessages] = useState([
    { text: "Hello! I'm your AI learning assistant. How can I help you today?", sender: 'bot' }
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = { text: inputText, sender: 'user' };
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          message: inputText,
          context: 'learning_support'
        })
      });

      const data = await response.json();
      
      setTimeout(() => {
        setMessages(prev => [...prev, { text: data.response, sender: 'bot' }]);
        setIsTyping(false);
      }, 1000);

    } catch (error) {
      console.error('Error sending message:', error);
      setIsTyping(false);
    }
  };

  return (
    <div className="ai-chatbot">
      <div className="chat-header">
        <h3>AI Learning Assistant</h3>
      </div>
      <div className="chat-messages">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            <div className="message-bubble">{message.text}</div>
          </div>
        ))}
        {isTyping && (
          <div className="typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        )}
      </div>
      <div className="chat-input">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  );
};

export default AIChatbot;