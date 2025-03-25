import sqlite3
import os
import sys

# Database file path
DB_PATH = 'data/chatbot.db'

def get_db_connection():
    """Create a connection to the SQLite database"""
    if not os.path.exists(DB_PATH):
        print(f"Database file not found: {DB_PATH}")
        sys.exit(1)
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Return rows as dictionaries
    return conn

def view_tables():
    """View all tables in the database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get all tables in the database
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("\n===== DATABASE TABLES =====")
    for table in tables:
        print(f"- {table['name']}")
    
    conn.close()

def view_conversations():
    """View all conversations in the database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all conversations
        cursor.execute("SELECT * FROM conversations ORDER BY timestamp DESC")
        conversations = cursor.fetchall()
        
        if not conversations:
            print("\nNo conversations found in the database.")
            return
        
        print(f"\n===== CONVERSATIONS ({len(conversations)} total) =====")
        
        # Convert to list of dictionaries for display
        headers = ["ID", "Timestamp", "Prompt", "Response"]
        
        # Simple formatting
        print("{:<12} {:<25} {:<55} {:<55}".format(*headers))
        print("-" * 150)
        
        for conv in conversations:
            # Truncate long text for better display
            prompt = conv['prompt'][:50] + "..." if len(conv['prompt']) > 50 else conv['prompt']
            response = conv['response'][:50] + "..." if len(conv['response']) > 50 else conv['response']
            id_short = conv['id'][:8] + "..."  # Truncate UUID
            
            print("{:<12} {:<25} {:<55} {:<55}".format(
                id_short,
                conv['timestamp'],
                prompt,
                response
            ))
    
    except sqlite3.OperationalError as e:
        if "no such table" in str(e):
            print("\nThe conversations table doesn't exist yet. Start chatting to create it!")
        else:
            print(f"\nError: {e}")
    
    conn.close()

def view_context():
    """View conversation context (memory) in the database"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        # Get all conversation contexts
        cursor.execute("SELECT * FROM conversation_context ORDER BY created_at DESC")
        contexts = cursor.fetchall()
        
        if not contexts:
            print("\nNo conversation contexts found in the database.")
            return
        
        print(f"\n===== CONVERSATION CONTEXTS ({len(contexts)} total) =====")
        
        # Display each context
        for ctx in contexts:
            print(f"\nUser ID: {ctx['user_id']}")
            print(f"Created At: {ctx['created_at']}")
            print(f"Context: {ctx['context'][:100]}..." if len(ctx['context']) > 100 else ctx['context'])
            print("-" * 80)
    
    except sqlite3.OperationalError as e:
        if "no such table" in str(e):
            print("\nThe conversation_context table doesn't exist yet. Chat with memory enabled to create it!")
        else:
            print(f"\nError: {e}")
    
    conn.close()

def main():
    print("===== SQLite Database Viewer =====")
    print(f"Database Path: {os.path.abspath(DB_PATH)}")
    
    # Show tables in the database
    view_tables()
    
    # View conversations
    view_conversations()
    
    # View context
    view_context()

if __name__ == "__main__":
    main() 