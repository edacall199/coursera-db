(function () {
  const sides = document.querySelectorAll('[data-testid="set-page-term-card-side"]');
  let results = [];
  
  // Get quiz title
  let sourceTitle = document.querySelector("h1[data-testid='set-page-title']")?.innerText.trim()
    || document.querySelector("h1")?.innerText.trim()
    || "Unknown Source";
  
  /**
   * Check if text is a pure answer signature (only letters, possibly with separators)
   * Examples: "A", "ABC", "A, B, C", "AB"
   * NOT: "a. Something", "A. Option text"
   */
  function isPureAnswerSignature(text) {
    const cleaned = text.replace(/[\s,]/g, '');
    // Must be only uppercase letters, length between 1-10
    return /^[A-Z]+$/.test(cleaned) && cleaned.length <= 10;
  }
  
  /**
   * Check if text is a single lowercase letter (common answer format)
   * Examples: "a", "b", "c", "d"
   */
  function isSingleLetter(text) {
    return /^[a-zA-Z]$/.test(text.trim());
  }
  
  /**
   * Check if text is True/False answer
   * Examples: "T", "F", "True", "False"
   */
  function isTrueFalseAnswer(text) {
    const cleaned = text.trim().toUpperCase();
    return cleaned === 'T' || cleaned === 'F' || cleaned === 'TRUE' || cleaned === 'FALSE';
  }
  
  /**
   * Convert True/False answer to full text
   */
  function expandTrueFalse(text) {
    const cleaned = text.trim().toUpperCase();
    if (cleaned === 'T' || cleaned === 'TRUE') return 'True';
    if (cleaned === 'F' || cleaned === 'FALSE') return 'False';
    return text;
  }
  
  /**
   * Parse question text to extract main question and options
   */
  function parseQuestion(text) {
    const lines = text.split("\n").map(x => x.trim()).filter(x => x);
    const mainQuestionLines = [];
    const options = [];
    let currentOption = null;
    let inOptionsSection = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Check multiple option formats:
      // Format 1: "a. Something" or "A. Something"
      // Format 2: "a) Something" or "A) Something"
      // Format 3: "(a) Something" or "(A) Something"
      // Format 4: "a: Something" or "A: Something"
      // Format 5: "a, Something" or "A, Something" (comma separator)
      const optionMatchWithContent = line.match(/^(?:\()?([A-Za-z])(?:\))?[\.\)\:,]\s*(.+)$/);
      
      // Check if line is ONLY a letter marker (like "a." or "(a)" on its own line)
      const optionMarkerOnly = line.match(/^(?:\()?([A-Za-z])(?:\))?[\.\)\:,]?\s*$/);
      
      if (optionMatchWithContent && optionMatchWithContent[2].trim()) {
        // Once we see first option, we're in options section
        inOptionsSection = true;
        
        // Option with content on same line: "a. Something" or "(a) Something"
        if (currentOption) {
          options.push(currentOption);
        }
        currentOption = {
          letter: optionMatchWithContent[1].toUpperCase(),
          content: optionMatchWithContent[2].trim()
        };
      } else if (optionMarkerOnly && inOptionsSection) {
        // Option marker only: "a." or "(a)" - content comes on next line(s)
        if (currentOption) {
          options.push(currentOption);
        }
        currentOption = {
          letter: optionMarkerOnly[1].toUpperCase(),
          content: ""
        };
      } else if (currentOption && !currentOption.content && inOptionsSection) {
        // This line is the content for the previous option marker
        currentOption.content = line;
      } else if (currentOption && currentOption.content && inOptionsSection) {
        // Check if this might be a new option or continuation
        // If line starts with letter+separator, it's likely new option (already handled above)
        // Otherwise, it's continuation of current option
        currentOption.content += " " + line;
      } else {
        // This is part of the main question (including code blocks, etc.)
        mainQuestionLines.push(line);
      }
    }
    
    // Don't forget the last option
    if (currentOption && currentOption.content) {
      options.push(currentOption);
    }
    
    // If no formatted options found, check if the last few lines are simple options
    // (e.g., lines that are just single words/phrases/numbers after a question mark or colon)
    if (options.length === 0 && mainQuestionLines.length > 1) {
      const possibleOptions = [];
      const revisedMainQuestion = [];
      let foundQuestionEnd = false;
      
      for (let i = 0; i < mainQuestionLines.length; i++) {
        const line = mainQuestionLines[i];
        
        // Check if this line ends a question (ends with ? or :)
        if (!foundQuestionEnd && line.match(/[?:]\s*$/)) {
          foundQuestionEnd = true;
          revisedMainQuestion.push(line);
          continue;
        }
        
        // After question mark/colon, look for option-like lines
        if (foundQuestionEnd) {
          // Skip blank line markers like "________" or "-------"
          if (line.match(/^[_\-]{3,}$/)) {
            continue;
          }
          
          // Check if line is option-like:
          // - Pure number (1-4 digits)
          // - Short text (< 50 chars)
          // - Single word or short phrase
          // BUT NOT code-like (contains {, }, ;, etc.)
          const isNumber = /^\d{1,4}$/.test(line);
          const isCodeLike = /[{};=<>]/.test(line);
          const isShortText = line.length > 0 && line.length < 50 && !line.match(/[.!?]$/);
          
          if ((isNumber || isShortText) && !isCodeLike) {
            possibleOptions.push(line);
          } else if (possibleOptions.length === 0) {
            // If we haven't found options yet, might still be part of question
            revisedMainQuestion.push(line);
          }
        } else {
          revisedMainQuestion.push(line);
        }
      }
      
      // If we found 2-6 option-like lines after the question, treat them as options
      if (possibleOptions.length >= 2 && possibleOptions.length <= 6) {
        possibleOptions.forEach((opt, idx) => {
          options.push({
            letter: String.fromCharCode(65 + idx), // A, B, C, D, E, F...
            content: opt
          });
        });
        mainQuestionLines.length = 0;
        mainQuestionLines.push(...revisedMainQuestion);
      }
    }
    
    return {
      mainQuestion: mainQuestionLines.join("\n").trim(),
      options: options,
      hasOptions: options.length > 0
    };
  }
  
  /**
   * Map answer letters to their full content from options
   */
  function mapAnswersToContent(answerText, options) {
    // Extract individual letters from answer
    const letters = answerText
      .replace(/[\s,]/g, '')
      .toUpperCase()
      .split('')
      .filter(c => /[A-Z]/.test(c));
    
    const mappedAnswers = letters
      .map(letter => {
        const found = options.find(o => o.letter === letter);
        return found ? found.content : null;
      })
      .filter(Boolean);
    
    return mappedAnswers;
  }
  
  /**
   * Remove leading number patterns like "412. " or "42. "
   */
  function removeLeadingNumber(text) {
    return text.replace(/^\d+\.\s*/, '').trim();
  }
  
  // Process each pair of sides
  for (let i = 0; i < sides.length; i += 2) {
    let side1 = sides[i]?.innerText.trim();
    let side2 = sides[i + 1]?.innerText.trim();
    
    if (!side1 || !side2) continue;
    
    // Clean up any leading numbers
    side1 = removeLeadingNumber(side1);
    side2 = removeLeadingNumber(side2);
    
    let rawQuestion, rawAnswer;
    let isAnswerSigFormat = false;
    let isTrueFalse = false;
    
    // Check for True/False answers first
    if (isTrueFalseAnswer(side1)) {
      rawAnswer = side1;
      rawQuestion = side2;
      isTrueFalse = true;
    } else if (isTrueFalseAnswer(side2)) {
      rawAnswer = side2;
      rawQuestion = side1;
      isTrueFalse = true;
    }
    // Then check for answer signatures
    else if (isPureAnswerSignature(side1)) {
      rawAnswer = side1;
      rawQuestion = side2;
      isAnswerSigFormat = true;
    } else if (isPureAnswerSignature(side2)) {
      rawAnswer = side2;
      rawQuestion = side1;
      isAnswerSigFormat = true;
    } else if (isSingleLetter(side1)) {
      rawAnswer = side1;
      rawQuestion = side2;
      isAnswerSigFormat = true;
    } else if (isSingleLetter(side2)) {
      rawAnswer = side2;
      rawQuestion = side1;
      isAnswerSigFormat = true;
    } else {
      // Neither is answer signature - use default order
      // Usually the longer/more complex side is the question
      if (side1.length > side2.length || side1.includes('\n')) {
        rawQuestion = side1;
        rawAnswer = side2;
      } else {
        rawQuestion = side2;
        rawAnswer = side1;
      }
    }
    
    let term = rawQuestion;
    let definition = rawAnswer;
    
    // Handle True/False questions - no need to parse options
    if (isTrueFalse) {
      definition = expandTrueFalse(rawAnswer);
      term = rawQuestion;
    }
    // If answer is in signature format, MUST expand it
    else if (isAnswerSigFormat) {
      const parsed = parseQuestion(rawQuestion);
      
      if (parsed.hasOptions) {
        const mappedAnswers = mapAnswersToContent(rawAnswer, parsed.options);
        
        if (mappedAnswers.length > 0) {
          // Success: use full content as definition
          definition = mappedAnswers.join("   ");
          term = parsed.mainQuestion;
        } else {
          // Failed to map - log error
          console.warn(`⚠️ Cannot map answer "${rawAnswer}" to options`);
          console.warn(`Question: ${parsed.mainQuestion.substring(0, 80)}...`);
          definition = `ERROR: Cannot find option ${rawAnswer}`;
          term = parsed.mainQuestion || rawQuestion;
        }
      } else {
        // No options found but answer is letter - error case
        console.warn(`⚠️ Answer is "${rawAnswer}" but no options found`);
        console.warn(`Question text: ${rawQuestion.substring(0, 80)}...`);
        definition = `ERROR: No options for answer ${rawAnswer}`;
        term = rawQuestion;
      }
    }
    
    // Final cleanup
    term = term.trim();
    definition = definition.trim();
    
    results.push({ term, definition });
  }
  
  const finalResult = {
    Source: sourceTitle,
    Data: results
  };
  
  /**
   * Copy text to clipboard
   */
  function copyToClipboard(text) {
    const el = document.createElement("textarea");
    el.value = text;
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
  }
  
  console.log(finalResult);
  copyToClipboard(JSON.stringify(finalResult, null, 2));
  alert(`✅ Đã lấy ${results.length} câu hỏi từ: ${sourceTitle}\n(JSON đã được copy vào clipboard)`);
})();