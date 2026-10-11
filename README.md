# Wanderweg Leonbergers website

The website for [wanderweg.ca](https://wanderweg.ca). It is built with Jekyll and hosted free on GitHub Pages.

**You never need to edit HTML.** Everything you'll want to change is in a few plain text files. Edit them right on github.com: open the file, click the **pencil icon**, make your change, then click **Commit changes**. The live site updates by itself within a minute or two.

---

## Where things are

| To change… | Edit this file |
|---|---|
| The litter announcement (e.g. "Spring 2027") | `_data/litter.yml` |
| Gallery photos | `_data/gallery.yml`, and upload photos to `assets/img/gallery/` |
| Any wording on the home page | `_data/home.yml` |
| The questionnaire questions | `_data/questionnaire.yml` |
| Email address, Facebook, Instagram, club memberships | `_config.yml` |
| Hide the site from Google, or show it again | `hide_from_search` in `_config.yml` |
| Colours | the top of `assets/css/styles.css` |

The other files make the pages work, and you can leave them alone:
- `index.html` (the home page)
- `questionnaire.html`
- `_layouts/` and `_includes/` (page parts shared by every page)
- `assets/js/` (the questionnaire's checks and sending)
- `apps-script/` (the Google script that emails you responses)

### Rules for editing `.yml` files

- **Keep the indentation (the spaces at the start of lines) exactly as it is.** Use spaces, never tabs.
- Put text in "double quotes". If your text contains a double quote itself, use curly quotes (“ ”) instead.
- Lines starting with `#` are notes to you and don't appear on the site.
- If the site stops updating after an edit, go to the **Actions** tab on GitHub. A red ✗ means there's a typo, usually indentation. Click it to see the line number.

---

## Common updates

### Update the litter announcement
Open `_data/litter.yml` and change `when`, `title` and the paragraphs. To hide the panel completely, set `show: false`. There's an example at the bottom of the file for when puppies arrive.

### Add a gallery photo
1. Resize the photo to about 1400 pixels wide. Phone photos are much bigger than needed and make the page slow.
2. In `assets/img/gallery/`, click **Add file → Upload files** and upload it. Use a simple name like `riley-beach.jpg`, with no spaces.
3. In `_data/gallery.yml`, add:
   ```yaml
   - file: riley-beach.jpg
     alt: "Riley running on the beach"
   ```
The grid looks tidiest with a multiple of 3 photos.

### Remove a gallery photo
Delete its lines from `_data/gallery.yml`. You can also delete the photo file itself, but you don't have to.

### Change a big photo (top of page, About, Puppies)
Upload the new photo to `assets/img/`. Then in `_data/home.yml`, change the matching `photo:` file name and its `photo_alt:` description.

### Add or change a questionnaire question
Open `_data/questionnaire.yml`. The notes at the top explain every option. Copy an existing question that's similar to what you want, then change its `id` and `label`. The emails and the Google Sheet pick up new questions automatically, so the Google script never needs changing for this.

---

## First-time setup

### 1. Turn on GitHub Pages
The site lives in the repository `wanderweg-leos/wanderweg-leos.github.io`.

1. In the repository, go to **Settings → Pages**. Under "Build and deployment", choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then click **Save**.
2. After a minute or two, the site is live at **https://wanderweg-leos.github.io**. Use this address to check everything before switching the real domain over.

### 2. Connect the questionnaire
Follow [`apps-script/SETUP.md`](apps-script/SETUP.md). It takes about 15 minutes.

### 3. Point wanderweg.ca at the new site
Do this last, when you're happy with the site. It replaces the Wix site.

1. On GitHub, go to **Settings → Pages → Custom domain**. Enter `wanderweg.ca` and click **Save**. GitHub adds a `CNAME` file to the repository for you.
   Also, in `_config.yml`, change `url:` to `"https://wanderweg.ca"` and `hide_from_search:` to `false`, so Google can list the site again.
2. Wherever your domain's DNS is managed (Wix, if you bought the domain through Wix), replace the website records with these:

   | Type | Name / Host | Value |
   |---|---|---|
   | A | @ | 185.199.108.153 |
   | A | @ | 185.199.109.153 |
   | A | @ | 185.199.110.153 |
   | A | @ | 185.199.111.153 |
   | AAAA | @ | 2606:50c0:8000::153 |
   | AAAA | @ | 2606:50c0:8001::153 |
   | AAAA | @ | 2606:50c0:8002::153 |
   | AAAA | @ | 2606:50c0:8003::153 |
   | CNAME | www | wanderweg-leos.github.io |

   **Don't touch any MX or TXT records.** Those control your email.
3. DNS changes can take up to a day. When GitHub shows the domain as working, tick **Enforce HTTPS**.
4. Old Wix links like `/puppies`, `/photos` and `/blog` automatically forward to the right place on the new home page. `/questionnaire` keeps the same address.

### Optional: preview on your own computer
You only need this if you want to see changes before publishing. Install Ruby and Bundler, then in this folder run:

```
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000.
