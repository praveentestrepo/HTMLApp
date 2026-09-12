# Production HTTPS guide for IIS

This guide adds trusted HTTPS to the HTMLApp static site hosted on a Windows
VM in Azure. It assumes IIS is already installed and the application is
available through the `HTMLApp` virtual directory:

```text
/HTMLApp -> C:\HTMLApp
```

The production URL should use a domain name:

```text
https://demo.example.com/HTMLApp/
```

Do not use an Azure public IP as the long-term HTTPS hostname. A trusted
certificate should be issued for a domain name.

## Production checklist

Before exposing the site publicly, confirm that you have:

- An Azure Windows VM with IIS installed.
- A stable Azure public IP address.
- A domain name that you control.
- Permission to update the domain's DNS records.
- The application deployed under `C:\HTMLApp`.
- An administrator account stored securely.
- A backup or source-controlled copy of the application.

## 1. Use a static public IP

The DNS record must continue pointing to the VM after a restart. In Azure
Portal:

1. Open the VM.
2. Select **Networking**.
3. Open the attached **Public IP** resource.
4. Set **Assignment** to `Static`.
5. Save the change.

Record the public IP address. Do not put it in source files or commit it to
the repository.

## 2. Point a domain to the VM

At your DNS provider, create an `A` record:

```text
Type: A
Name: demo
Value: YOUR_STATIC_PUBLIC_IP
TTL: 300 or provider default
```

This creates:

```text
demo.example.com -> YOUR_STATIC_PUBLIC_IP
```

Wait for DNS propagation, then verify from the VM or another computer:

```powershell
Resolve-DnsName demo.example.com
```

The result should contain the VM's public IP. Do not request a certificate
until the domain resolves to the correct VM.

## 3. Allow HTTP and HTTPS in Azure

The Azure network security group must allow both ports during certificate
setup:

- Port `80` for HTTP and common certificate validation.
- Port `443` for HTTPS.

In Azure Portal:

1. Open the VM.
2. Select **Networking**.
3. Open **Inbound port rules**.
4. Add an inbound rule for `HTTP` on port `80`.
5. Add an inbound rule for `HTTPS` on port `443`.

Use a specific priority for each rule, such as `300` for HTTP and `310` for
HTTPS. Keep the rules named clearly, for example:

```text
Allow-HTTP
Allow-HTTPS
```

Keep RDP port `3389` restricted to the administrator's trusted public IP
address. Do not leave RDP open to all internet addresses in production.

## 4. Allow HTTP and HTTPS in Windows Firewall

Open PowerShell as Administrator inside the VM:

```powershell
New-NetFirewallRule `
  -DisplayName "Allow IIS HTTP" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 80 `
  -Action Allow

New-NetFirewallRule `
  -DisplayName "Allow IIS HTTPS" `
  -Direction Inbound `
  -Protocol TCP `
  -LocalPort 443 `
  -Action Allow
```

Check the IIS service and listening ports:

```powershell
Get-Service -Name W3SVC
Get-NetTCPConnection -LocalPort 80,443 -ErrorAction SilentlyContinue
```

Port `443` may not appear until the IIS HTTPS binding is created.

## 5. Install a trusted certificate

For a public production site, use a certificate issued by a trusted
certificate authority. A practical free option is Let's Encrypt with the
Windows ACME client **win-acme**.

### Using win-acme

1. Download win-acme from its official project release page:
   [https://www.win-acme.com/](https://www.win-acme.com/)
2. Download it only from the official site or its linked official release.
3. Extract it to a restricted folder, for example:
   ```text
   C:\Tools\win-acme
   ```
4. Open PowerShell as Administrator.
5. Change to that folder and run the win-acme executable.
6. Choose the option to create a new certificate for an IIS site.
7. Select the IIS site and hostname:
   ```text
   demo.example.com
   ```
8. Allow the client to create the IIS HTTPS binding and scheduled renewal
   task when prompted.

The exact menu labels can change between win-acme releases. Follow the
current prompts shown by the installed version.

The certificate request will fail if:

- DNS does not resolve to this VM.
- Port `80` is blocked by Azure or Windows Firewall.
- Another service is using the requested hostname.
- The domain has restrictive validation or proxy settings.

### Alternative certificate providers

You can also use a certificate purchased from a commercial certificate
authority. Import the certificate and its private key into the Windows
certificate store, then select it when creating the IIS binding.

Avoid self-signed certificates for public production traffic. Browsers will
show trust warnings, and users cannot safely verify the server identity.

## 6. Verify the IIS HTTPS binding

If the certificate client did not create the binding automatically:

1. Open **Internet Information Services (IIS) Manager**.
2. Expand the server and **Sites**.
3. Select **Default Web Site**.
4. Select **Bindings...**.
5. Select **Add**.
6. Enter:
   ```text
   Type: https
   IP address: All Unassigned
   Port: 443
   Host name: demo.example.com
   ```
7. Select the trusted certificate.
8. Select **OK**.

The existing virtual directory does not need to change:

```text
/HTMLApp -> C:\HTMLApp
```

The protocol and hostname are now:

```text
https://demo.example.com/HTMLApp/
```

If multiple HTTPS sites share this VM and IP address, enable **Require Server
Name Indication** and use a unique hostname for each site.

## 7. Test HTTPS before redirecting HTTP

Open:

```text
https://demo.example.com/HTMLApp/
```

Test the individual pages:

```text
https://demo.example.com/HTMLApp/tools/salary-filter.html
https://demo.example.com/HTMLApp/tools/job-opening-builder.html
https://demo.example.com/HTMLApp/guides/github-beginners-guide.html
```

Confirm that:

- The browser shows a valid certificate.
- The hostname in the address bar matches the certificate.
- No certificate warning appears.
- CSS and JavaScript load.
- `pages.json` loads and the dashboard cards appear.
- The CSV upload and download features work.

You can inspect the certificate from the browser's padlock icon. For an
additional external check, use a reputable TLS testing service only after the
site is intentionally public.

## 8. Redirect HTTP to HTTPS

Keep HTTP available for certificate renewal and redirect normal visitors to
HTTPS.

The usual IIS approach is:

1. Install the official **IIS URL Rewrite** module.
2. Create a rewrite rule on the IIS site that:
   - Matches all HTTP requests.
   - Excludes ACME challenge paths if your certificate client requires them.
   - Redirects to the same host and path using HTTPS.
   - Uses a permanent redirect only after testing.

Conceptually:

```text
http://demo.example.com/HTMLApp/
-> https://demo.example.com/HTMLApp/
```

Do not enable a permanent redirect until the HTTPS binding works. A bad
redirect can make the site inaccessible and harder to repair.

## 9. Confirm certificate renewal

Let's Encrypt certificates are short-lived. Renewal must be automated.

After win-acme installation:

1. Open **Task Scheduler**.
2. Find the win-acme renewal task.
3. Confirm it is enabled.
4. Confirm its account can update IIS.
5. Review the win-acme renewal log after the first scheduled run.

Before production launch, verify the renewal process using the current
win-acme documentation and perform a controlled renewal test when practical.
Do not wait for the certificate to expire before checking renewal.

## 10. Production security checks

- Use HTTPS for all public access.
- Restrict RDP `3389` to trusted administrator IP addresses.
- Use a strong unique VM administrator password and store it in a password
  manager.
- Keep Windows Server and IIS patched.
- Keep the application files under source control.
- Do not store passwords, private keys, or connection strings in the repo.
- Do not expose unnecessary inbound ports.
- Back up the application and certificate recovery information.
- Monitor certificate expiry, VM health, and IIS logs.
- Review the Azure VM public IP and NSG rules periodically.

This application processes files in the browser. A user's CSV is not uploaded
by the current salary filter page, but HTTPS still protects the page and
other traffic while it is being delivered.

## Troubleshooting

### DNS resolves to the wrong address

Check:

```powershell
Resolve-DnsName demo.example.com
```

Correct the DNS `A` record and wait for propagation.

### Certificate validation fails

Confirm that DNS points to this VM and that port `80` is allowed in both the
Azure NSG and Windows Firewall. Also confirm that the IIS site responds for
the requested hostname.

### HTTPS shows the wrong site or certificate

Review IIS **Bindings...**. Confirm the hostname, port `443`, certificate, and
SNI setting if multiple HTTPS sites exist.

### HTTP works but HTTPS does not

Check:

```powershell
Get-Service -Name W3SVC
Get-NetTCPConnection -LocalPort 443 -ErrorAction SilentlyContinue
```

Then verify the Azure NSG, Windows Firewall, IIS binding, and certificate.

### The browser reports mixed content

Ensure any future external resources use `https://` URLs. Relative local
paths such as `assets/styles.css` and `pages.json` automatically use the
current HTTPS protocol.

## Emergency rollback

If HTTPS configuration causes a problem:

1. Keep the RDP management path restricted and available.
2. Remove only the incorrect IIS HTTPS binding.
3. Correct the certificate, DNS, or firewall issue.
4. Recreate and test the binding.

Do not delete the application files or the entire VM as a first response.
