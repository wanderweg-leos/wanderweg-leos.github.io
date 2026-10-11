/*
  Puppy questionnaire: checks the answers, then sends them to the
  Google Apps Script set in _config.yml (questionnaire_endpoint).
  The questions themselves are in _data/questionnaire.yml, so this
  file normally never needs editing.
*/
(function () {
  var form = document.getElementById('q');
  if (!form) return;

  var endpoint = form.getAttribute('data-endpoint');
  var errBox = document.getElementById('q-err');
  var sentBox = document.getElementById('q-sent');
  var submitBtn = document.getElementById('q-submit');
  var contactEmail = (document.querySelector('.email-big a') || {}).textContent || 'us';
  var startedAt = Date.now();

  function mark(el, bad) { el.classList.toggle('invalid', bad); }

  // Typing in an "Other" box ticks its choice.
  form.querySelectorAll('.other-text').forEach(function (box) {
    box.addEventListener('input', function () {
      var choice = box.closest('label').querySelector('input[type=radio], input[type=checkbox]');
      if (box.value.trim()) choice.checked = true;
    });
  });

  // Clear the highlight as soon as someone fixes an answer.
  function clear(e) {
    var group = e.target.closest('[data-group]');
    mark(group || e.target, false);
  }
  form.addEventListener('input', clear);
  form.addEventListener('change', clear);

  function otherText(group) {
    var box = group.querySelector('.other-text');
    return box ? box.value.trim() : '';
  }

  function validate() {
    var problems = [];
    form.querySelectorAll('input[required], select[required], textarea[required]').forEach(function (el) {
      var v = el.value.trim();
      var bad = !v || (el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v));
      mark(el, bad);
      if (bad) problems.push(el);
    });
    form.querySelectorAll('[data-group]').forEach(function (group) {
      var checked = group.querySelectorAll('input:checked');
      var otherChosen = group.querySelector('label.other input:checked');
      var bad = (group.hasAttribute('data-required') && !checked.length) ||
                (otherChosen && !otherText(group));
      mark(group, bad);
      if (bad) problems.push(group);
    });
    return problems;
  }

  // Answers in page order, with their section, question and value.
  function collect() {
    var answers = [];
    form.querySelectorAll('[data-label]').forEach(function (el) {
      var section = el.closest('fieldset').querySelector('legend').textContent.trim();
      var value;
      if (el.hasAttribute('data-group')) {
        value = Array.prototype.map.call(el.querySelectorAll('input:checked'), function (i) {
          return i.value === 'Other' ? 'Other: ' + otherText(el) : i.value;
        }).join(', ');
      } else {
        value = el.value.trim();
      }
      answers.push({
        id: el.getAttribute('data-group') || el.name,
        section: section,
        label: el.getAttribute('data-label'),
        value: value
      });
    });
    return answers;
  }

  function showError(msg) {
    errBox.textContent = msg;
    errBox.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    errBox.hidden = true;

    var problems = validate();
    if (problems.length) {
      showError('Please answer the ' + problems.length + ' highlighted question' +
        (problems.length > 1 ? 's' : '') + ' before submitting.');
      var first = problems[0];
      first.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
      var focusable = first.matches('input, select, textarea') ? first : first.querySelector('input');
      if (focusable) focusable.focus({ preventScroll: true });
      return;
    }

    if (!endpoint) {
      showError('The questionnaire is not connected yet. Please email ' + contactEmail + ' instead.');
      return;
    }

    var payload = {
      answers: collect(),
      email: form.elements.email ? form.elements.email.value.trim() : '',
      first_name: form.elements.first_name ? form.elements.first_name.value.trim() : '',
      last_name: form.elements.last_name ? form.elements.last_name.value.trim() : '',
      website: form.elements.website.value,
      started: startedAt
    };

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    // text/plain avoids a browser pre-check that Google Apps Script can't answer.
    fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        if (!result || !result.ok) {
          // A message written by the script (e.g. "Please enter a valid email address.")
          var err = new Error((result && result.error) || '');
          err.fromScript = true;
          throw err;
        }
        form.hidden = true;
        sentBox.hidden = false;
        sentBox.focus();
        sentBox.scrollIntoView({ block: 'center' });
      })
      .catch(function (err) {
        var msg = (err && err.fromScript && err.message)
          ? err.message
          : 'Sorry, your answers could not be sent. Please try again in a minute, or email ' + contactEmail + '.';
        showError(msg);
        submitBtn.disabled = false;
        submitBtn.textContent = 'Submit questionnaire';
      });
  });
})();
