// main.js
const STORAGE_KEY = 'random_choices';

function getChoices() {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function saveChoices(choices) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(choices));
}

function renderChoices() {
  const list = document.getElementById('choice-list');
  list.innerHTML = '';
  const choices = getChoices();
  choices.forEach((choice, idx) => {
    const li = document.createElement('li');
    li.textContent = choice;
    const delBtn = document.createElement('button');
    delBtn.textContent = '削除';
    delBtn.onclick = () => {
      choices.splice(idx, 1);
      saveChoices(choices);
      renderChoices();
    };
    li.appendChild(delBtn);
    list.appendChild(li);
  });
}

document.getElementById('choice-form').onsubmit = function(e) {
  e.preventDefault();
  const input = document.getElementById('choice-input');
  const value = input.value.trim();
  if (value) {
    const choices = getChoices();
    choices.push(value);
    saveChoices(choices);
    renderChoices();
    input.value = '';
  }
};

document.getElementById('random-btn').onclick = function() {
  const choices = getChoices();
  const resultDiv = document.getElementById('result');
  if (choices.length === 0) {
    resultDiv.textContent = '選択肢がありません。';
    return;
  }
  const idx = Math.floor(Math.random() * choices.length);
  resultDiv.textContent = '選ばれたのは: ' + choices[idx];
};

window.onload = renderChoices;
