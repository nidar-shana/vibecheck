const HISTORY_KEY = 'vibecheck-history';
const moods = {
  good: { label: 'Good', icon: '☺' },
  okay: { label: 'Okay', icon: '◡' },
  bad: { label: 'Not great', icon: '☹' }
};

const feedback = document.querySelector('#checkin-feedback');
const historyList = document.querySelector('#history-list');
const weekGrid = document.querySelector('#week-grid');
let history = loadHistory();

function announce(message, isError = false) {
  feedback.textContent = message;
  feedback.style.color = isError ? '#b45e67' : '';
}

function loadHistory() {
  let saved;
  try {
    saved = localStorage.getItem(HISTORY_KEY);
  } catch (error) {
    console.error('Unable to access saved check-ins.', error);
    announce('Your browser storage is unavailable, so check-ins cannot be saved.', true);
    return [];
  }

  if (!saved) return [];

  try {
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) throw new TypeError('Saved check-ins are not a list.');
    return parsed.filter((item) => (
      item
      && moods[item.mood]
      && typeof item.createdAt === 'string'
      && !Number.isNaN(new Date(item.createdAt).getTime())
    ));
  } catch (error) {
    console.error('Unable to read saved check-ins.', error);
    announce('We couldn’t read your saved check-ins. New check-ins can still be added.', true);
    return [];
  }
}

function dateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getDayStart(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function renderWeek() {
  const today = getDayStart(new Date());
  const start = new Date(today);
  start.setDate(start.getDate() - 6);
  const counts = new Map();

  history.forEach((item) => {
    const key = dateKey(new Date(item.createdAt));
    counts.set(key, (counts.get(key) || 0) + 1);
  });

  weekGrid.replaceChildren();
  let total = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(start);
    day.setDate(start.getDate() + offset);
    const count = counts.get(dateKey(day)) || 0;
    total += count;

    const dayElement = document.createElement('div');
    dayElement.className = 'week-day';
    if (count > 0) dayElement.classList.add('has-checkin');
    if (dateKey(day) === dateKey(today)) dayElement.classList.add('today');
    dayElement.setAttribute(
      'aria-label',
      `${day.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}: ${count} ${count === 1 ? 'check-in' : 'check-ins'}`
    );

    const dot = document.createElement('span');
    dot.className = 'day-dot';
    dot.setAttribute('aria-hidden', 'true');
    dot.textContent = count > 0 ? (count > 1 ? String(count) : '✓') : '·';

    const label = document.createElement('span');
    label.setAttribute('aria-hidden', 'true');
    label.textContent = day.toLocaleDateString(undefined, { weekday: 'short' });
    dayElement.append(dot, label);
    weekGrid.append(dayElement);
  }

  document.querySelector('#week-total').textContent = `${total} ${total === 1 ? 'check-in' : 'check-ins'}`;
}

function relativeDate(date) {
  const day = dateKey(date);
  const today = dateKey(new Date());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  if (day === today) return 'Today';
  if (day === dateKey(yesterdayDate)) return 'Yesterday';
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function renderHistory() {
  historyList.replaceChildren();
  const recent = history.slice(0, 3);

  if (recent.length === 0) {
    const empty = document.createElement('p');
    empty.className = 'empty-history';
    empty.textContent = 'Your check-ins will find a home here.';
    historyList.append(empty);
    return;
  }

  recent.forEach((item) => {
    const mood = moods[item.mood];
    const createdAt = new Date(item.createdAt);
    const row = document.createElement('div');
    row.className = 'history-item';

    const icon = document.createElement('span');
    icon.className = `history-mood ${item.mood}`;
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = mood.icon;

    const description = document.createElement('span');
    description.className = 'history-description';
    description.textContent = mood.label;

    const time = document.createElement('time');
    time.className = 'history-time';
    time.dateTime = createdAt.toISOString();
    time.textContent = `${relativeDate(createdAt)} · ${createdAt.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;

    row.append(icon, description, time);
    historyList.append(row);
  });
}

function render() {
  renderWeek();
  renderHistory();
}

document.querySelector('#today-date').textContent = new Date().toLocaleDateString(undefined, {
  weekday: 'long',
  month: 'long',
  day: 'numeric'
}).toUpperCase();

document.querySelectorAll('.mood-option').forEach((button) => {
  button.addEventListener('click', () => {
    const item = { mood: button.dataset.mood, createdAt: new Date().toISOString() };
    const nextHistory = [item, ...history];

    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(nextHistory));
    } catch (error) {
      console.error('Unable to save check-in.', error);
      announce('We couldn’t save that check-in. Please check your browser storage settings.', true);
      return;
    }

    history = nextHistory;
    document.querySelectorAll('.mood-option').forEach((option) => {
      const selected = option === button;
      option.classList.toggle('selected', selected);
      option.setAttribute('aria-pressed', String(selected));
    });
    announce(`Check-in saved. Thanks for sharing how you feel: ${moods[item.mood].label.toLowerCase()}.`);
    render();
  });
});

document.querySelectorAll('.mood-option').forEach((button) => {
  button.setAttribute('aria-pressed', 'false');
});

render();
