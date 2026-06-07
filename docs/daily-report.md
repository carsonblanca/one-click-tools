# Daily Report Email Notifications

OneClick Tools generates a daily health report at `reports/daily/YYYY-MM-DD.md`.
The GitHub Actions workflow runs every day at 9:00 Beijing time and can also be
started manually from the Actions tab.

## Enable Email Delivery

To send the report by email, add these GitHub Secrets:

- `REPORT_EMAIL_TO`
- `REPORT_EMAIL_FROM`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

The report script uses Python standard library email support only. If any SMTP
setting is missing, the Markdown report is still generated and the email step is
skipped without failing the workflow.

Keep SMTP passwords in GitHub Secrets. Do not commit SMTP passwords, app
passwords, or provider tokens to the repository.
