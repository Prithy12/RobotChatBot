import sqlite3
import os
import json
from datetime import datetime
import html

# Database file path
DB_PATH = 'data/chatbot.db'

def get_db_connection():
    """Create a connection to the SQLite database"""
    if not os.path.exists(DB_PATH):
        print(f"Database file not found: {DB_PATH}")
        return None
    
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def generate_html():
    """Generate HTML file with database contents"""
    conn = get_db_connection()
    if not conn:
        return False
    
    cursor = conn.cursor()
    
    # Get tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [table["name"] for table in cursor.fetchall()]
    
    # Get conversations
    conversations = []
    try:
        cursor.execute("SELECT * FROM conversations ORDER BY timestamp DESC")
        conversations = [dict(row) for row in cursor.fetchall()]
    except sqlite3.OperationalError:
        pass  # Table might not exist yet
    
    # Get conversation contexts
    contexts = []
    try:
        cursor.execute("SELECT * FROM conversation_context ORDER BY created_at DESC")
        contexts = [dict(row) for row in cursor.fetchall()]
    except sqlite3.OperationalError:
        pass  # Table might not exist yet
    
    conn.close()
    
    # Generate HTML file
    html_content = f'''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Chatbot Database Export</title>
        <style>
            body {{
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
            }}
            .container {{
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }}
            h1, h2, h3 {{
                color: #333;
            }}
            table {{
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }}
            table, th, td {{
                border: 1px solid #ddd;
            }}
            th, td {{
                padding: 12px;
                text-align: left;
            }}
            th {{
                background-color: #f2f2f2;
            }}
            tr:hover {{
                background-color: #f5f5f5;
            }}
            .context-container {{
                background-color: #f9f9f9;
                border: 1px solid #ddd;
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 5px;
            }}
            .json-data {{
                white-space: pre-wrap;
                word-wrap: break-word;
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                max-height: 200px;
                overflow-y: auto;
                font-family: monospace;
                font-size: 14px;
            }}
            .timestamp {{
                color: #666;
                font-size: 0.9em;
            }}
            .truncate {{
                max-width: 300px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }}
            details {{
                margin-bottom: 10px;
            }}
            summary {{
                cursor: pointer;
                padding: 10px;
                background-color: #eee;
                border-radius: 5px;
            }}
            summary:hover {{
                background-color: #ddd;
            }}
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Chatbot Database Export</h1>
            <p>Database Path: <code>{os.path.abspath(DB_PATH)}</code></p>
            <p>Export Date: <code>{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}</code></p>
            
            <h2>Tables</h2>
            <ul>
                {' '.join(f'<li>{table}</li>' for table in tables)}
            </ul>
            
            <h2>Conversations ({len(conversations)})</h2>
            {generate_conversations_html(conversations)}
            
            <h2>Conversation Contexts ({len(contexts)})</h2>
            {generate_contexts_html(contexts)}
        </div>
    </body>
    </html>
    '''
    
    # Write to file
    with open('db_export.html', 'w', encoding='utf-8') as f:
        f.write(html_content)
    
    print(f"Database exported to db_export.html")
    print(f"Open this file in your browser to view the database contents.")
    return True

def generate_conversations_html(conversations):
    """Generate HTML for conversations"""
    if not conversations:
        return "<p>No conversations found in the database.</p>"
    
    html_content = '''
    <table>
        <tr>
            <th>ID</th>
            <th>Timestamp</th>
            <th>Prompt</th>
            <th>Response</th>
        </tr>
    '''
    
    for conv in conversations:
        # Escape HTML
        prompt = html.escape(conv['prompt'])
        response = html.escape(conv['response'])
        
        # Create details/summary for full text view
        html_content += f'''
        <tr>
            <td>{conv['id'][:8]}...</td>
            <td class="timestamp">{conv['timestamp']}</td>
            <td>
                <details>
                    <summary>{prompt[:50]}{'...' if len(prompt) > 50 else ''}</summary>
                    <div class="json-data">{prompt}</div>
                </details>
            </td>
            <td>
                <details>
                    <summary>{response[:50]}{'...' if len(response) > 50 else ''}</summary>
                    <div class="json-data">{response}</div>
                </details>
            </td>
        </tr>
        '''
    
    html_content += '</table>'
    return html_content

def generate_contexts_html(contexts):
    """Generate HTML for conversation contexts"""
    if not contexts:
        return "<p>No conversation contexts found in the database.</p>"
    
    html_content = ''
    
    for ctx in contexts:
        context_data = html.escape(ctx['context'])
        
        html_content += f'''
        <div class="context-container">
            <h3>User ID: {ctx['user_id']}</h3>
            <p class="timestamp">Created At: {ctx['created_at']}</p>
            <details>
                <summary>Context Data</summary>
                <div class="json-data">{context_data}</div>
            </details>
        </div>
        '''
    
    return html_content

if __name__ == '__main__':
    generate_html() 