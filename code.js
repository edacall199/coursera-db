(async () => {
  function cleanText(str) {
    return str.trim().replace(/\s+/g, ' ');
  }
  
  function extractQuestion(raw) {
    const m = raw.match(/ [A-Z]\. /);
    if (m) {
      return raw.substring(0, m.index);
    }
    return raw;
  }

  function extractChoices(raw) {
    const map = {};
    const m = raw.match(/( [A-Z]\. .*)/);
    if (!m) return map;
    const choicesPart = m[1].trim();
    const parts = choicesPart.split(/ (?=[A-Z]\. )/);
    parts.forEach(p => {
      const sub = p.trim();
      const mm = sub.match(/^([A-Z])\. (.*)/);
      if (mm) {
        map[mm[1]] = mm[2];
      }
    });
    return map;
  }
  
  const sideElems = Array.from(document.querySelectorAll('div[data-testid="set-page-term-card-side"]'));
  const results = [];
  
  for (let i = 0; i < sideElems.length; i += 2) {
    const qSide = sideElems[i];
    const aSide = sideElems[i + 1];
    if (!qSide || !aSide) continue;
    
    const qEl = qSide.querySelector('.TermText');
    const aEl = aSide.querySelector('.TermText');
    if (!qEl || !aEl) continue;
    
    const rawQ = cleanText(qEl.innerText);
    const rawA = cleanText(aEl.innerText);
    
    const question = extractQuestion(rawQ);
    const choicesMap = extractChoices(rawQ);
    
    const letters = rawA.split(',').map(s => s.trim());
    const corrects = letters.map(letter => choicesMap[letter]).filter(t => t);
    const definition = corrects.length > 0 ? corrects.join(', ') : rawA;
    
    results.push({
      term: question,
      definition: definition
    });
  }
  
  let json = JSON.stringify(results, null, 2);
  
  // Loại bỏ các \" nếu có
  // Thay thế \" thành " (chỉ trong nội dung, không ảnh hưởng cấu trúc JSON)
  json = json.replace(/\\"/g, '"');
  
  console.log(json);

  // Tạo blob từ JSON
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'quizlet_data.json';
  document.body.appendChild(a);
  a.click();

  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  return results;
})();
