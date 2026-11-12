# Developing the Wanderweg site

Technical notes for anyone changing how the site works or looks. To edit the words and photos, see [README.md](README.md).

## The short version

- **Jekyll on GitHub Pages**, built by GitHub from the `main` branch. There's no build step of our own and no `node_modules`.
- **Content lives in `_data/*.yml` and `_config.yml`. Templates contain no visitor-facing wording** (with the few exceptions listed under [Conventions](#conventions)). The people who update the site aren't developers, so keep it that way.
- **One stylesheet** (`assets/css/styles.css`) driven by CSS custom properties.
- **Two scripts**, plain ES5 with no dependencies: `assets/js/site.js` (phone menu and the About page photo viewer, on every page) and `assets/js/application.js` (the step-by-step puppy application, which posts to Web3Forms).

## Project structure

```
.
├── _config.yml               Site settings: name, email, social links, feature switches
├── _data/                    All page content (one file per area)
│   ├── home.yml              Home page wording and big photo
│   ├── about.yml             About page: story, commitments, "Is a Leo right for you?"
│   ├── puppies.yml           Puppies page: included, steps, common questions
│   ├── litter.yml            Litter card: "planning" and "current" versions
│   ├── gallery.yml           Gallery photo list (About page)
│   ├── leos.yml              Our Leos page and dog pages
│   ├── application.yml       Application: questions, intro, wording, thank-you page
│   ├── blog.yml              Blog archive wording (archive page, post notes, footer link)
│   └── navigation.yml        Main menu (also the footer's page links)
├── _layouts/default.html     The page frame used by every page
├── _layouts/post.html        Frame for an old blog post (inside default)
├── _layouts/leo.html         Our Leos page and each dog's page (inside default)
├── our-leos/                 index.html (/our-leos/) + one small file per dog (data in leos.yml)
├── _includes/                Reusable fragments
│   ├── head.html             <head>: SEO tags, fonts, stylesheet
│   ├── header.html           Brand + menu (from navigation.yml), Menu button on phones
│   ├── footer.html           Name, memberships, page links, social links, blog archive
│   ├── photo.html            Photo frame (see below)
│   ├── video.html            Video player for the old blog posts
│   ├── email.html            The large email link
│   └── social-links.html     Facebook / Instagram links, skipped when empty
├── index.html                Home page
├── about.html                /about/
├── puppies.html              /puppies/
├── apply.html                /apply/ (form generated from application.yml)
├── apply-thank-you.html      /apply/thank-you/
├── 404.html
├── blog_archive.html         /blog_archive/ (list of old blog posts, linked from the footer)
├── _posts/                   The 389 old Wix blog posts (2009–2023), one HTML file each
├── robots.txt                Generated: blocks everything while hide_from_search is true
├── assets/
│   ├── css/styles.css
│   ├── js/site.js
│   ├── js/application.js
│   └── img/favicon.svg       The only image kept here; every photo is in the media repo
├── Gemfile                   Only for local previews
└── .editorconfig             Spaces not tabs, LF line endings
```

Photos and videos are **not** in this repository. They live in [`wanderweg-leos/media`](https://github.com/wanderweg-leos/media), a separate repository that GitHub Pages publishes as a project site at `/media/` on the same domain (see [Media repository](#media-repository)).

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
Every page uses `layout: default`. A page's front matter sets its `title`, `description` (both used by `jekyll-seo-tag`), `permalink`, and optional `scripts:` to load at the end of the body. The page body then reads its content from `site.data.<file>`, usually assigning a short alias at the top (`{% assign h = site.data.home %}`).

### Photos
Always render photos through the include, never with a bare `<img>`:

```liquid
{% include photo.html src="/media/img/gallop.jpg" alt="…" position="50% 30%" lazy=true class="wide" %}
```

It wraps the image in a `<figure class="frame">` with `object-fit: cover`. The frame has no shape of its own: the surrounding CSS sets it (`aspect-ratio` or a fixed height), so the same include works for the hero, the tall About photo and the square gallery tiles. `class` adds extra classes (e.g. `tall`), `position` controls the crop and `lazy` adds `loading="lazy"` (use it for anything below the fold). Data files store only the file name; the template adds the folder. Inside a link or button, write the `<span class="frame"><img …></span>` by hand instead, since a `<figure>` isn't allowed there.

### Menu
`header.html` loops over `_data/navigation.yml` and sets `aria-current="page"` when the page's URL equals an item's `url`, or starts with it (so `/our-leos/riley/` marks "Our Leos"; "Home" only matches `/`). `highlight: true` makes the item the button on the right (`.nav-q`). Below 860px the menu folds behind the Menu button, handled by `site.js`. The footer lists the same items (except Home), using `footer_label` when set.

### Litter card
`litter.yml` keeps both versions side by side; `show` picks one (`planning`, `current`, or `off`). `puppies.html` reads `litter[litter.show]` for the card (`#litter`); the `current` version shows the `mother` and `father` photos, and the `planning` version shows `planning_photos` from `puppies.yml`. `index.html` reads the same `label` and `when` for the tag on the hero photo. Note that YAML reads `off` as `false`, which works because the templates only match the two strings.

### Our Leos pages
`_layouts/leo.html` renders the whole Our Leos page: the page head, a row of `.dog-pick` cards linking to every dog's page, then one `.dog-panel` (story, `lives`/`loves` facts, and the `clearances` table of `test`/`by`/`result`). Each dog's page is a tiny file in `our-leos/<id>.html` whose front matter sets `dog: <id>`, `title`, `permalink` and `layout: leo`; the layout looks the dog up with `where: "id", page.dog` and marks its card with `aria-current="page"`. `our-leos/index.html` has no `dog`, so the layout falls back to the first dog. GitHub Pages can't generate pages from data in safe mode, which is why each dog needs its stub file. No JavaScript is involved.

### Search engines
`hide_from_search` in `_config.yml` makes `robots.txt` disallow everything. Turn it off at launch.

### Old Wix addresses
Deliberately not kept: there are no redirects and no `jekyll-redirect-from` plugin. Old Wix links such as `/riley` go to the 404 page (`/puppies` happens to match the new Puppies page). The pre-launch `/questionnaire/` address was renamed to `/apply/` without a redirect, for the same reason. Don't add redirects back; long-term upkeep of old links isn't worth it.

### Blog archive
The old Wix blog was copied into `_posts/` in October 2026. It's an archive: new updates go on Facebook and Instagram, and the archive is linked only from the footer.
- **Posts** are `_posts/YYYY-MM-DD-<slug>.html`. Their front matter has `title`, `date`, `description`, `image` (for sharing), `thumb` (archive thumbnail), and optionally `missing_photos: <n>` and `lost_video: true` for photos and videos that were already broken on Wix. The body is plain HTML with `<figure class="post-photo">` for each photo.
- **Addresses:** `permalink: /post/:title/` in `_config.yml` gives each post the address `/post/<slug>/`. The `posts` default there sets `layout: post`.
- **Photos** are in `img/blog/<slug>/` in the media repo, at full size and their natural shape. Where the old Blogger blog had a larger copy than Wix, the Blogger original is used. Archive thumbnails (`thumb:`) are separate small copies in `img/blog-thumbs/<slug>.jpg`, so the archive list doesn't load hundreds of full-size photos. They're deliberately not passed through `photo.html`, because cropping to 3:2 would cut off portrait shots.
- **Videos** (six old home videos) are `video/blog/<name>.mp4` in the media repo, each with a `<name>.jpg` still, shown with `{% include video.html file="<name>" %}`.
- **Wording** is in `_data/blog.yml`. Styles are under "Blog archive" in `styles.css`.

### Media repository
All photos and videos are in [`wanderweg-leos/media`](https://github.com/wanderweg-leos/media), laid out as `img/…` and `video/…` with a `.nojekyll` file so GitHub serves it as-is. Because it's a project site under the same GitHub account, Pages serves it at `/media/` on whatever domain the main site uses (`wanderweg-leos.github.io/media/` now, `wanderweg.ca/media/` after launch). So templates refer to photos with ordinary site paths: `'/media/img/' | append: file | relative_url`. There's no absolute URL to update when the domain changes.

- **Never add a `media/` folder or page to this repo**, or it will collide with the project site.
- **Local preview:** clone the media repo into `media/` inside this folder. It's in `.gitignore`, and Jekyll copies it into `_site/` so the preview shows photos. The first build is slow because of the full-size blog photos.
- Pages limits apply to each repository separately (1 GB published site). The media repo is around 750 MB, mostly full-size blog photos.

## The application

This is the only part with real logic.

1. **Form generation.** `apply.html` loops over `sections` → `questions` in `application.yml`. Each section becomes a `<div class="q-section" data-title="…">`, and a `{% case q.type %}` block outputs each question type. Field `name`s come from each question's `id`; `name` and `address` output several fields with fixed names (`first_name`, `last_name`, `address_1`, …). Questions without `required` get an "(optional)" marker. A checkbox with a single option gets the class `single` (a "please confirm" box).
2. **The `data-label` contract.** Every element that holds an answer has `data-label="<question text>"`: the input itself for text-like fields, or the wrapping `.choices` div (which also has `data-group="<id>"`) for radio and checkbox groups. Required groups get `data-required`. Every question is wrapped in (or is) a `.field`, which is where errors are shown. **This is what the script relies on**, so any new question type must follow it.
3. **Steps.** `application.js` shows one `.q-section` at a time, with "Part n of N" and a progress bar. "Next" runs `validate(step)` on the current part only. After the last part, a review screen (`.q-review`) is built from the same `[data-label]` elements, with an Edit button per part; after editing, the Next button reads "Review answers" and goes straight back.
4. **Validation** (`validate()`). Checks `[required]` inputs, email format, required groups, and that an "Other" choice has its text filled in. A problem gets the `.invalid` class on its `.field` and a `.field-error` message underneath (linked with `aria-describedby`); the first one is scrolled to and focused. Fixing the answer clears it.
5. **Saving.** Every change saves all answers and the current part to `localStorage` (`wanderweg-application`), and they're restored on the next visit. "Clear my answers" empties the form and the saved copy, and a successful send clears it too. Storage calls are wrapped in `try`, since some browsers block them.
6. **Sending** (`collect()` + submit handler). Reads every `[data-label]` in page order and posts JSON to `https://api.web3forms.com/submit`: one `"label": "answer"` pair per question, with a `"── Part ──"` key before each part so the email is grouped. `subject` uses the applicant's name, and `replyto` uses the field named `email`. On success, the browser goes to `data-thanks`.
7. **Configuration** is passed through attributes on the `<form>`: `data-access-key`, `data-thanks`, `data-contact-email`, and the button and heading wording (`data-next`, `data-review`, `data-review-title`, `data-review-text`, `data-edit`) from `application.yml`. The script has no hard-coded settings.

**Spam trap:** the form has a hidden `botcheck` field (class `.trap`, moved off screen). People never fill it in; if it has a value, the script skips sending and goes straight to the thank-you page. It has no `data-label`, so it never appears in the email.

**About the access key:** a Web3Forms key is public by design. It's in the page source, and it can only send email to the address it was created for. Spam is filtered by Web3Forms.

### Adding a new question type
1. Add a `{% when 'yourtype' %}` block in `apply.html` following the `data-label` contract above.
2. If the value needs special reading, handle it in `valueOf()` in `application.js` (used by both the review screen and the email).
3. Document it in the notes at the top of `_data/application.yml`.

## Styling

`styles.css` is organised top to bottom as: **design tokens** (`:root` custom properties) → Base → Labels and buttons → Photos → Header → Page sections → Puppies → About → Our Leos → Apply → Thank-you page → Blog archive → Footer → **Smaller screens** (all media queries live at the bottom).

- **The look**: ivory paper, warm ink, umber accents, hairline rules and square edges. Keep corners square and borders 1px.
- **Use the tokens.** Never write a raw colour outside `:root` (the two small tick icons are data-URI SVGs and carry their colour inline; change them with the tokens).
- **Fonts**: `--serif` (Cormorant Garamond) for headings and large figures, `--sans` (EB Garamond) for body text. Small labels are uppercase, letter-spaced `--sans`. They're loaded from Google Fonts in `_includes/head.html`. Update that URL if you change weights.
- **Layout**: content sits in `.wrap` (max `--wrap` wide). A page starts with `section.page-head`; later sections are `section.sec` (`.sec-last` on the final one adds bottom space). Two-column rows are `.split`. Grids drop columns at 980px, the menu folds at 860px, and everything goes to one column at 640px.
- **Class names** are short and scoped by section (`.hero`, `.litter-card`, `.dog-panel`, `.q-section`). There's no framework or naming scheme beyond that, so match what's nearby.
- **No dark mode.** The previous design had one; this one is deliberately light only (`color-scheme: light`).
- **Accessibility features to keep**: the skip link, visible `:focus-visible` outlines, `prefers-reduced-motion` handling, labels on every input, errors linked to their inputs, and alt text on every photo.

## Conventions

- **No visitor-facing wording in templates.** Put it in the matching `_data` file, with a comment explaining it. The current exceptions are small structural labels: "Mother"/"Father" and the social-links sentence on the litter card, the sub-labels of the name and address fields, "(optional)", "Required question" and the Email / Follow along / Where labels on the Apply page, the "Members of …" line (built from `site.memberships`), "Menu"/"Close" and the photo viewer buttons, "Part n of N", "Review" and the error messages in `application.js`, "Skip to content", and the 404 page (which owners can edit directly).
- **Every `_data` file starts with a comment block** explaining each key in plain English. Update it when you add a key, since it's the owners' documentation.
- **Settings used in more than one place belong in `_config.yml`** (email, social links, memberships) and are always read from `site.*`, never repeated.
- **Use `relative_url`** for every internal link and asset, so the site works at any `baseurl`.
- **Only GitHub Pages' supported plugins** can be used, since GitHub builds the site in safe mode. Custom Ruby plugins in `_plugins/` will be ignored.
- **Formatting**: 2-space indentation and LF line endings (see `.editorconfig`). Keep the "boxed" comment style at the top of files.

## Adding things

**A new section on a page:** add its wording under a new key in that page's `_data` file (with `eyebrow`, `title`, `text` to match the others), add a `<section class="sec" id="…">` to the page, and add styles under that page's heading in the CSS.

**A new page:** create `my-page.html` with front matter (`layout: default`, `title`, `description`, `permalink: /my-page/`), put its content in `_data/my-page.yml`, start the body with `<section class="page-head">` like the other pages, and add it to `navigation.yml` (it then appears in the footer too). The sitemap picks it up automatically.

**A new setting:** add it to `_config.yml` with a comment above it, in the top section if owners should change it or under "Technical settings" if not.

## Deployment

Pushing to `main` deploys. GitHub Pages builds the site ("pages build and deployment" in Actions). If a build fails, the previous version stays live. The media repo deploys the same way, independently; push new photos there before (or with) the change here that uses them.

The domain setup (DNS records, `CNAME`, `url`, `hide_from_search`) is covered in the README under [First-time setup and launch](README.md#first-time-setup-and-launch).

## External services

| Service | Used for | Where it's configured |
|---|---|---|
| GitHub Pages | Hosting and building (site and media repos) | **Settings → Pages** in each repository |
| Web3Forms | Emailing puppy applications | `web3forms_access_key` in `_config.yml` |
| Google Fonts | Cormorant Garamond, EB Garamond | `_includes/head.html` |
