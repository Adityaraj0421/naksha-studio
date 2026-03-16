# /email-template — Lumina Welcome Email

**Input:** `welcome for Lumina — new user onboarding, activate account`
**ESP:** Generic (uses `{{{VARIABLE}}}` syntax)

---

## Copy Brief

**Subject line:** Your Lumina account is ready — start in 5 minutes
**Preview text:** Connect your first data source and see your dashboard come to life.

**Email goal:** Activate new users — get them to connect a data source within 24 hours of signup.

| Element | Content |
|---------|---------|
| Headline | Welcome to Lumina, {{{first_name}}} |
| Body | Your analytics workspace is ready. Connect your first data source and you'll have a live dashboard in under 5 minutes. |
| Primary CTA | Connect Data Source |
| Secondary CTA | Explore Demo Dashboard |

---

## HTML Template

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to Lumina</title>
</head>
<body style="margin:0;padding:0;background-color:#f5f5f5;font-family:Inter,Arial,sans-serif;">

  <!-- Wrapper table — required for Outlook -->
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f5f5f5;">
    <tr>
      <td align="center" style="padding:40px 16px;">

        <!-- Email container -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;">

          <!-- Header -->
          <tr>
            <td style="background-color:#1E3A5F;padding:32px 40px;">
              <img src="https://lumina.app/logo-white.png" alt="Lumina" width="120" height="32" style="display:block;">
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 16px;font-size:24px;font-weight:700;color:#1E3A5F;line-height:1.3;">
                Welcome to Lumina, {{{first_name}}}
              </h1>
              <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#4B5563;">
                Your analytics workspace is ready. Connect your first data source and you'll have a live dashboard in under 5 minutes.
              </p>

              <!-- Bulletproof button -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                <tr>
                  <td style="background-color:#3B82F6;border-radius:6px;">
                    <a href="{{{connect_url}}}" style="display:inline-block;padding:14px 28px;font-size:15px;font-weight:600;color:#ffffff;text-decoration:none;line-height:1;">
                      Connect Data Source
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;">
                <a href="{{{demo_url}}}" style="font-size:14px;color:#3B82F6;text-decoration:underline;">
                  Or explore the demo dashboard first →
                </a>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px;border-top:1px solid #E5E7EB;">
              <p style="margin:0;font-size:12px;color:#9CA3AF;line-height:1.5;">
                You received this because you signed up for Lumina.<br>
                <a href="{{{unsubscribe_url}}}" style="color:#9CA3AF;">Unsubscribe</a> ·
                <a href="{{{privacy_url}}}" style="color:#9CA3AF;">Privacy Policy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>
```

---

## Template Variables

| Variable | Description |
|----------|-------------|
| `{{{first_name}}}` | Recipient's first name |
| `{{{connect_url}}}` | Link to data source connection page |
| `{{{demo_url}}}` | Link to demo dashboard |
| `{{{unsubscribe_url}}}` | One-click unsubscribe link (CAN-SPAM required) |
| `{{{privacy_url}}}` | Privacy policy link |

---

## What's Next

- `/email-campaign onboarding for Lumina` — build a full 5-email onboarding sequence
- `/design-review` — audit the template for accessibility and dark mode issues
