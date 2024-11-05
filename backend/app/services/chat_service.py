from openai import OpenAI
from app.config import Config
from .pdf_processor import PDFProcessor
import json

class ChatService:
    def __init__(self):
        self.client = OpenAI(api_key=Config.OPENAI_API_KEY)
        self.pdf_processor = PDFProcessor()

    def get_system_message(self):
        return {
            "role": "system",
            "content": """You are a knowledgeable assistant specializing in the Sri Lankan tourism industry. 
            Your insights are used by hotel companies, tourism sector investors, and policymakers.
            
            For prompts not related to the tourism industry, return "Sorry I am only specialized in the tourism sector, therefore I will not be able to assist you on this"

            Structure your response in the following format:

            Summary: Provide a single sentence answer for the exact question asked.

            Details: Present key points using bullet points. Focus on relevant facts and data.

            Statistics: When presenting numerical data, include charts. Format your chart data as follows:
            ```
            {
                "type": "bar" | "line" | "pie",
                "data": [...data points...],
                "xKey": "x-axis key name",
                "yKey": "y-axis key name"
            }
            ```

            Commentary: Provide analysis and recommendations based on the data presented.
            """
        }

    def create_chat_response(self, messages, query):
        try:
            # Search for relevant context
            relevant_chunks = self.pdf_processor.search_similar_chunks(query)
            
            # Prepare conversation
            conversation = [self.get_system_message()]
            
            # Add context from documents
            if relevant_chunks:
                context = "\n\n".join(relevant_chunks)
                conversation.append({
                    "role": "system",
                    "content": f"Here is some relevant information:\n\n{context}"
                })
            
            # Add conversation history
            conversation.extend(messages)
            
            # Add current query
            conversation.append({"role": "user", "content": query})
            
            # Get response from OpenAI
            response = self.client.chat.completions.create(
                model=Config.CHAT_MODEL,
                messages=conversation,
                temperature=0.7,
                max_tokens=1000
            )
            
            # Process the response to ensure proper formatting
            chat_content = response.choices[0].message.content
            
            # Ensure the response has all required sections
            sections = ['Summary:', 'Details:', 'Statistics:', 'Commentary:']
            formatted_content = chat_content
            
            for section in sections:
                if section not in formatted_content:
                    if section == 'Statistics:':
                        # Add default chart data if statistics section is missing
                        default_stats = {
                            'type': 'bar',
                            'data': [],
                            'xKey': 'name',
                            'yKey': 'value'
                        }
                        formatted_content += f"\n\n{section}\n```{json.dumps(default_stats)}```"
                    else:
                        formatted_content += f"\n\n{section}\nNo {section.lower().strip(':')} provided."
            
            return formatted_content

        except Exception as e:
            print(f"Error generating chat response: {e}")
            raise

    def format_history(self, messages):
        return [{
            "role": "user" if msg.role == "user" else "assistant",
            "content": msg.content
        } for msg in messages]