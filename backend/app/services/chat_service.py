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

            Statistics: When presenting numerical data, choose the most appropriate chart type:
            - Use 'line' charts for time series data and trends over time
            - Use 'bar' charts for comparing categories or showing rankings
            - Use 'pie' charts for showing proportions of a whole

            Format your chart data as follows:
            ```
            {
                "type": "line" | "bar" | "pie",
                "data": [
                    {"name": "Label 1", "value": numeric_value},
                    {"name": "Label 2", "value": numeric_value}
                ],
                "xKey": "name",
                "yKey": "value"
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
                max_tokens=1500  # Increased token limit for more detailed responses
            )
            
            # Process the response
            chat_content = response.choices[0].message.content
            
            # Ensure all sections are present and properly formatted
            required_sections = {
                'Summary:': '\nNo summary provided.',
                'Details:': '\nNo details provided.',
                'Statistics:': '\n```{"type":"bar","data":[],"xKey":"name","yKey":"value"}```',
                'Commentary:': '\nNo commentary provided.'
            }
            
            formatted_content = chat_content
            
            # Add missing sections and ensure proper formatting
            for section, default_content in required_sections.items():
                if section not in formatted_content:
                    formatted_content += f"\n\n{section}{default_content}"
                elif section == 'Statistics:' and '```' not in formatted_content:
                    # If Statistics section exists but no JSON, add default chart data
                    stats_index = formatted_content.index('Statistics:')
                    next_section_index = float('inf')
                    for next_section in required_sections.keys():
                        if next_section != 'Statistics:':
                            pos = formatted_content.find(next_section, stats_index)
                            if pos != -1 and pos < next_section_index:
                                next_section_index = pos
                    
                    if next_section_index == float('inf'):
                        formatted_content += default_content
                    else:
                        formatted_content = (
                            formatted_content[:stats_index + 11] +  # 11 is length of "Statistics:"
                            default_content +
                            formatted_content[next_section_index:]
                        )
            
            return formatted_content

        except Exception as e:
            print(f"Error generating chat response: {e}")
            raise

    def format_history(self, messages):
        return [{
            "role": "user" if msg.role == "user" else "assistant",
            "content": msg.content
        } for msg in messages]