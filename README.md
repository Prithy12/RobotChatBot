# ChatBot Web Application

A simple chatbot application with a React.js frontend and a FastAPI backend that uses OpenAI's GPT-3.5 API.

## Requirements

- Python 3.8+
- Node.js 14+
- npm 6+

## Setup

### Backend Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Ensure your `.env` file contains your OpenAI API key:
   ```
   OPENAI_API_KEY=your_openai_api_key
   ```

3. Start the backend server:
   ```bash
   python app.py
   ```
   The API will be available at http://localhost:8000

### Frontend Setup

1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the React development server:
   ```bash
   npm start
   ```
   The frontend will be available at http://localhost:3000

## Usage

1. Open your browser and navigate to http://localhost:3000
2. Type your message in the input box and press "Send"
3. Wait for the AI to respond
4. Continue the conversation as desired

## Features

- Real-time chat interface
- Integration with OpenAI's GPT-3.5 API
- Loading indicators for a better user experience
- Responsive design that works on desktop and mobile devices