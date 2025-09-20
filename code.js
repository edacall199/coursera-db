(function () {
  const sides = document.querySelectorAll('[data-testid="set-page-term-card-side"]');
  let results = [];

  // Lấy tiêu đề quiz
  let sourceTitle = document.querySelector("h1[data-testid='set-page-title']")?.innerText.trim()
    || document.querySelector("h1")?.innerText.trim()
    || "Unknown Source";

  function isAnswerSignature(text) {
    return /^[A-Z](,\s*[A-Z])*$/.test(text.trim());
  }

  for (let i = 0; i < sides.length; i += 2) {
    let side1 = sides[i]?.innerText.trim();
    let side2 = sides[i + 1]?.innerText.trim();
    if (!side1 || !side2) continue;

    let rawQuestion, rawAnswer;
    if (isAnswerSignature(side1)) {
      rawAnswer = side1;
      rawQuestion = side2;
    } else if (isAnswerSignature(side2)) {
      rawAnswer = side2;
      rawQuestion = side1;
    } else {
      rawQuestion = side1;
      rawAnswer = side2;
    }

    let term = rawQuestion;
    let definition = rawAnswer;

    if (isAnswerSignature(rawAnswer)) {
      const letters = rawAnswer.split(",").map(x => x.trim());
      let questionLines = rawQuestion.split("\n").map(x => x.trim()).filter(x => x);
      let mainQuestionLines = questionLines.filter(line => !/^[A-Z][\.\)]/.test(line));
      let mainQuestion = mainQuestionLines.join(" ");

      let options = [];
      for (let line of questionLines) {
        if (/^[A-Z][\.\)]/.test(line)) {
          options.push({ letter: line[0], content: line.substring(2).trim() });
        }
      }

      let mappedAnswers = letters
        .map(letter => {
          const found = options.find(o => o.letter === letter);
          return found ? found.content : null;
        })
        .filter(Boolean);

      if (mappedAnswers.length > 0) {
        definition = mappedAnswers.join("   ");
        term = mainQuestion;
      }
    }

    results.push({ term, definition });
  }

  const finalResult = {
    Source: sourceTitle,
    Data: results
  };

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
  alert(`✅ Đã lấy ${results.length} câu hỏi từ: ${sourceTitle} (đã copy vào clipboard)`);
})();
