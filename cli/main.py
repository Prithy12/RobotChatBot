import os
import json
import logging
from datetime import datetime
from openai import OpenAI
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Configure logging for sent prompts
sent_logger = logging.getLogger('sent_prompts')
sent_logger.setLevel(logging.INFO)
sent_handler = logging.FileHandler('logs/sent_prompts.log')
sent_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
sent_logger.addHandler(sent_handler)

# Configure logging for received responses
received_logger = logging.getLogger('received_prompts')
received_logger.setLevel(logging.INFO)
received_handler = logging.FileHandler('logs/received_prompts.log')
received_handler.setFormatter(logging.Formatter('%(asctime)s - %(message)s'))
received_logger.addHandler(received_handler)

def log_sent_prompt(prompt):
    """Log prompts sent to the model"""
    sent_logger.info(json.dumps({"prompt": prompt}))

def log_received_response(response):
    """Log responses received from the model"""
    received_logger.info(json.dumps({"response": response}))

def chat_with_gpt(prompt):
    """Send a prompt to ChatGPT and get a response"""
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    
    # Log the sent prompt
    log_sent_prompt(prompt)
    
    # Send request to OpenAI API
    response = client.chat.completions.create(
        model="gpt-3.5-turbo",
        messages=[{"role": "user", "content": prompt}]
    )
    
    # Extract response content
    response_text = response.choices[0].message.content
    
    # Log the received response
    log_received_response(response_text)
    
    return response_text

def main():
    print("Welcome to the ChatGPT Bot! Type 'exit' to quit.")
    while True:
        user_input = input("\nYou: ")
        if user_input.lower() == 'exit':
            break
        
        try:
            response = chat_with_gpt(user_input)
            print(f"\nBot: {response}")
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    main()