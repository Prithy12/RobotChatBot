import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './Chat.css';

function Chat({ messages, setMessages, userId, setUserId, useMemory, setUseMemory }) {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isResettingMemory, setIsResettingMemory] = useState(false);
  const messagesEndRef = useRef(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Add user message to the chat
    const userMessage = { text: input, sender: 'user' };
    setMessages((prevMessages) => [...prevMessages, userMessage]);
    setIsLoading(true);
    setInput('');

    try {
      // Send message to API with memory settings
      const response = await axios.post('http://localhost:8000/api/chat', {
        message: input,
        user_id: userId,
        use_memory: useMemory
      });

      // Add bot response to the chat
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: response.data.response, sender: 'bot' }
      ]);
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: 'Sorry, there was an error processing your request.', sender: 'bot' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetMemory = async () => {
    setIsResettingMemory(true);
    try {
      await axios.post(`http://localhost:8000/api/reset-memory?user_id=${userId}`);
      // Add system message to chat
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: 'Memory has been reset. The bot will no longer remember previous conversations.', sender: 'system' }
      ]);
    } catch (error) {
      console.error('Error resetting memory:', error);
      setMessages((prevMessages) => [
        ...prevMessages,
        { text: 'Sorry, there was an error resetting memory.', sender: 'system' }
      ]);
    } finally {
      setIsResettingMemory(false);
    }
  };

  const handleUserIdChange = (e) => {
    setUserId(e.target.value);
    // Add system message to chat
    setMessages((prevMessages) => [
      ...prevMessages,
      { text: `User ID changed to: ${e.target.value}. This starts a new conversation context.`, sender: 'system' }
    ]);
  };

  return (
    <div className="chat">
      <div className="chat-options">
        <div className="memory-toggle">
          <label>
            <input
              type="checkbox"
              checked={useMemory}
              onChange={() => setUseMemory(!useMemory)}
            />
            Enable Memory
          </label>
          <button
            onClick={handleResetMemory}
            disabled={isResettingMemory || !useMemory}
            className="reset-button"
          >
            {isResettingMemory ? 'Resetting...' : 'Reset Memory'}
          </button>
        </div>
        <div className="user-id-input">
          <label>
            User ID:
            <input
              type="text"
              value={userId}
              onChange={handleUserIdChange}
              placeholder="Enter user ID"
            />
          </label>
        </div>
      </div>
      
      <div className="messages-container">
        {messages.map((message, index) => (
          <div key={index} className={`message ${message.sender}`}>
            {message.text}
          </div>
        ))}
        {isLoading && (
          <div className="message bot loading">
            <div className="loading-dots">
              <span>.</span><span>.</span><span>.</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>
      <form onSubmit={handleSubmit} className="input-form">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Type your message here..."
          disabled={isLoading}
        />
        <button type="submit" disabled={isLoading || !input.trim()}>
          Send
        </button>
      </form>
    </div>
  );
}

export default Chat; 