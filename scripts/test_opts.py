import docx
import re
import json

doc = docx.Document('1.docx')
paragraphs = [p.text.strip() for p in doc.paragraphs if p.text.strip()]

def clean_text(t):
    return (t.replace('\u2019', "'")
            .replace('\u2018', "'")
            .replace('\u201c', '"')
            .replace('\u201d', '"')
            .replace('\u2013', '-')
            .replace('\u2014', '--')
            .replace('\ufffd', "'")
            .replace('\x92', "'")
            .replace('\x93', '"')
            .replace('\x94', '"')
            .strip())

cleaned_lines = [clean_text(p) for p in paragraphs if clean_text(p)]

scenarios = []
current_scenario = {"title": "Introduction", "text": "", "questions": []}
current_q = None

sub_q_re = re.compile(r'^(I|II|III|IV|V|VI|VII|VIII|IX|X)\.\s*(.*)', re.DOTALL)
scenario_header_re = re.compile(r'^(\d+)\.\s*(.*)', re.DOTALL)
correct_re = re.compile(r'^correct\s*answer[:\s]*(.*)', re.IGNORECASE)
explanation_re = re.compile(r'^explanation[:\s]*(.*)', re.IGNORECASE)
option_letter_re = re.compile(r'^[A-D]\.\s+')

i = 0
while i < len(cleaned_lines):
    line = cleaned_lines[i]
    
    exp_m = explanation_re.match(line)
    if exp_m:
        if current_q:
            exp_text = exp_m.group(1).strip()
            current_q["explanation"] = exp_text
            while i + 1 < len(cleaned_lines):
                nxt = cleaned_lines[i+1]
                if (sub_q_re.match(nxt) or scenario_header_re.match(nxt) or 
                    correct_re.match(nxt) or option_letter_re.match(nxt)):
                    break
                current_q["explanation"] += " " + nxt
                i += 1
        i += 1
        continue

    corr_m = correct_re.match(line)
    if corr_m:
        if current_q:
            current_q["raw_correct"] = corr_m.group(1).strip()
        i += 1
        continue

    sc_m = scenario_header_re.match(line)
    if sc_m and not re.match(r'^[A-D]\.', line):
        num = sc_m.group(1)
        text = sc_m.group(2).strip()
        if current_scenario["questions"] or current_scenario["text"]:
            scenarios.append(current_scenario)
        current_scenario = {
            "number": num,
            "title": f"Scenario {num}",
            "text": text,
            "questions": []
        }
        current_q = None
        i += 1
        continue

    sub_m = sub_q_re.match(line)
    if sub_m:
        roman = sub_m.group(1)
        q_stem = sub_m.group(2).strip()
        
        if roman == 'I' and current_scenario["questions"]:
            scenarios.append(current_scenario)
            current_scenario = {
                "number": str(len(scenarios) + 1),
                "title": f"Scenario {len(scenarios) + 1}",
                "text": "",
                "questions": []
            }
        
        current_q = {
            "roman": roman,
            "stem": q_stem,
            "options": [],
            "raw_correct": "",
            "explanation": ""
        }
        current_scenario["questions"].append(current_q)
        i += 1
        continue

    if current_q and (line.startswith('A.') or '\nB.' in line or re.match(r'^[A-D]\.\s+', line)):
        lines_opts = line.split('\n')
        for lo in lines_opts:
            lo = lo.strip()
            if lo:
                current_q["options"].append(lo)
        
        while i + 1 < len(cleaned_lines):
            nxt = cleaned_lines[i+1]
            if re.match(r'^[B-D]\.?\s+', nxt):
                for lo in nxt.split('\n'):
                    lo = lo.strip()
                    if lo:
                        current_q["options"].append(lo)
                i += 1
            else:
                break
        i += 1
        continue

    if current_q and not current_q["options"] and not current_q["raw_correct"]:
        current_q["stem"] += " " + line
    elif current_scenario:
        if current_scenario["questions"]:
            scenarios.append(current_scenario)
            current_scenario = {
                "number": str(len(scenarios) + 1),
                "title": f"Scenario {len(scenarios) + 1}",
                "text": line,
                "questions": []
            }
            current_q = None
        else:
            if current_scenario["text"]:
                current_scenario["text"] += " " + line
            else:
                current_scenario["text"] = line

    i += 1

if current_scenario["questions"] or current_scenario["text"]:
    scenarios.append(current_scenario)

def parse_option_lines(raw_opts):
    options = []
    lines = []
    for ro in raw_opts:
        for l in ro.split('\n'):
            l = l.strip()
            if l:
                lines.append(l)
    
    current_opt = None
    for l in lines:
        m = re.match(r'^([A-E])[\.\)\s]+(.*)', l, re.IGNORECASE)
        if m:
            if current_opt:
                options.append(current_opt)
            letter = m.group(1).lower()
            text = m.group(2).strip()
            current_opt = {"id": letter, "text": text}
        else:
            if current_opt:
                current_opt["text"] += " " + l
            else:
                pass
    if current_opt:
        options.append(current_opt)
    return options

def extract_correct_id(raw_correct, options):
    if not raw_correct:
        return []
    m = re.search(r'\b([A-E])\b', raw_correct, re.IGNORECASE)
    if m:
        letter = m.group(1).lower()
        if any(o["id"] == letter for o in options):
            return [letter]
    raw_lower = raw_correct.lower()
    for o in options:
        if o["text"].lower() in raw_lower or raw_lower in o["text"].lower():
            return [o["id"]]
    return []

# Process all questions
processed_questions = []
for s in scenarios:
    scen_text = s.get("text", "").strip()
    scen_title = s.get("title", "").strip()
    
    for q in s["questions"]:
        # Handle special edge cases
        if "Mother is concerned. What will replace the tooth" in q["stem"]:
            q["raw_correct"] = "A"
        
        parsed_opts = parse_option_lines(q["options"])
        correct_ids = extract_correct_id(q["raw_correct"], parsed_opts)
        
        # Skip completely broken / incomplete items like Scenario 48 Q II
        if len(parsed_opts) < 2 or not correct_ids:
            print(f"Skipping incomplete item: {q['stem'][:60]} | Opts: {len(parsed_opts)} | Corr: {q['raw_correct']}")
            continue
            
        full_stem = f"**{scen_title}**\n\n{scen_text}\n\n**Question ({q['roman']}):** {q['stem']}" if scen_text else f"**Question ({q['roman']}):** {q['stem']}"
        
        processed_questions.append({
            "stem": full_stem,
            "options": parsed_opts,
            "correct": correct_ids,
            "raw_correct": q["raw_correct"],
            "explanation": q["explanation"]
        })

print(f"\nSuccessfully validated and prepared {len(processed_questions)} complete questions!")
