import os
import json
import logging
import uuid
from datetime import datetime
from fastapi import FastAPI, HTTPException, Depends, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from openai import OpenAI
from dotenv import load_dotenv
from typing import List, Dict, Optional, Any

import database as db

# Load environment variables
load_dotenv()

# Configure logging
os.makedirs('logs', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(message)s',
    handlers=[
        logging.FileHandler('logs/api.log'),
        logging.StreamHandler()
    ]
)

# Initialize FastAPI app
app = FastAPI(title="ChatBot API")

# Add CORS middleware to allow requests from the React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# In-memory storage for the current session
# This will be synchronized with the database
chat_history: List[Dict] = []

# Load existing conversations from database
try:
    chat_history = db.get_all_conversations()
    logging.info(f"Loaded {len(chat_history)} conversations from database")
except Exception as e:
    logging.error(f"Error loading conversations from database: {str(e)}")

class ChatRequest(BaseModel):
    message: str
    user_id: str = "default_user"
    use_memory: bool = True

class ChatResponse(BaseModel):
    response: str
    conversation_id: str

class ChatHistoryItem(BaseModel):
    id: str
    timestamp: str
    prompt: str
    response: str

class UpdatePromptRequest(BaseModel):
    prompt: str

def format_memory_prompt(user_message: str, user_id: str, use_memory: bool) -> List[Dict[str, str]]:
    """Format the prompt with memory context if available and requested"""
    messages = []
    
    if use_memory:
        # System message with instructions on using memory
        system_message = {
            "role": "system", 
            "content": "You are a helpful assistant with memory of past conversations. Use this context to provide more personalized and consistent responses."
        }
        messages.append(system_message)
        
        # Add conversation context from the database if available
        context = db.get_context(user_id)
        if context:
            messages.extend(context)
        else:
            # If no context exists, retrieve recent conversations as memory
            recent_convs = db.get_recent_conversations(3)  # Get last 3 conversations
            if recent_convs:
                memory_context = "Here's some context from our previous conversations:\n\n"
                for i, conv in enumerate(recent_convs):
                    memory_context += f"Conversation {i+1}:\n"
                    memory_context += f"You: {conv['prompt']}\n"
                    memory_context += f"Assistant: {conv['response']}\n\n"
                
                messages.append({
                    "role": "system",
                    "content": memory_context
                })
    
    # Add the current user message
    messages.append({"role": "user", "content": user_message})
    
    return messages

@app.post("/api/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """API endpoint to chat with the bot with memory"""
    user_message = request.message
    user_id = request.user_id
    use_memory = request.use_memory
    
    if not user_message:
        raise HTTPException(status_code=400, detail="No message provided")
    
    try:
        # Log the sent prompt
        logging.info(json.dumps({"prompt": user_message, "user_id": user_id, "use_memory": use_memory}))
        
        # Create message array with memory context if requested
        messages = format_memory_prompt(user_message, user_id, use_memory)
        
        # Send request to OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=messages
        )
        
        # Extract response content
        response_text = response.choices[0].message.content
        
        # Log the received response
        logging.info(json.dumps({"response": response_text}))
        
        # Generate a unique ID for this conversation
        conversation_id = str(uuid.uuid4())
        
        # Store in database
        db.save_conversation(conversation_id, user_message, response_text)
        
        # Update in-memory copy for current session
        timestamp = datetime.now().isoformat()
        conversation = {
            "id": conversation_id,
            "timestamp": timestamp,
            "prompt": user_message,
            "response": response_text
        }
        chat_history.insert(0, conversation)  # Add to beginning (newest first)
        
        # Update the conversation context for this user (last 10 exchanges)
        if use_memory:
            # Get existing context or create new
            context = db.get_context(user_id)
            
            # Add the current exchange
            context.append({"role": "user", "content": user_message})
            context.append({"role": "assistant", "content": response_text})
            
            # Keep only the last 10 messages (5 exchanges)
            if len(context) > 10:
                context = context[-10:]
            
            # Save the updated context
            db.save_context(user_id, context)
        
        return {"response": response_text, "conversation_id": conversation_id}
    
    except Exception as e:
        logging.error(f"Error processing chat request: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history", response_model=List[ChatHistoryItem])
async def get_history():
    """Get all chat history"""
    try:
        # Return from database to ensure we have the latest data
        return db.get_all_conversations()
    except Exception as e:
        logging.error(f"Error fetching history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.put("/api/history/{conversation_id}", response_model=ChatHistoryItem)
async def update_prompt(conversation_id: str, request: UpdatePromptRequest):
    """Update a prompt and regenerate response"""
    new_prompt = request.prompt
    
    if not new_prompt:
        raise HTTPException(status_code=400, detail="No prompt provided")
    
    try:
        # Log the updated prompt
        logging.info(json.dumps({"updated_prompt": new_prompt}))
        
        # Get new response from OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": new_prompt}]
        )
        
        # Extract response content
        response_text = response.choices[0].message.content
        
        # Log the new response
        logging.info(json.dumps({"updated_response": response_text}))
        
        # Update the conversation in the database
        success = db.update_conversation(conversation_id, new_prompt, response_text)
        
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Update the in-memory copy for the current session
        updated_conversation = db.get_conversation(conversation_id)
        
        # Update in-memory chat_history
        for idx, conversation in enumerate(chat_history):
            if conversation["id"] == conversation_id:
                chat_history[idx] = updated_conversation
                break
        
        return updated_conversation
    
    except HTTPException:
        raise
    except Exception as e:
        logging.error(f"Error updating prompt: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/reset-memory")
async def reset_memory(user_id: str = "default_user"):
    """Reset the conversation memory/context for a user"""
    try:
        # Create empty context
        db.save_context(user_id, [])
        return {"message": f"Memory reset successful for user {user_id}"}
    except Exception as e:
        logging.error(f"Error resetting memory: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True) 