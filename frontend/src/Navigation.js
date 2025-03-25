import React from 'react';
import './Navigation.css';

function Navigation({ activeTab, onTabChange }) {
  return (
    <div className="navigation">
      <button 
        className={`nav-tab ${activeTab === 'chat' ? 'active' : ''}`}
        onClick={() => onTabChange('chat')}
      >
        Chat
      </button>
      <button 
        className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
        onClick={() => onTabChange('dashboard')}
      >
        Dashboard
      </button>
    </div>
  );
}

export default Navigation; 