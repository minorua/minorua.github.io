
// URLパラメータからリストID取得
function getListId() {
  const params = new URLSearchParams(window.location.search);
  return params.get('id') || 'default';
}

function getStorageKey() {
  return 'random_choices_' + getListId();
}

function getChoices() {
  const data = localStorage.getItem(getStorageKey());
  return data ? JSON.parse(data) : [];
}

function saveChoices(choices) {
  localStorage.setItem(getStorageKey(), JSON.stringify(choices));
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
  // 現在のリストID表示
  let listIdDiv = document.getElementById('list-id');
  if (!listIdDiv) {
    listIdDiv = document.createElement('div');
    listIdDiv.id = 'list-id';
    list.parentElement.insertBefore(listIdDiv, list);
  }
  listIdDiv.textContent = 'リストID: ' + getListId();
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
