# Connecting the puppy questionnaire

The questionnaire on the website sends each response to a small Google Apps Script. The script does three things:

1. It emails you the full response. Press **Reply** to answer the applicant directly.
2. It emails the applicant a thank-you message with a copy of their answers.
3. It saves every response as a row in a Google Sheet, as a backup.

This takes about 15 minutes, once. Use the Google account whose Gmail should send the emails.

## 1. Create the spreadsheet and script

1. Go to [sheets.new](https://sheets.new) to create a new Google Sheet. Name it **Wanderweg puppy questionnaires**.
2. In the menu, choose **Extensions → Apps Script**. A code editor opens in a new tab.
3. Delete everything in the editor, then paste in the whole contents of `Code.gs` from this folder.
4. At the top of the code, check the `CONFIG` settings:
   - `NOTIFY_EMAIL` is where new questionnaires are sent (`hello@wanderweg.ca`).
   - `REPLY_TO` is where applicants' replies to the thank-you email go.
   - `FROM_ALIAS` is optional. See "Sending from hello@wanderweg.ca" below.
5. Click the **Save** icon. Rename the project **Wanderweg questionnaire** if you like.

## 2. Test it

1. In the toolbar's function drop-down, choose **testSubmission**, then click **Run**.
2. Google asks for permission the first time. Click **Review permissions**, choose your account, then click **Advanced → Go to Wanderweg questionnaire (unsafe) → Allow**. Google shows this warning for any script you write yourself.
3. Check your inbox for two emails: the notification and the thank-you. Check the spreadsheet for a new **Responses** tab with one test row. You can delete that row.

## 3. Publish it as a web app

1. Click **Deploy → New deployment**.
2. Click the gear icon next to "Select type" and choose **Web app**.
3. Set:
   - **Description:** Questionnaire
   - **Execute as:** Me
   - **Who has access:** Anyone

   "Anyone" is needed so website visitors can submit. They can't see your sheet or your email.
4. Click **Deploy**, then copy the **Web app URL**. It looks like `https://script.google.com/macros/s/AKfy…/exec`.

## 4. Connect the website

1. On GitHub, open `_config.yml` and click the pencil icon to edit it.
2. Paste the URL between the quotes:
   ```yaml
   questionnaire_endpoint: "https://script.google.com/macros/s/AKfy…/exec"
   ```
3. Click **Commit changes**. The site rebuilds in a minute or two.
4. Fill out the questionnaire on the live site with your own details to check the whole flow.

## Changing the script later

If you edit `Code.gs` (for example, the thank-you wording), the website keeps using the old version until you publish the change:

**Deploy → Manage deployments → pencil icon → Version: New version → Deploy.**

This keeps the same URL, so you don't need to touch `_config.yml` again. Don't use "New deployment" for updates, because that creates a new URL.

You **don't** need to touch the script when you add, remove or reword questions. That is all done in `_data/questionnaire.yml` on the website.

## Sending from hello@wanderweg.ca

By default the emails come from the Gmail address that owns the script, with the name "Wanderweg Leonbergers". Replies still go to `hello@wanderweg.ca`.

To have them come *from* `hello@wanderweg.ca`:

1. In Gmail, go to **Settings → See all settings → Accounts → Send mail as → Add another email address** and verify `hello@wanderweg.ca`.
2. Set `FROM_ALIAS: 'hello@wanderweg.ca'` in the script.
3. Publish a new version, as described above.

## Good to know

- **Daily limit:** a free Gmail account can send about 100 emails a day through scripts. Each questionnaire uses 2, so roughly 50 questionnaires a day.
- **Spam protection:** the form has a hidden field that bots fill in, and the script ignores anything submitted within a few seconds of the page opening. It also ignores a second submission from the same email address within a minute.
- **If something fails:** in the Apps Script editor, open **Executions** in the left sidebar to see each submission and any error message.
