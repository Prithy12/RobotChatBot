import React, { useState } from 'react';
import './App.css';
import Navigation from './Navigation';
import Chat from './Chat';
import Dashboard from './Dashboard';

function App() {
  const [activeTab, setActiveTab] = useState('chat');
  // Add state for messages at the App level so it persists between tab switches
  const [messages, setMessages] = useState([]);
  const [userId, setUserId] = useState('default_user');
  const [useMemory, setUseMemory] = useState(true);
  
  return (
    <div className="App">
      <header className="App-header">
        <h1>Chat with AI</h1>
      </header>
      
      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />
      
      <div className="content-container">
        {activeTab === 'chat' ? (
          <Chat 
            messages={messages} 
            setMessages={setMessages} 
            userId={userId}
            setUserId={setUserId}
            useMemory={useMemory}
            setUseMemory={setUseMemory}
          />
        ) : (
          <Dashboard />
        )}
      </div>
    </div>
  );
}

export default App;
