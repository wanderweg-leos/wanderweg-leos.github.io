/*
  Apply for a puppy: shows the form one part at a time, checks each part,
  saves answers in the visitor's browser, shows a review screen, then sends
  the answers to Web3Forms (web3forms.com), which emails them to you. The
  access key is set in _config.yml (web3forms_access_key).
  The questions themselves are in _data/application.yml, so this file
  normally never needs editing.

  How it works (details in DEVELOPING.md):
    1. apply.html builds the form: one .q-section per part. Every answer
       field (or group of radio buttons / checkboxes) has
       data-label="<the question>".
    2. "Next" runs validate() on the current part. Problems get the
       .invalid class on their .field and a message underneath.
    3. After the last part comes the review screen, built from the same
       [data-label] elements, with an Edit button per part.
    4. collect() reads every [data-label] element in page order, and the
       answers are posted to Web3Forms as "question: answer" pairs, with a
       "── Part ──" line before each part. A hidden "botcheck" box catches
       spam bots (it has no data-label, so it is never sent).
    5. On success the saved answers are cleared and the visitor is sent to
       the thank-you page.
    Follow-up questions (show_if in the data file) are wrapped in
    <div data-show-if="<id>" data-show-when="Yes|Maybe">. update() shows
    one only while question <id> has one of those answers; hidden
    questions are neither checked nor sent.

  Settings and wording come from attributes on the <form>:
    data-access-key     Web3Forms key (from _config.yml)
    data-thanks         thank-you page address
    data-contact-email  shown in error messages (from _config.yml)
    data-next, data-review, data-review-title, data-review-text, data-edit
                        button and heading wording (from application.yml)
*/
(function () {
  var form = document.getElementById('q');
  if (!form) return;

  var STORE = 'wanderweg-application';
  var accessKey = form.getAttribute('data-access-key');
  var thanksUrl = form.getAttribute('data-thanks');
  var contactEmail = form.getAttribute('data-contact-email') || 'us';
  var words = {
    next: form.getAttribute('data-next'),
    review: form.getAttribute('data-review'),
    reviewTitle: form.getAttribute('data-review-title'),
    reviewText: form.getAttribute('data-review-text'),
    edit: form.getAttribute('data-edit')
  };
  var errBox = document.getElementById('q-err');
  var backBtn = document.getElementById('q-back');
  var nextBtn = document.getElementById('q-next');
  var submitBtn = document.getElementById('q-submit');
  var clearBtn = document.getElementById('q-clear');
  var submitLabel = submitBtn.textContent;
  var privacy = form.querySelector('.privacy');
  var review = form.querySelector('.q-review');
  var topNum = form.querySelector('.q-top b');
  var topName = form.querySelector('.q-top span');
  var bar = form.querySelector('.q-bar span');
  var sections = Array.prototype.slice.call(form.querySelectorAll('.q-section'));
  var REVIEW = sections.length;
  var step = 0, editing = false;
  var smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // Saved answers (this browser only). Wrapped in try, because some
  // browsers block storage in private windows.
  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(STORE, JSON.stringify(v)); } catch (e) {} },
    clear: function () { try { localStorage.removeItem(STORE); } catch (e) {} }
  };

  // Is this element inside a follow-up question that is hidden right now?
  function isHidden(el) {
    var wrap = el.closest('[data-show-if]');
    return !!(wrap && wrap.hidden);
  }

  // The current answer(s) to question <id>, or [] if it is hidden.
  function answersTo(id) {
    var values = [];
    Array.prototype.forEach.call(form.querySelectorAll('[name="' + id + '"]'), function (el) {
      if (isHidden(el)) return;
      if (el.type === 'radio' || el.type === 'checkbox') { if (el.checked) values.push(el.value); }
      else if (el.value) values.push(el.value);
    });
    return values;
  }

  // Show or hide every follow-up question. Runs in page order, so a
  // follow-up of a follow-up also works.
  function update() {
    form.querySelectorAll('[data-show-if]').forEach(function (wrap) {
      var wanted = wrap.getAttribute('data-show-when').split('|');
      var given = answersTo(wrap.getAttribute('data-show-if'));
      wrap.hidden = !given.some(function (v) { return wanted.indexOf(v) !== -1; });
    });
  }

  // Typing in an "Other" box ticks its choice.
  form.querySelectorAll('.other-text').forEach(function (box) {
    box.addEventListener('input', function () {
      var choice = box.closest('label').querySelector('input[type=radio], input[type=checkbox]');
      if (box.value.trim()) choice.checked = true;
    });
  });

  function otherText(group) {
    var box = group.querySelector('.other-text');
    return box ? box.value.trim() : '';
  }

  // ── Errors: shown under the question they belong to ──
  function clearError(field) {
    field.classList.remove('invalid');
    var msg = field.querySelector('.field-error');
    if (msg) msg.remove();
    field.querySelectorAll('input, select, textarea').forEach(function (i) {
      i.removeAttribute('aria-invalid'); i.removeAttribute('aria-describedby');
    });
  }
  function clearAllErrors() {
    form.querySelectorAll('.field.invalid').forEach(clearError);
    errBox.hidden = true;
  }
  var errCount = 0;
  function showFieldError(field, text) {
    if (field.classList.contains('invalid')) return;
    field.classList.add('invalid');
    var id = 'q-err-' + (++errCount);
    var msg = el('span', 'field-error', text);
    msg.id = id;
    field.appendChild(msg);
    field.querySelectorAll('input, select, textarea').forEach(function (i) {
      i.setAttribute('aria-invalid', 'true'); i.setAttribute('aria-describedby', id);
    });
  }
  function fieldOf(node) { return node.closest('.field') || node; }

  form.addEventListener('input', function (e) { var f = e.target.closest('.field.invalid'); if (f) clearError(f); });
  form.addEventListener('change', function (e) { var f = e.target.closest('.field.invalid'); if (f) clearError(f); });

  // Checks one part (or every part when n is undefined). Returns the
  // .field elements with problems, in page order.
  function validate(n) {
    var scope = n === undefined ? form : sections[n];
    var problems = [];
    scope.querySelectorAll('input[required], select[required], textarea[required]').forEach(function (input) {
      if (isHidden(input)) return;
      var v = input.value.trim();
      var field = fieldOf(input);
      if (!v) { showFieldError(field, 'Please answer this question.'); problems.push(field); }
      else if (input.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v)) {
        showFieldError(field, 'Please check your email address. It should look like name@example.com');
        problems.push(field);
      }
    });
    scope.querySelectorAll('[data-group]').forEach(function (group) {
      if (isHidden(group)) return;
      var checked = group.querySelectorAll('input:checked');
      var otherChosen = group.querySelector('label.other input:checked');
      if (group.hasAttribute('data-required') && !checked.length) {
        showFieldError(group, group.classList.contains('single') ? 'Please tick this box to continue.' : 'Please choose an answer.');
        problems.push(group);
      } else if (otherChosen && !otherText(group)) {
        showFieldError(group, 'Please describe your “Other” answer.');
        problems.push(group);
      }
    });
    problems.sort(function (a, b) { return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1; });
    return problems;
  }

  function focusProblem(field) {
    field.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
    var focusable = field.matches('input, select, textarea') ? field : field.querySelector('input, select, textarea');
    if (focusable) focusable.focus({ preventScroll: true });
  }

  // The answer to one [data-label] element, as text.
  function valueOf(node) {
    if (node.hasAttribute('data-group')) {
      return Array.prototype.map.call(node.querySelectorAll('input:checked'), function (i) {
        return i.value === 'Other' ? 'Other: ' + otherText(node) : i.value;
      }).join(', ');
    }
    return node.value.trim();
  }

  // Answers in page order, with their part, question and value.
  function collect() {
    var answers = [];
    form.querySelectorAll('.q-section [data-label]').forEach(function (node) {
      if (isHidden(node)) return;
      answers.push({
        section: node.closest('.q-section').getAttribute('data-title'),
        label: node.getAttribute('data-label'),
        value: valueOf(node)
      });
    });
    return answers;
  }

  // ── Review screen ──
  function buildReview() {
    review.innerHTML = '';
    review.appendChild(el('h2', null, words.reviewTitle));
    review.appendChild(el('p', 'q-review-intro', words.reviewText));
    sections.forEach(function (section, i) {
      var part = el('div', 'q-review-part');
      var head = el('div', 'q-review-head');
      head.appendChild(el('h3', null, section.getAttribute('data-title')));
      var edit = el('button', 'q-edit', words.edit);
      edit.type = 'button';
      edit.setAttribute('aria-label', words.edit + ': ' + section.getAttribute('data-title'));
      edit.addEventListener('click', function () { editing = true; showStep(i, true); });
      head.appendChild(edit);
      part.appendChild(head);
      var dl = el('dl');
      section.querySelectorAll('[data-label]').forEach(function (node) {
        if (isHidden(node)) return;
        dl.appendChild(el('dt', null, node.getAttribute('data-label')));
        dl.appendChild(el('dd', null, valueOf(node) || '—'));
      });
      part.appendChild(dl);
      review.appendChild(part);
    });
  }

  // ── One part at a time ──
  function showStep(n, focus) {
    step = n;
    var onReview = n === REVIEW;
    sections.forEach(function (s, i) { s.hidden = i !== n; });
    review.hidden = !onReview;
    if (onReview) buildReview();
    backBtn.hidden = n === 0;
    nextBtn.hidden = onReview;
    nextBtn.textContent = (editing || n === REVIEW - 1) ? words.review : words.next;
    submitBtn.hidden = !onReview;
    if (privacy) privacy.hidden = !onReview;
    clearAllErrors();
    topNum.textContent = onReview ? 'Review' : 'Part ' + (n + 1) + ' of ' + sections.length;
    topName.textContent = onReview ? '' : sections[n].getAttribute('data-title');
    bar.style.width = Math.round((n + 1) / (sections.length + 1) * 100) + '%';
    save();
    if (focus) {
      var h = (onReview ? review : sections[n]).querySelector('h2');
      h.setAttribute('tabindex', '-1');
      h.focus({ preventScroll: true });
      form.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
    }
  }

  nextBtn.addEventListener('click', function () {
    var problems = validate(step);
    if (problems.length) { focusProblem(problems[0]); return; }
    if (editing || step === REVIEW - 1) {
      var all = validate();
      if (all.length) {
        editing = false;
        var s = sections.indexOf(all[0].closest('.q-section'));
        showStep(s, false); validate(s); focusProblem(validate(s)[0] || all[0]);
        return;
      }
      editing = false;
      showStep(REVIEW, true);
    } else {
      showStep(step + 1, true);
    }
  });
  backBtn.addEventListener('click', function () { editing = false; showStep(step - 1, true); });

  // ── Saving and restoring answers in this browser ──
  function save() {
    var data = { step: step, answers: {} };
    Array.prototype.forEach.call(form.elements, function (input) {
      if (!input.name || input.name === 'botcheck') return;
      if (input.type === 'radio' || input.type === 'checkbox') {
        var list = data.answers[input.name] || (data.answers[input.name] = []);
        if (input.checked) list.push(input.value);
      } else {
        data.answers[input.name] = input.value;
      }
    });
    store.set(data);
  }
  function restore() {
    var data = store.get();
    if (!data || !data.answers) return 0;
    Array.prototype.forEach.call(form.elements, function (input) {
      if (!input.name || !(input.name in data.answers)) return;
      var v = data.answers[input.name];
      if (input.type === 'radio' || input.type === 'checkbox') input.checked = Array.isArray(v) && v.indexOf(input.value) !== -1;
      else if (typeof v === 'string') input.value = v;
    });
    update();
    var s = parseInt(data.step, 10);
    return s >= 0 && s <= REVIEW ? s : 0;
  }
  form.addEventListener('input', save);
  form.addEventListener('change', function () { update(); save(); });
  clearBtn.addEventListener('click', function () {
    form.reset(); store.clear(); update(); editing = false; showStep(0, true);
  });

  update();
  showStep(restore(), false);

  function showError(msg) {
    errBox.textContent = msg;
    errBox.hidden = false;
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (step !== REVIEW) { nextBtn.click(); return; }
    errBox.hidden = true;

    var problems = validate();
    if (problems.length) {
      var s = sections.indexOf(problems[0].closest('.q-section'));
      showStep(s, false); focusProblem(validate(s)[0] || problems[0]);
      return;
    }

    // Spam trap: people never see the hidden "botcheck" box, so if it has
    // anything in it a bot filled in the form. Pretend it worked, send nothing.
    if (form.elements.botcheck && form.elements.botcheck.value) {
      location.href = thanksUrl;
      return;
    }

    if (!accessKey) {
      showError('The application form is not connected yet. Please email ' + contactEmail + ' instead.');
      return;
    }

    var email = form.elements.email ? form.elements.email.value.trim() : '';
    var firstName = form.elements.first_name ? form.elements.first_name.value.trim() : '';
    var lastName = form.elements.last_name ? form.elements.last_name.value.trim() : '';
    var name = (firstName + ' ' + lastName).trim();

    // The email lists the answers in this order, labelled with each question.
    var payload = {
      access_key: accessKey,
      subject: 'Puppy application: ' + (name || email || 'new application'),
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
        store.clear();
        location.href = thanksUrl;
      })
      .catch(function (err) {
        if (window.console) console.warn('Application not sent:', err && err.message);
        showError('Sorry, your application could not be sent, so nothing has been sent. Your answers are still saved here. Please try again in a minute, or email ' + contactEmail + '.');
        submitBtn.disabled = false;
        submitBtn.textContent = submitLabel;
      });
  });
})();
