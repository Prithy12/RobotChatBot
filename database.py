import sqlite3
import json
import os
from datetime import datetime
from typing import List, Dict, Optional, Any

# Create data directory if it doesn't exist
os.makedirs('data', exist_ok=True)

# Database file path
DB_PATH = 'data/chatbot.db'

def get_db_connection():
    """Create a connection to the SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def init_db():
    """Initialize the database with required tables"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Create conversations table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversations (
            id TEXT PRIMARY KEY,
            timestamp TEXT NOT NULL,
            prompt TEXT NOT NULL,
            response TEXT NOT NULL
        )
    ''')
    
    # Create conversation_context table for managing memory
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS conversation_context (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT DEFAULT 'default_user',
            context TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
    ''')
    
    conn.commit()
    conn.close()

def save_conversation(conversation_id: str, prompt: str, response: str) -> None:
    """Save a conversation to the database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    timestamp = datetime.now().isoformat()
    
    cursor.execute(
        'INSERT INTO conversations (id, timestamp, prompt, response) VALUES (?, ?, ?, ?)',
        (conversation_id, timestamp, prompt, response)
    )
    
    conn.commit()
    conn.close()

def update_conversation(conversation_id: str, prompt: str, response: str) -> bool:
    """Update an existing conversation"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    timestamp = datetime.now().isoformat()
    
    cursor.execute(
        'UPDATE conversations SET prompt = ?, response = ?, timestamp = ? WHERE id = ?',
        (prompt, response, timestamp, conversation_id)
    )
    
    success = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return success

def get_all_conversations() -> List[Dict[str, Any]]:
    """Get all conversations from the database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM conversations ORDER BY timestamp DESC')
    rows = cursor.fetchall()
    
    conversations = [dict(row) for row in rows]
    conn.close()
    
    return conversations

def get_conversation(conversation_id: str) -> Optional[Dict[str, Any]]:
    """Get a specific conversation by ID"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT * FROM conversations WHERE id = ?', (conversation_id,))
    row = cursor.fetchone()
    
    conn.close()
    
    return dict(row) if row else None

def save_context(user_id: str, context: List[Dict[str, str]]) -> None:
    """Save or update conversation context for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    created_at = datetime.now().isoformat()
    context_json = json.dumps(context)
    
    # Check if context already exists for this user
    cursor.execute('SELECT id FROM conversation_context WHERE user_id = ?', (user_id,))
    row = cursor.fetchone()
    
    if row:
        # Update existing context
        cursor.execute(
            'UPDATE conversation_context SET context = ?, created_at = ? WHERE user_id = ?',
            (context_json, created_at, user_id)
        )
    else:
        # Create new context
        cursor.execute(
            'INSERT INTO conversation_context (user_id, context, created_at) VALUES (?, ?, ?)',
            (user_id, context_json, created_at)
        )
    
    conn.commit()
    conn.close()

def get_context(user_id: str) -> List[Dict[str, str]]:
    """Get conversation context for a user"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute('SELECT context FROM conversation_context WHERE user_id = ?', (user_id,))
    row = cursor.fetchone()
    
    conn.close()
    
    if row:
        return json.loads(row['context'])
    return []

def get_recent_conversations(limit: int = 5) -> List[Dict[str, Any]]:
    """Get recent conversations for memory context"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    cursor.execute(
        'SELECT * FROM conversations ORDER BY timestamp DESC LIMIT ?',
        (limit,)
    )
    rows = cursor.fetchall()
    
    conversations = [dict(row) for row in rows]
    conn.close()
    
    return conversations

# Initialize the database when this module is imported
init_db() 