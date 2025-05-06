# nylas-notebook-v1

A very simple stateless app to demonstrate our Notetaker API. Uses Nylas Hosted Auth, Nylas Calendar API, and the Nylas Notetaker API.

![CleanShot 2025-05-06 at 10 03 30@2x](https://github.com/user-attachments/assets/69d7d42a-7e9e-4ca4-ab60-1741af2dca0c)


# Why does this exist?

We have a new API that we need to test, and our team should interact with that API through a simple UI. We want all members of Nylas using this tool to test, so it has to be really easy.

# Limitations

There's no queuing, so the only way to get Notetaker to join is by being logged into this application & either pasting the meeting URL, or clicking 'Join meeting' on the UI (which opens the meeting in a new tab & triggers the POST /notetaker endpoint).

# Looking under the hood

You can either look at the source code, or... click the Console button on the top right of the screen. That brings up an expandable console that shows you to API calls you make with each click. I did this partly to make debugging easier, and so that the Sales Engineers can show off the content of the requests & responses if they do a demo of Notetaker's API.

# How does I use it?

- A user should authenticate their @nylas.com calendar
-- This uses Nylas Hosted Auth, completes the token exchange to get a grantid, and then saves that grantid locally. That grantid is used for all requests.

- You then see the list of events for today on the left hand side.
-- Clicking 'Join' here will open that meeting in a new tab and send the POST /notetaker call. It takes about 30 seconds for Notetaker to join.
-- We save that notetakerid in the response for retrieving recordings later.

- In order for Notetaker to leave this call (based on what we had built in Dec '24), you need to either manually kick the Notetaker from our UI, or close the tab.
-- Closing the tab automatically triggers the DELETE call if we've sent a Notetaker.

- "Show Previous Recordings" retains the list of notetakerid's you've received, and then uses the GET /notetaker/media endpoint to retrieve the recording URL.
-- The recording URL is active for 72 hours and then expires.

- You can manually invite Notetaker by providing a meeting link & clicking 'Send Notetaker to Meeting'
-- This is because waiting for events is annoying & sometimes you just need to show off the Notetaker!
-- Provide either the URL for the meeting, or the entire 'Meeting Info' from the UI of Google Meets. The URL will get parsed from that anyway.

- You can rename Notetaker by changing the "Notetaker Name" field. It defaults to "Nylas Notetaker" if you don't change the name. We like that name.
