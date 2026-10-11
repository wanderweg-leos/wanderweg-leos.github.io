/*
  Puppy questionnaire: checks the answers, then sends them to
  Web3Forms (web3forms.com), which emails them to you. The access key
  is set in _config.yml (web3forms_access_key).
  The questions themselves are in _data/questionnaire.yml, so this
  file normally never needs editing.

  How it works (details in DEVELOPING.md):
    1. questionnaire.html builds the form. Every answer field (or group of
       radio buttons / checkboxes) has data-label="<the question>".
    2. On submit, validate() highlights unanswered required questions.
    3. collect() reads every [data-label] element in page order, and the
       answers are posted to Web3Forms as "question: answer" pairs, with a
       "── Section ──" line before each section.
    4. On success the visitor is sent to the thank-you page.

  Settings come from attributes on the <form>:
    data-access-key     Web3Forms key (from _config.yml)
    data-thanks         thank-you page address
    data-contact-email  shown in error messages (from _config.yml)
*/
(function () {
  var form = document.getElementById('q');
  if (!form) return;

  var accessKey = form.getAttribute('data-access-key');
  var errBox = document.getElementById('q-err');
  var thanksUrl = form.getAttribute('data-thanks');
  var submitBtn = document.getElementById('q-submit');
  var contactEmail = form.getAttribute('data-contact-email') || 'us';
  var submitLabel = submitBtn.textContent;

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

    if (!accessKey) {
      showError('The questionnaire is not connected yet. Please email ' + contactEmail + ' instead.');
      return;
    }

    var email = form.elements.email ? form.elements.email.value.trim() : '';
    var firstName = form.elements.first_name ? form.elements.first_name.value.trim() : '';
    var lastName = form.elements.last_name ? form.elements.last_name.value.trim() : '';
    var name = (firstName + ' ' + lastName).trim();

    // The email lists the answers in this order, labelled with each question.
    var payload = {
      access_key: accessKey,
      subject: 'Puppy questionnaire: ' + (name || email || 'new response'),
      from_name: 'Wanderweg website',
      replyto: email
    };
    var currentSection = '';
    collect().forEach(function (a) {
      if (a.section !== currentSection) {
        currentSection = a.section;
        payload['── ' + a.section + ' ──'] = '';
      }
      var key = a.label, n = 2;
      while (key in payload) key = a.label + ' (' + n++ + ')';
      payload[key] = a.value || '—';
    });

    submitBtn.disabled = true;
    submitBtn.textContent = 'Sending…';

    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (res) { return res.json(); })
      .then(function (result) {
        if (!result || !result.success) {
          throw new Error((result && (result.message || (result.body && result.body.message))) || 'not sent');
        }
        location.href = thanksUrl;
      })
      .catch(function (err) {
        if (window.console) console.warn('Questionnaire not sent:', err && err.message);
        showError('Sorry, your answers could not be sent. Please try again in a minute, or email ' + contactEmail + '.');
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      });
  });
})();
