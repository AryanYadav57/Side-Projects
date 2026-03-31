import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from nlp.entity_extractor import extract_entities

test_text = "Rick Owens and Raf Simons are legends. Vetements was founded by Demna Gvasalia. Undercover is by Jun Takahashi."

entities = extract_entities(test_text)
print("Extracted Entities:")
for e in entities:
    print(f"- {e['label']} ({e['entity_type']})")

labels = [e['label'] for e in entities]
assert "Rick Owens" in labels
assert "Raf Simons" in labels
assert "Vetements" in labels
assert "Undercover" in labels
print("\nSuccess: New Archive Fashion entities correctly identified!")
