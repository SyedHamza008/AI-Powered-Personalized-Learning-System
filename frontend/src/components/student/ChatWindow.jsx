import React, { useState, useRef, useEffect } from 'react';
import '../../styles/ChatWindow.css';

const ChatWindow = ({ messages, onSend, isTyping }) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);


  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (inputValue.trim()) {
      onSend(inputValue);
      setInputValue('');
    }
  };

  // Improved message formatting that handles markdown-like syntax
  const formatMessage = (text) => {
    if (!text) return null;
    
    // Split by newlines first
    const lines = text.split('\n');
    
    return lines.map((line, lineIndex) => {
      
      const parts = line.split(/(\*\*[^*]+\*\*)/);
      
      return (
        <p key={lineIndex} className="message-line">
          {parts.map((part, partIndex) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={partIndex}>
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return <span key={partIndex}>{part}</span>;
          })}
        </p>
      );
    });
  };

  return (
    <div className="chat-window">
      <div className="messages-container">
        {messages.map((message, index) => (
          <div 
            key={index} 
            className={`message ${message.sender === 'user' ? 'user-message' : 'bot-message'}`}
          >
            <div className="message-content">
              {formatMessage(message.text)}
              
              {/* Display learning materials if available */}
              {message.materials && Array.isArray(message.materials) && message.materials.length > 0 && (
                <div className="materials-container">
                  <h4>Recommended Learning Materials:</h4>
                  <div className="materials-list">
                    {message.materials.map((material, idx) => (
                      <div key={idx} className="material-card">
                        {material.url ? (
                          <a 
                            href={material.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="material-link"
                          >
                            <h5>{material.title || material.name}</h5>
                          </a>
                        ) : (
                          <h5>{material.title || material.name}</h5>
                        )}
                        <p>{material.description}</p>
                        {material.url && (
                          <a 
                            href={material.url} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="material-url"
                          >
                            View Resource →
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {message.followUp && (
                <div className="follow-up">
                  <p>{message.followUp}</p>
                </div>
              )}
            </div>
            <div className="message-avatar">
              {message.sender === 'user' ? '👤' : '🤖'}
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="message bot-message">
            <div className="typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
            <div className="message-avatar">🤖</div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form className="message-form" onSubmit={handleSubmit}>
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Type your question here..."
          className="message-input"
          disabled={isTyping}
        />
        <button 
          type="submit" 
          className="send-button" 
          disabled={!inputValue.trim() || isTyping}
        >
          {isTyping ? '...' : 'Send'}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;