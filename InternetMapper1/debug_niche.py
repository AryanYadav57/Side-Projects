import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from services.wikipedia_service import fetch_wikipedia_content
from nlp.entity_extractor import extract_entities

topic = "fakemink"
try:
    data = fetch_wikipedia_content(topic)
    print(f"Title: {data['title']}")
    print(f"Text Length: {len(data['text'])}")
    
    entities = extract_entities(data['text'])
    print(f"Entities found: {len(entities)}")
    for e in entities[:5]:
        print(f"  - {e['label']} ({e['entity_type']})")

except Exception as e:
    print(f"Error: {e}")
