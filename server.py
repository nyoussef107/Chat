from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import openai
import os
from dotenv import load_dotenv
import logging
from logging.handlers import RotatingFileHandler

app = Flask(__name__)
CORS(app)

# Set up logging
logging.basicConfig(level=logging.INFO)
handler = RotatingFileHandler('app.log', maxBytes=10000, backupCount=3)
handler.setLevel(logging.INFO)
app.logger.addHandler(handler)

load_dotenv()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
print(OPENAI_API_KEY)
client = OpenAI(api_key=OPENAI_API_KEY)

def chat_with_gpt(query, retrieved_data):
    messages = [
        # {"role": "system", "content": "Use the provided data delimited by triple quotes to answer questions. Be as precise and detailed. If the answer cannot be found in the articles, write 'I could not find an answer.'"},
        # {"role": "user", "content": retrieved_data},
        # {"role": "user", "content": query},
        {"role": "system", "content": "you are a friendly ai answer my query"},
        {"role": "user", "content": retrieved_data},
        {"role": "user", "content": query},
        
        
    ]
    response = client.chat.completions.create(
        model="gpt-4",
        messages=messages
    )
    return response.choices[0].message.content

@app.route('/chat', methods=['POST'])
def chat():
    app.logger.info("Received request to /chat endpoint")
    data = request.json
    user_message = data.get('message', '')
    retrieved_data = data.get('retrieved_data', '')
    
    if not user_message:
        app.logger.warning("No message provided in chat request")
        return jsonify({"error": "No message provided"}), 400
    
    try:
        app.logger.info(f"Sending message to OpenAI: {user_message}")
        ai_response = chat_with_gpt(user_message, retrieved_data)
        app.logger.info(f"Received response from OpenAI: {ai_response[:50]}...")
        return jsonify({"response": ai_response})
    except Exception as e:
        app.logger.error(f"Error in chat endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/analyze-document', methods=['POST'])
def analyze_document():
    app.logger.info("Received request to /analyze-document endpoint")
    data = request.json
    document_content = data.get('content', '')
    if not document_content:
        app.logger.warning("No document content provided in analyze-document request")
        return jsonify({"error": "No document content provided"}), 400
    
    try:
        summary_prompt = f"Summarize the following document:\n\n{document_content[:]}..."
        summary = chat_with_gpt(summary_prompt, "")
        app.logger.info(f"Received summary from OpenAI: {summary[:50]}...")
        return jsonify({"summary": summary})
    except Exception as e:
        app.logger.error(f"Error in analyze-document endpoint: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.logger.info("Starting the Flask application")
    app.run(host='0.0.0.0', port=5000, debug=True)