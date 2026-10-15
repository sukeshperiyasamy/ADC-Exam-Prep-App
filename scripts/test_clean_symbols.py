import json
import re

with open('scripts/adc-questions.json', encoding='utf-8') as f:
    questions = json.load(f)

def clean_symbols(text):
    if not text:
        return ""
    t = text
    # Remove markdown blockquote symbols (> and >>)
    t = re.sub(r'^[ \t]*>[ \t]*', '', t, flags=re.MULTILINE)
    t = re.sub(r'>+', '', t)
    # Remove markdown bold/italic asterisks (**)
    t = t.replace('**', '').replace('*', '')
    # Remove markdown headers (#)
    t = re.sub(r'#+\s*', '', t)
    # Remove backticks
    t = t.replace('`', '')
    # Remove unicode replacement char \ufffd or weird quotes
    t = t.replace('\ufffd', "'")
    t = t.replace('\u2019', "'").replace('\u2018', "'").replace('\u201c', '"').replace('\u201d', '"')
    t = t.replace('\u2013', '-').replace('\u2014', ' - ')
    # Clean double prefixes
    t = re.sub(r'^(Question\s*(\([IVXLCDM]+\))?[:\s]*)+', '', t, flags=re.I)
    t = re.sub(r'^(Scenario\s*\d*[:\s]*)+', '', t, flags=re.I)
    t = re.sub(r'^(Clinical Scenario\s*\d*[:\s]*)+', '', t, flags=re.I)
    t = re.sub(r'[ \t]+', ' ', t)
    t = re.sub(r'\n{3,}', '\n\n', t)
    return t.strip()

for i in [0, 1, 3, 15, 20]:
    q = questions[i]
    print(f"\n=================== SAMPLE {i} ===================")
    print("BEFORE:\n", q['stem'])
    
    # Check if there is scenario text
    parts = q['stem'].split('**Question')
    if len(parts) == 2:
        scen_part = clean_symbols(parts[0])
        q_part = clean_symbols(parts[1])
        formatted = f"Clinical Scenario:\n{scen_part}\n\nQuestion: {q_part}"
    else:
        formatted = clean_symbols(q['stem'])
        
    print("\nAFTER:\n", formatted)
