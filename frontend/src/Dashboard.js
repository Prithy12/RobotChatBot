import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './Dashboard.css';

function Dashboard() {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [editPrompt, setEditPrompt] = useState('');
  const [updating, setUpdating] = useState(false);

  // Fetch chat history
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        const response = await axios.get('http://localhost:8000/api/history');
        // Sort history by timestamp (newest first)
        const sortedHistory = response.data.sort((a, b) => 
          new Date(b.timestamp) - new Date(a.timestamp)
        );
        setHistory(sortedHistory);
        setError(null);
      } catch (err) {
        console.error('Error fetching history:', err);
        setError('Failed to load chat history. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, []);

  const handleEditClick = (conversation) => {
    setEditingId(conversation.id);
    setEditPrompt(conversation.prompt);
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditPrompt('');
  };

  const handleUpdatePrompt = async (id) => {
    if (!editPrompt.trim()) return;
    
    try {
      setUpdating(true);
      const response = await axios.put(`http://localhost:8000/api/history/${id}`, {
        prompt: editPrompt
      });
      
      // Update the history with the updated conversation
      setHistory(prevHistory => 
        prevHistory.map(item => 
          item.id === id ? response.data : item
        )
      );
      
      setEditingId(null);
    } catch (err) {
      console.error('Error updating prompt:', err);
      alert('Failed to update prompt. Please try again.');
    } finally {
      setUpdating(false);
    }
  };

  const formatDate = (isoString) => {
    const date = new Date(isoString);
    return date.toLocaleString();
  };

  if (loading) {
    return <div className="dashboard-loading">Loading history...</div>;
  }

  if (error) {
    return <div className="dashboard-error">{error}</div>;
  }

  return (
    <div className="dashboard">
      <h2>Chat History</h2>
      
      {history.length === 0 ? (
        <p className="no-history">No chat history yet. Start a conversation to see history here.</p>
      ) : (
        <div className="history-list">
          {history.map((conversation) => (
            <div key={conversation.id} className="history-item">
              <div className="history-timestamp">
                {formatDate(conversation.timestamp)}
              </div>
              
              <div className="history-content">
                {editingId === conversation.id ? (
                  <div className="edit-prompt-container">
                    <textarea
                      value={editPrompt}
                      onChange={(e) => setEditPrompt(e.target.value)}
                      className="edit-prompt-textarea"
                      placeholder="Edit your prompt..."
                      disabled={updating}
                    />
                    <div className="edit-buttons">
                      <button 
                        onClick={() => handleUpdatePrompt(conversation.id)}
                        disabled={updating || !editPrompt.trim()}
                        className="update-button"
                      >
                        {updating ? 'Updating...' : 'Update'}
                      </button>
                      <button 
                        onClick={handleCancelEdit}
                        disabled={updating}
                        className="cancel-button"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="prompt-container">
                      <div className="prompt-label">Prompt:</div>
                      <div className="prompt-text">{conversation.prompt}</div>
                      <button 
                        onClick={() => handleEditClick(conversation)}
                        className="edit-button"
                      >
                        Edit
                      </button>
                    </div>
                    <div className="response-container">
                      <div className="response-label">Response:</div>
                      <div className="response-text">{conversation.response}</div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard; 