# Developing the Wanderweg site

Technical notes for anyone changing how the site works or looks. To edit the words and photos, see [README.md](README.md).

## The short version

- **Jekyll on GitHub Pages**, built by GitHub from the `main` branch. There's no build step of our own and no `node_modules`.
- **Content lives in `_data/*.yml` and `_config.yml`. Templates contain no visitor-facing wording** (with the few exceptions listed under [Conventions](#conventions)). The people who update the site aren't developers, so keep it that way.
- **One stylesheet** (`assets/css/styles.css`) driven by CSS custom properties, with automatic dark mode.
- **One script** (`assets/js/questionnaire.js`), plain ES5 with no dependencies, which validates the questionnaire and posts it to Web3Forms.

## Project structure

```
.
├── _config.yml               Site settings: name, email, social links, feature switches
├── _data/                    All page content (one file per area)
│   ├── home.yml              Home page wording and big photos
│   ├── litter.yml            Litter panel: "planning" and "current" versions
│   ├── gallery.yml           Gallery photo list
│   ├── leos.yml              Our Leos section (dog cards)
│   ├── questionnaire.yml     Questionnaire: questions, intro, thank-you page
│   └── navigation.yml        Main menu
├── _layouts/default.html     The page frame used by every page
├── _includes/                Reusable fragments
│   ├── head.html             <head>: SEO tags, fonts, stylesheet
│   ├── header.html           Brand + menu (from navigation.yml)
│   ├── footer.html
│   ├── photo.html            Cropped photo frame (see below)
│   ├── email.html            The large email link
│   └── social-links.html     Facebook / Instagram links, skipped when empty
├── index.html                Home page (also catches old addresses, incl. /our-leos/)
├── questionnaire.html        /questionnaire/ (form generated from questionnaire.yml)
├── questionnaire-thank-you.html  /questionnaire/thank-you/
├── 404.html
├── robots.txt                Generated: blocks everything while hide_from_search is true
├── assets/
│   ├── css/styles.css
│   ├── js/questionnaire.js
│   └── img/                  Photos (subfolders: gallery/, leos/, litter/) and favicon.svg
├── Gemfile                   Only for local previews
└── .editorconfig             Spaces not tabs, LF line endings
```

Each `_data` file and template starts with a comment explaining what it does, so read the top of a file before changing it.

## Running it locally

Requires Ruby 3.x and Bundler.

```sh
bundle install
bundle exec jekyll serve --livereload
```

Open http://localhost:4000. The `github-pages` gem in the `Gemfile` pins the same Jekyll and plugin versions GitHub uses, so what you see locally matches production. `_config.yml` changes need a server restart; everything else reloads automatically. GitHub ignores the `Gemfile` when it builds the site.

## How the pieces fit together

### Pages and data
Every page uses `layout: default`. A page's front matter sets its `title`, `description` (both used by `jekyll-seo-tag`), `permalink`, any `redirect_from` addresses, and optional `scripts:` to load at the end of the body. The page body then reads its content from `site.data.<file>`, usually assigning a short alias at the top (`{% assign h = site.data.home %}`).

### Photos
Always render photos through the include, never with a bare `<img>`:

```liquid
{% include photo.html src="/assets/img/gallop.jpg" alt="…" position="50% 30%" lazy=true class="wide" %}
```

It wraps the image in a fixed 3:2 frame (`.photo`) with `object-fit: cover`, so photos of any shape line up. `position` controls the crop and `lazy` adds `loading="lazy"` (use it for anything below the fold). Data files store only the file name; the template adds the folder.

### Menu
`header.html` loops over `_data/navigation.yml` and sets `aria-current="page"` when an item's `url` matches the current page.

### Litter panel
`litter.yml` keeps both versions side by side; `show` picks one (`planning`, `current`, or `off`). `index.html` reads `litter[litter.show]`, and the `current` version also renders `mother` and `father`. Note that YAML reads `off` as `false`, which works because the template only matches the two strings.

### Our Leos section
Rendered in `index.html` from `_data/leos.yml`, one `<article class="leo">` card per dog. The card always shows `paragraphs.first`; any remaining paragraphs go in a native `<details>` element ("More about …"), so no JavaScript is involved. The whole section is skipped when `dogs` is empty. There used to be a separate `/our-leos/` page; that address and the old Wix dog pages now redirect to the home page.

### Search engines
`hide_from_search` in `_config.yml` makes `robots.txt` disallow everything. Turn it off at launch.

### Old Wix addresses
`jekyll-redirect-from` creates redirect pages from each page's `redirect_from` list. Add old URLs there instead of creating stub pages.

## The questionnaire

This is the only part with real logic.

1. **Form generation.** `questionnaire.html` loops over `sections` → `questions` in `questionnaire.yml` and uses a `{% case q.type %}` block to output each question type. Field `name`s come from each question's `id`; `name` and `address` output several fields with fixed names (`first_name`, `last_name`, `address_1`, …).
2. **The `data-label` contract.** Every element that holds an answer has `data-label="<question text>"`: the input itself for text-like fields, or the wrapping `.choices` div (which also has `data-group="<id>"`) for radio and checkbox groups. Required groups get `data-required`. **This is what the script relies on**, so any new question type must follow it.
3. **Validation** (`validate()`). Checks `[required]` inputs, email format, required groups, and that an "Other" choice has its text filled in. Problems get the `.invalid` class and the first one is scrolled into view.
4. **Sending** (`collect()` + submit handler). Reads every `[data-label]` in page order and posts JSON to `https://api.web3forms.com/submit`: one `"label": "answer"` pair per question, with a `"── Section ──"` key before each section so the email is grouped. `subject` uses the applicant's name, and `replyto` uses the field named `email`. On success, the browser goes to `data-thanks`.
5. **Configuration** is passed through attributes on the `<form>`: `data-access-key`, `data-thanks` and `data-contact-email`. The script has no hard-coded settings.

**About the access key:** a Web3Forms key is public by design. It's in the page source, and it can only send email to the address it was created for. Spam is filtered by Web3Forms.

### Adding a new question type
1. Add a `{% when 'yourtype' %}` block in `questionnaire.html` following the `data-label` contract above.
2. If the value needs special reading, handle it in `collect()` in `questionnaire.js`.
3. Document it in the notes at the top of `_data/questionnaire.yml`.

## Styling

`styles.css` is organised top to bottom as: **design tokens** (`:root` custom properties, then the dark-mode override) → Base → Header → Photos → Buttons → Hero → page sections → Questionnaire → Footer → **Smaller screens** (all media queries live at the bottom).

- **Use the tokens.** Never write a raw colour outside `:root`. Every colour has a light and a dark value, so a hard-coded colour breaks dark mode.
- **Fonts**: `--display` (Young Serif) for headings, `--body` (Figtree), `--mono` (IBM Plex Mono) for small labels and tags. They're loaded from Google Fonts in `_includes/head.html`. Update that URL if you change weights.
- **Layout**: content sits in `.wrap` (max `--wrap` wide). Sections are `section.block`; two-column layouts are CSS grid and collapse to one column at 860px, with further simplification at 560px.
- **Class names** are short and scoped by section (`.season`, `.leo`, `.fit`, `.qa`). There's no framework or naming scheme beyond that, so match what's nearby.
- **Accessibility features to keep**: the skip link, visible `:focus-visible` outlines, `prefers-reduced-motion` handling, labels on every input, and alt text on every photo.

## Conventions

- **No visitor-facing wording in templates.** Put it in the matching `_data` file, with a comment explaining it. The current exceptions are small structural labels: "Mother"/"Father" on the litter panel, "More about <name>" on the dog cards, the social-links sentence on the litter panel, the sub-labels of the name and address fields, "Skip to content", and the 404 page (which owners can edit directly).
- **Every `_data` file starts with a comment block** explaining each key in plain English. Update it when you add a key, since it's the owners' documentation.
- **Settings used in more than one place belong in `_config.yml`** (email, social links, memberships) and are always read from `site.*`, never repeated.
- **Use `relative_url`** for every internal link and asset, so the site works at any `baseurl`.
- **Only GitHub Pages' supported plugins** can be used, since GitHub builds the site in safe mode. Custom Ruby plugins in `_plugins/` will be ignored.
- **Formatting**: 2-space indentation and LF line endings (see `.editorconfig`). Keep the "boxed" comment style at the top of files.

## Adding things

**A new section on the home page:** add its wording under a new key in `_data/home.yml` (with `eyebrow`, `title`, `text` to match the others), add a `<section class="block" id="…">` to `index.html`, add styles under "Sections" in the CSS, and add a menu entry in `navigation.yml` if it should be linked.

**A new page:** create `my-page.html` with front matter (`layout: default`, `title`, `description`, `permalink: /my-page/`), put its content in `_data/my-page.yml`, start the body with `<section class="pagehead">` like the other pages, and add it to `navigation.yml`. The sitemap picks it up automatically.

**A new setting:** add it to `_config.yml` with a comment above it, in the top section if owners should change it or under "Technical settings" if not.

## Deployment

Pushing to `main` deploys. GitHub Pages builds the site ("pages build and deployment" in Actions). If a build fails, the previous version stays live.

The domain setup (DNS records, `CNAME`, `url`, `hide_from_search`) is covered in the README under [First-time setup and launch](README.md#first-time-setup-and-launch).

## External services

| Service | Used for | Where it's configured |
|---|---|---|
| GitHub Pages | Hosting and building | Repository **Settings → Pages** |
| Web3Forms | Emailing questionnaire responses | `web3forms_access_key` in `_config.yml` |
| Google Fonts | Young Serif, Figtree, IBM Plex Mono | `_includes/head.html` |
