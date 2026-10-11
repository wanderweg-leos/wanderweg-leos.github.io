# Wanderweg Leonbergers website

The website for [wanderweg.ca](https://wanderweg.ca): a small family Leonberger kennel in Halifax, Nova Scotia.

- **Home page**: about us, our Leos (the breeding dogs and their health clearances), puppies, the litter announcement, "Is a Leonberger right for you?", photos and contact
- **Puppy questionnaire**: emails each response to the kennel

It's built with [Jekyll](https://jekyllrb.com) and hosted free on [GitHub Pages](https://pages.github.com). There is no database, no server to maintain and nothing to pay for.

> **Editing the words or photos?** Keep reading. You never need to touch HTML.
> **Changing how the site works or looks?** See [DEVELOPING.md](DEVELOPING.md).

---

## Contents

1. [How to make a change](#how-to-make-a-change)
2. [Where things are](#where-things-are)
3. [Common updates](#common-updates)
4. [If something goes wrong](#if-something-goes-wrong)
5. [First-time setup and launch](#first-time-setup-and-launch)
6. [Preview on your own computer](#preview-on-your-own-computer-optional)

---

## How to make a change

Everything you'll want to change is in a few plain text files. Edit them right on github.com:

1. Open the file (see the table below for which one).
2. Click the **pencil icon** ✏️ at the top right of the file.
3. Make your change.
4. Click **Commit changes**, then **Commit changes** again in the box that appears.

The live site updates by itself within a minute or two.

### Rules for editing `.yml` files

Most content lives in `.yml` files. They are easy to read, but fussy about layout:

- **Keep the indentation (the spaces at the start of lines) exactly as it is.** Use spaces, never tabs.
- Put text in "double quotes". If your text contains a double quote itself, use curly quotes (“ ”) instead. Apostrophes (’ or ') are fine.
- Lines starting with `#` are notes to you and don't appear on the site.
- Every `.yml` file has notes at the top explaining what each line does.
- **The easiest way to add something is to copy an existing entry** right next to it, then change the words.

---

## Where things are

| To change… | Edit this file |
|---|---|
| Any wording or big photo on the home page | `_data/home.yml` |
| The litter announcement (e.g. "Spring 2027") | `_data/litter.yml` |
| Gallery photos | `_data/gallery.yml`, and upload photos to `assets/img/gallery/` |
| The dogs in the Our Leos section | `_data/leos.yml`, and upload photos to `assets/img/leos/` |
| The questionnaire questions, its intro and the thank-you page | `_data/questionnaire.yml` |
| The menu at the top of every page | `_data/navigation.yml` |
| Email address, Facebook, Instagram, club memberships | `_config.yml` |
| Hide the site from Google, or show it again | `hide_from_search` in `_config.yml` |
| Colours | the top of `assets/css/styles.css` |
| The "page not found" page | `404.html` (the words are near the top) |

You can leave every other file alone. They make the pages work; [DEVELOPING.md](DEVELOPING.md) explains them.

### Photo folders

| Folder | Holds |
|---|---|
| `assets/img/` | the big photos on the home page and thank-you page |
| `assets/img/gallery/` | the "Life with Leos" gallery |
| `assets/img/leos/` | one photo per dog in the Our Leos section |
| `assets/img/litter/` | the mother and father of the current litter |

**Before uploading any photo:** resize it to about 1400 pixels wide (phone photos are far bigger than needed and make the page slow), and give it a simple name with no spaces, like `riley-beach.jpg`. To upload, open the folder on GitHub and click **Add file → Upload files**.

---

## Common updates

### Update the litter announcement
Open `_data/litter.yml`. The panel has two versions, and both are kept in the file so you never lose your text:

- `planning`: "We are planning our next litter", with no parents shown
- `current`: a confirmed litter with the mother, father and due date

Change `show:` to `planning`, `current` or `off` (hides the panel). Then edit the text in that version. For `current`, upload the parents' photos to `assets/img/litter/` first.

### Add a gallery photo
1. Upload the photo to `assets/img/gallery/`.
2. In `_data/gallery.yml`, add:
   ```yaml
   - file: riley-beach.jpg
     alt: "Riley running on the beach"
   ```
   `alt` is a short description, read aloud to blind visitors. It's required.

The grid looks tidiest with a multiple of 3 photos. If a face gets cropped, add a `position:` line (the notes at the top of the file explain it).

### Remove or reorder gallery photos
Delete an entry's lines, or move them up or down. You can also delete the photo file, but you don't have to.

### Change a big photo (top of page, About, Puppies)
Upload the new photo to `assets/img/`. Then in `_data/home.yml`, change the matching `photo:` file name and its `photo_alt:` description.

### Add, change or remove a dog in Our Leos
Each dog has a card in the Our Leos section of the home page. Upload a photo to `assets/img/leos/`, then in `_data/leos.yml` copy one of the dogs and change the details. Dogs appear in the order listed, three across on computers. Keep each dog's `text` to a sentence or two so the cards stay a similar height.

### Add or change a questionnaire question
Open `_data/questionnaire.yml`. The notes at the top explain every option. Copy an existing question that's similar to what you want, then change its `id` and `label`. Each `id` must be different. The emails pick up new questions automatically.

Don't remove the `name` question or the question with `id: email`: the emails use them for the subject line and the Reply button.

### Change the menu
Open `_data/navigation.yml`. Change a `label` to rename a link, move entries to reorder them, or delete an entry to remove it.

### Change your email address or social links
Edit `email`, `facebook` or `instagram` in `_config.yml`. They update everywhere on the site at once. To remove a social link, set it to `""`.

---

## If something goes wrong

After every change, GitHub rebuilds the site. You can watch this in the repository's **Actions** tab, under **pages build and deployment**:

- ✅ means the change is live.
- ❌ means the site couldn't be published, usually because of a typo in a `.yml` file. Click it to see the file and line number. The live site keeps showing the last working version until it's fixed.

**To undo a change**, open the file on GitHub, click **History**, open the last good version, and copy its text back in. Or ask whoever set up the site: every change is saved, so nothing is ever truly lost.

Common causes:
- **Wrong indentation** in a `.yml` file, or a tab instead of spaces.
- **A missing closing quote** `"` at the end of a line.
- **A photo name that doesn't match exactly.** `Riley.JPG` and `riley.jpg` are different names. The page builds fine but shows an empty grey box where the photo should be.
- **The change hasn't appeared yet.** Wait two minutes, then refresh the page. On a phone, you may need to close and reopen the browser.

---

## First-time setup and launch

The site lives in the GitHub repository `wanderweg-leos/wanderweg-leos.github.io`.

### 1. Turn on GitHub Pages
1. In the repository, go to **Settings → Pages**. Under "Build and deployment", choose **Deploy from a branch**, branch **main**, folder **/ (root)**, then click **Save**.
2. After a minute or two, the site is live at **https://wanderweg-leos.github.io**. Use this address to check everything before switching the real domain over.

### 2. Connect the questionnaire
The questionnaire is sent by [Web3Forms](https://web3forms.com), a free service that emails you each response.

1. Go to [web3forms.com](https://web3forms.com), enter **hello@wanderweg.ca** (or whichever address should receive questionnaires) and click **Create Access Key**.
2. Web3Forms emails you an access key (a long code like `a1b2c3d4-…`).
3. In `_config.yml`, paste it between the quotes on the `web3forms_access_key:` line and commit.
4. Fill in the questionnaire on the live site to test it. The first email can land in spam: mark it "not spam".

Replying to a questionnaire email replies straight to the applicant. To send responses to a different address, create a new key for that address and replace the old one. (The key is visible in the page's code. That's normal for Web3Forms and safe: it can only send email to you.)

### 3. Point wanderweg.ca at the new site
Do this last, when you're happy with the site. It replaces the old Wix site.

1. On GitHub, go to **Settings → Pages → Custom domain**. Enter `wanderweg.ca` and click **Save**. GitHub adds a `CNAME` file to the repository for you.
2. In `_config.yml`, change `url:` to `"https://wanderweg.ca"` and `hide_from_search:` to `false`, so Google can list the site.
3. Wherever your domain's DNS is managed (Wix, if you bought the domain through Wix), replace the website records with these:

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
4. DNS changes can take up to a day. When GitHub shows the domain as working, tick **Enforce HTTPS**.

Old Wix links like `/puppies`, `/photos` and `/blog` automatically forward to the right place on the new home page, and `/questionnaire` keeps the same address.

#### Launch checklist
- [ ] Questionnaire tested on the live site, and the email arrived
- [ ] Custom domain saved in **Settings → Pages**
- [ ] `url` and `hide_from_search` updated in `_config.yml`
- [ ] DNS records changed (MX and TXT left alone)
- [ ] **Enforce HTTPS** ticked
- [ ] Checked the site on a phone

---

## Preview on your own computer (optional)

You only need this to see changes before publishing. Install Ruby and Bundler, then in this folder run:

```
bundle install
bundle exec jekyll serve
```

Then open http://localhost:4000.

More detail for developers is in [DEVELOPING.md](DEVELOPING.md).
