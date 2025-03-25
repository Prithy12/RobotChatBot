import sqlite3
import os
import csv
import json
from datetime import datetime

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

def export_to_csv():
    """Export database tables to CSV files"""
    conn = get_db_connection()
    if not conn:
        return False
    
    cursor = conn.cursor()
    
    # Create export directory
    export_dir = 'db_export'
    os.makedirs(export_dir, exist_ok=True)
    
    # Get tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = [table["name"] for table in cursor.fetchall()]
    
    print(f"Found {len(tables)} tables in the database:")
    for table in tables:
        print(f"- {table}")
    
    for table in tables:
        try:
            # Get table data
            cursor.execute(f"SELECT * FROM {table}")
            rows = [dict(row) for row in cursor.fetchall()]
            
            if not rows:
                print(f"Table {table} is empty. Skipping.")
                continue
            
            # Get column names
            columns = list(rows[0].keys())
            
            # Special handling for conversation_context
            if table == 'conversation_context' and 'context' in columns:
                # Convert JSON context to readable format
                for row in rows:
                    try:
                        context_data = json.loads(row['context'])
                        formatted_context = []
                        for msg in context_data:
                            formatted_context.append(f"{msg.get('role', 'unknown')}: {msg.get('content', '')}")
                        row['context'] = '\n'.join(formatted_context)
                    except:
                        # Keep as is if conversion fails
                        pass
            
            # Write to CSV
            csv_file = os.path.join(export_dir, f"{table}.csv")
            with open(csv_file, 'w', newline='', encoding='utf-8') as f:
                writer = csv.DictWriter(f, fieldnames=columns)
                writer.writeheader()
                writer.writerows(rows)
            
            print(f"Exported {len(rows)} rows from {table} to {csv_file}")
        
        except Exception as e:
            print(f"Error exporting table {table}: {str(e)}")
    
    conn.close()
    
    print("\nDatabase export complete!")
    print(f"CSV files are saved in the '{export_dir}' directory.")
    print("You can open these files in Excel or any spreadsheet application.")
    return True

if __name__ == '__main__':
    export_to_csv() 