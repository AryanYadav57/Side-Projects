import os
from typing import List, Dict

# In a real production app, we'd use Google Gemini or OpenAI here.
# For this project, we'll implement a 'Heuristic Synthesizer' that 
# mimics AI insights by analyzing the graph structure, unless an 
# API key is provided for deep synthesis.

def generate_graph_insight(topic: str, nodes: List[Dict], edges: List[Dict]) -> str:
    """
    Analyzes the graph and returns a 'Vibe-Check' summary.
    """
    if not nodes:
        return "Not enough data to synthesize yet. Keep exploring!"

    # 1. Identify key players (highest importance)
    top_nodes = sorted(nodes, key=lambda x: x.get("importance", 1.0), reverse=True)[:3]
    top_labels = [n["label"] for n in top_nodes]
    
    # 2. Identify common relations
    rels = [e["relation"] for e in edges if e["relation"] != "CO_OCCURS_WITH"]
    most_common_rel = max(set(rels), key=rels.count) if rels else "connected"
    
    # 3. Categorize the vibe
    # (Using the category detection logic we already have in the router)
    
    # Generate the 'Vibe' string
    insight = f"The {topic} scene centers heavily around {', '.join(top_labels[:-1])} and {top_labels[-1]}. "
    
    if most_common_rel == "FOUNDED_BY":
        insight += "There's a deep legacy of creation and mentorship here."
    elif most_common_rel == "WORKS_FOR" or most_common_rel == "MEMBER_OF":
        insight += "It's a tight-knit ecosystem with significant crossover between houses and labels."
    elif most_common_rel == "DESIGNED_BY":
        insight += "The visual language is very consistent across the major players."
    else:
        insight += "The connections are subtle but show a clear line of influence and shared DNA."
        
    return insight
