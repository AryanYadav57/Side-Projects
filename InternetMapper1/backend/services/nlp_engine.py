import spacy

_nlp = None

def get_nlp():
    """Singleton-style accessor for the spaCy model."""
    global _nlp
    if _nlp is None:
        try:
            _nlp = spacy.load("en_core_web_sm")
            # Add entity ruler if needed (could be done in entity_extractor)
        except OSError:
            raise RuntimeError("Run: python -m spacy download en_core_web_sm")
    return _nlp
