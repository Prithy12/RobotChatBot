import sqlite3
import os
import json
from datetime import datetime
from flask import Flask, render_template_string, jsonify

# Database file path
DB_PATH = 'data/chatbot.db'

app = Flask(__name__)

def get_db_connection():
    """Create a connection to the SQLite database"""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

@app.route('/')
def index():
    """Main page with database information"""
    html = '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Chatbot Database Viewer</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 0;
                padding: 20px;
                background-color: #f5f5f5;
            }
            .container {
                max-width: 1200px;
                margin: 0 auto;
                background: white;
                padding: 20px;
                border-radius: 5px;
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            }
            h1, h2, h3 {
                color: #333;
            }
            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 20px;
            }
            table, th, td {
                border: 1px solid #ddd;
            }
            th, td {
                padding: 12px;
                text-align: left;
            }
            th {
                background-color: #f2f2f2;
            }
            tr:hover {
                background-color: #f5f5f5;
            }
            .context-container {
                background-color: #f9f9f9;
                border: 1px solid #ddd;
                padding: 15px;
                margin-bottom: 20px;
                border-radius: 5px;
            }
            .truncate {
                max-width: 300px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
                cursor: pointer;
            }
            .expand-btn {
                background: #4CAF50;
                color: white;
                border: none;
                padding: 5px 10px;
                border-radius: 3px;
                cursor: pointer;
                margin-left: 10px;
            }
            .modal {
                display: none;
                position: fixed;
                z-index: 1;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                overflow: auto;
                background-color: rgba(0,0,0,0.4);
            }
            .modal-content {
                background-color: #fefefe;
                margin: 15% auto;
                padding: 20px;
                border: 1px solid #888;
                width: 80%;
                border-radius: 5px;
            }
            .close {
                color: #aaa;
                float: right;
                font-size: 28px;
                font-weight: bold;
                cursor: pointer;
            }
            .close:hover {
                color: black;
            }
            pre {
                white-space: pre-wrap;
                word-wrap: break-word;
                background-color: #f5f5f5;
                padding: 15px;
                border-radius: 5px;
                overflow-x: auto;
            }
        </style>
    </head>
    <body>
        <div class="container">
            <h1>Chatbot Database Viewer</h1>
            <p>Database Path: <code>{{ db_path }}</code></p>
            
            <h2>Tables</h2>
            <ul>
                {% for table in tables %}
                    <li>{{ table.name }}</li>
                {% endfor %}
            </ul>
            
            <h2>Conversations</h2>
            {% if conversations %}
                <table id="conversationsTable">
                    <tr>
                        <th>ID</th>
                        <th>Timestamp</th>
                        <th>Prompt</th>
                        <th>Response</th>
                    </tr>
                    {% for conv in conversations %}
                    <tr>
                        <td>{{ conv.id[:8] }}...</td>
                        <td>{{ conv.timestamp }}</td>
                        <td class="truncate" onclick="showFullText(this, '{{ conv.prompt | replace("'", "\\'") | replace('"', '\\"') | replace('\n', '\\n') }}')">
                            {{ conv.prompt[:50] }}{% if conv.prompt|length > 50 %}...{% endif %}
                            <button class="expand-btn">View</button>
                        </td>
                        <td class="truncate" onclick="showFullText(this, '{{ conv.response | replace("'", "\\'") | replace('"', '\\"') | replace('\n', '\\n') }}')">
                            {{ conv.response[:50] }}{% if conv.response|length > 50 %}...{% endif %}
                            <button class="expand-btn">View</button>
                        </td>
                    </tr>
                    {% endfor %}
                </table>
            {% else %}
                <p>No conversations found in the database.</p>
            {% endif %}
            
            <h2>Conversation Contexts</h2>
            {% if contexts %}
                {% for ctx in contexts %}
                    <div class="context-container">
                        <h3>User ID: {{ ctx.user_id }}</h3>
                        <p>Created At: {{ ctx.created_at }}</p>
                        <div class="truncate" onclick="showFullText(this, '{{ ctx.context | replace("'", "\\'") | replace('"', '\\"') | replace('\n', '\\n') }}')">
                            Context: {{ ctx.context[:100] }}{% if ctx.context|length > 100 %}...{% endif %}
                            <button class="expand-btn">View</button>
                        </div>
                    </div>
                {% endfor %}
            {% else %}
                <p>No conversation contexts found in the database.</p>
            {% endif %}
        </div>
        
        <!-- Modal for full text display -->
        <div id="textModal" class="modal">
            <div class="modal-content">
                <span class="close" onclick="closeModal()">&times;</span>
                <h2 id="modalTitle">Full Text</h2>
                <pre id="modalContent"></pre>
            </div>
        </div>
        
        <script>
            // Function to show full text in modal
            function showFullText(element, text) {
                // Decode special characters
                text = text.replace(/\\n/g, '\n').replace(/\\'/g, "'").replace(/\\"/g, '"');
                
                var modal = document.getElementById('textModal');
                var modalContent = document.getElementById('modalContent');
                
                // Set content and show modal
                modalContent.textContent = text;
                modal.style.display = 'block';
                
                // Set title based on the column
                var title = element.parentNode.cellIndex === 2 ? 'Prompt' : 'Response';
                document.getElementById('modalTitle').textContent = title;
            }
            
            // Function to close the modal
            function closeModal() {
                document.getElementById('textModal').style.display = 'none';
            }
            
            // Close modal when clicking outside of it
            window.onclick = function(event) {
                var modal = document.getElementById('textModal');
                if (event.target == modal) {
                    modal.style.display = 'none';
                }
            }
        </script>
    </body>
    </html>
    '''
    
    # Get database connections
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Get tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [{"name": table["name"]} for table in cursor.fetchall()]
    
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
    
    return render_template_string(
        html,
        db_path=os.path.abspath(DB_PATH),
        tables=tables,
        conversations=conversations,
        contexts=contexts
    )

if __name__ == '__main__':
    if not os.path.exists(DB_PATH):
        print(f"Warning: Database file not found at {DB_PATH}")
        print("The viewer will still start, but there won't be any data to display.")
        print("Make sure you've used the chatbot at least once to create the database.")
    
    print("Starting database viewer...")
    print("Open your web browser and go to: http://localhost:5000")
    app.run(debug=True) 